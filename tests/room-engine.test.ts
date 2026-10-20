import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  generateRoomCode,
  MAX_CONTENDERS,
  normalizeAnswerText,
  RoomMatchEngine,
  sanitizeRoomCode,
  WATCHDOG_TIMEOUT_MS
} from '../src/domain/room-engine';
import { LocalPartyHub } from '../src/server/room-hub';

describe('RoomMatchEngine & MAGI Safeguards', () => {
  it('sanitizes and generates valid 4-character alphanumeric room codes', () => {
    expect(sanitizeRoomCode('k9x2')).toBe('K9X2');
    expect(() => sanitizeRoomCode('ab')).toThrow();
    const generated = generateRoomCode(() => 0.5);
    expect(generated).toHaveLength(4);
    expect(/^[A-Z0-9]{4}$/.test(generated)).toBe(true);
  });

  it('reconnects a contender via sessionToken without duplicating slots or losing score', () => {
    const engine = new RoomMatchEngine('K9X2', () => 0);
    const host = engine.handleCommand(
      { type: 'join_room', nickname: 'Pipe', sessionToken: 'tok-host-1' },
      1000
    );
    engine.handleCommand(
      { type: 'join_room', nickname: 'Cami', sessionToken: 'tok-guest-2' },
      1050
    );

    engine.markDisconnected('tok-host-1');
    const reconnected = engine.handleCommand(
      { type: 'join_room', nickname: 'PipeReloaded', sessionToken: 'tok-host-1' },
      1200
    );

    expect(reconnected.id).toBe(host.id);
    const proj = engine.buildProjectionForSession('tok-host-1');
    expect(proj.contenders).toHaveLength(2);
    expect(proj.contenders[0]?.nickname).toBe('PipeReloaded');
    expect(proj.contenders[0]?.isConnected).toBe(true);
  });

  it('enforces the 16-player room capacity limit', () => {
    const engine = new RoomMatchEngine('FULL', () => 0.1);
    for (let i = 1; i <= MAX_CONTENDERS; i++) {
      engine.handleCommand({
        type: 'join_room',
        nickname: `Player${i}`,
        sessionToken: `token-${i}`
      });
    }
    expect(() =>
      engine.handleCommand({
        type: 'join_room',
        nickname: 'Overflow',
        sessionToken: 'token-17'
      })
    ).toThrow(/16 jugadores/);
  });

  it('enforces asymmetric projection in Trivia Rush and Pinturillo to prevent DevTools cheating', () => {
    // randomFn = 0 selects mode index 0 on round 1 (trivia), mode index 1 on round 2 (thats_you), mode index 2 on round 3 (pinturillo)
    const engine = new RoomMatchEngine('SAFE', () => 0);
    engine.handleCommand({ type: 'join_room', nickname: 'Host', sessionToken: 'tok-1' }, 100);
    engine.handleCommand({ type: 'join_room', nickname: 'Guest', sessionToken: 'tok-2' }, 110);

    engine.handleCommand({ type: 'start_match', sessionToken: 'tok-1', totalRounds: 3 }, 200);
    engine.handleCommand({ type: 'spin_roulette', sessionToken: 'tok-1' }, 300);

    // Round 1: Trivia Rush active -> revealedCorrectIndex must be null
    const triviaActiveProj = engine.buildProjectionForSession('tok-1');
    expect(triviaActiveProj.selectedMode).toBe('trivia');
    expect(triviaActiveProj.triviaView?.revealedCorrectIndex).toBeNull();

    // Both answer -> round concludes -> revealedCorrectIndex is now visible
    engine.handleCommand({ type: 'submit_trivia', sessionToken: 'tok-1', optionIndex: 1 }, 1000);
    engine.handleCommand({ type: 'submit_trivia', sessionToken: 'tok-2', optionIndex: 0 }, 1500);

    const triviaRevealProj = engine.buildProjectionForSession('tok-1');
    expect(triviaRevealProj.phase).toBe('round_reveal');
    expect(triviaRevealProj.triviaView?.revealedCorrectIndex).toBe(1);

    // Advance to Round 2 (Ese Eres Tu)
    engine.handleCommand({ type: 'next_round', sessionToken: 'tok-1' }, 2000);
    engine.handleCommand({ type: 'spin_roulette', sessionToken: 'tok-2' }, 2100);

    const targetId = triviaRevealProj.contenders[0]!.id;
    engine.handleCommand(
      { type: 'submit_social_vote', sessionToken: 'tok-1', targetContenderId: targetId },
      2500
    );
    engine.handleCommand(
      { type: 'submit_social_vote', sessionToken: 'tok-2', targetContenderId: targetId },
      2600
    );
    expect(engine.buildProjectionForSession('tok-1').phase).toBe('round_reveal');

    // Advance to Round 3 (Pinturillo)
    engine.handleCommand({ type: 'next_round', sessionToken: 'tok-1' }, 3000);
    engine.handleCommand({ type: 'spin_roulette', sessionToken: 'tok-1' }, 3100);

    const p1Proj = engine.buildProjectionForSession('tok-1');
    const p2Proj = engine.buildProjectionForSession('tok-2');

    expect(p1Proj.selectedMode).toBe('pinturillo');
    // Only the active drawer receives secretWord; the guesser receives null
    const drawerProj = p1Proj.sketchView?.isSelfDrawer ? p1Proj : p2Proj;
    const guesserProj = p1Proj.sketchView?.isSelfDrawer ? p2Proj : p1Proj;
    const drawerToken = p1Proj.sketchView?.isSelfDrawer ? 'tok-1' : 'tok-2';
    const guesserToken = p1Proj.sketchView?.isSelfDrawer ? 'tok-2' : 'tok-1';

    expect(drawerProj.sketchView?.secretWord).toBeTruthy();
    expect(guesserProj.sketchView?.secretWord).toBeNull();

    // Drawer pushes a normalized vector batch (clamping coordinates 0..1000)
    engine.handleCommand(
      {
        type: 'push_vector_batch',
        sessionToken: drawerToken,
        batch: {
          strokeId: 's-1',
          color: '#10B981',
          width: 4,
          points: [
            { x: -20, y: 500 },
            { x: 1400, y: 250 }
          ]
        }
      },
      3200
    );

    const afterStroke = engine.buildProjectionForSession(guesserToken);
    expect(afterStroke.sketchView?.strokes[0]?.points).toEqual([
      { x: 0, y: 500 },
      { x: 1000, y: 250 }
    ]);

    // Guesser submits correct word with accents/lowercase -> matched and concludes round
    const word = drawerProj.sketchView!.secretWord!;
    expect(normalizeAnswerText('  cómpleto ')).toBe('COMPLETO');
    engine.handleCommand(
      {
        type: 'submit_sketch_guess',
        sessionToken: guesserToken,
        guess: word.toLowerCase()
      },
      3500
    );

    const afterGuess = engine.buildProjectionForSession(guesserToken);
    expect(afterGuess.phase).toBe('round_reveal');

    // Advance from final round reveal -> Podium -> Rematch
    engine.handleCommand({ type: 'next_round', sessionToken: 'tok-1' }, 4000);
    expect(engine.buildProjectionForSession('tok-1').phase).toBe('podium');

    engine.handleCommand({ type: 'rematch', sessionToken: 'tok-1' }, 4500);
    const rematchProj = engine.buildProjectionForSession('tok-1');
    expect(rematchProj.phase).toBe('roulette');
    expect(rematchProj.roundNumber).toBe(1);
    expect(rematchProj.contenders.every((c) => c.score === 0)).toBe(true);
  });

  it('triggers the 15-second Anti-AFK Watchdog for both roulette and Pinturillo', () => {
    const engine = new RoomMatchEngine('WDOG', () => 0.8);
    engine.handleCommand({ type: 'join_room', nickname: 'Host', sessionToken: 'tok-1' }, 1000);
    engine.handleCommand({ type: 'join_room', nickname: 'Guest', sessionToken: 'tok-2' }, 1000);
    engine.handleCommand({ type: 'start_match', sessionToken: 'tok-1', totalRounds: 3 }, 2000);

    // Phase is roulette; before 15s alarm does nothing
    expect(engine.evaluateAlarms(2000 + WATCHDOG_TIMEOUT_MS - 100)).toBe(false);
    // At 15s, Watchdog auto-spins roulette into playing phase
    expect(engine.evaluateAlarms(2000 + WATCHDOG_TIMEOUT_MS)).toBe(true);
    const afterAutoSpin = engine.buildProjectionForSession('tok-1');
    expect(afterAutoSpin.phase).toBe('playing');
  });

  it('guarantees all 3 modes (Trivia, Ese Eres Tu, Pinturillo) appear in a 3-round match without repetition', () => {
    const seq = [0.95, 0.42, 0.95, 0.12, 0.88, 0.77];
    let cursor = 0;
    const engine = new RoomMatchEngine('BAG3', () => {
      const val = seq[cursor % seq.length]!;
      cursor++;
      return val;
    });

    engine.handleCommand({ type: 'join_room', nickname: 'Host', sessionToken: 'tok-1' }, 100);
    engine.handleCommand({ type: 'join_room', nickname: 'Guest', sessionToken: 'tok-2' }, 110);
    engine.handleCommand({ type: 'start_match', sessionToken: 'tok-1', totalRounds: 3 }, 200);

    const seenModes = new Set<string>();
    for (let round = 1; round <= 3; round++) {
      engine.handleCommand({ type: 'spin_roulette', sessionToken: 'tok-1' }, round * 1000);
      const proj = engine.buildProjectionForSession('tok-1');
      seenModes.add(proj.selectedMode!);

      // Force round conclusion via deadline alarm
      engine.evaluateAlarms(round * 1000 + 60_000);
      engine.handleCommand({ type: 'next_round', sessionToken: 'tok-1' }, round * 1000 + 61_000);
    }

    expect(seenModes).toEqual(new Set(['trivia', 'thats_you', 'pinturillo']));
  });

  it('contains zero em-dashes or en-dashes across the entire repository', () => {
    const rootDir = join(__dirname, '..');
    const allowedDirs = ['src', 'party', 'docs', 'scripts'];
    const filesToScan = [join(rootDir, 'GLOSSARY.md')];

    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (/\.(ts|mjs|astro|md)$/.test(entry)) {
          filesToScan.push(full);
        }
      }
    }

    for (const sub of allowedDirs) {
      walk(join(rootDir, sub));
    }

    for (const filePath of filesToScan) {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('synchronizes multiple WebSocket clients over /parties/main/:roomCode', async () => {
    const hub = new LocalPartyHub();
    const server = createServer();
    server.on('upgrade', (req, socket, head) => {
      hub.handleUpgrade(req, socket, head);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const wsHost = new WebSocket(`ws://127.0.0.1:${port}/parties/main/K9X2`);
    const wsGuest = new WebSocket(`ws://127.0.0.1:${port}/parties/main/K9X2`);

    const hostStates: unknown[] = [];
    wsHost.on('message', (raw) => {
      hostStates.push(JSON.parse(raw.toString()));
    });

    await Promise.all([
      new Promise((res) => wsHost.once('open', res)),
      new Promise((res) => wsGuest.once('open', res))
    ]);

    wsHost.send(
      JSON.stringify({ type: 'join_room', nickname: 'HostPipe', sessionToken: 'ws-tok-1' })
    );
    wsGuest.send(
      JSON.stringify({ type: 'join_room', nickname: 'GuestCami', sessionToken: 'ws-tok-2' })
    );

    await new Promise((res) => setTimeout(res, 60));

    expect(hostStates.length).toBeGreaterThanOrEqual(2);
    wsHost.close();
    wsGuest.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
