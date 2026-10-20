import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomMatchEngine, sanitizeRoomCode } from '../domain/room-engine';
import type { ClientCommand } from '../domain/room-types';

interface RoomEntry {
  engine: RoomMatchEngine;
  sockets: Map<WebSocket, string>;
}

/**
 * Hub de salas en memoria compatible con el protocolo de PartySocket (`/parties/main/:room`).
 * Permite ejecutar el servidor WebSocket en el mismo puerto HTTP durante desarrollo local y en contenedores Docker.
 */
export class LocalPartyHub {
  private readonly rooms = new Map<string, RoomEntry>();
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly alarmTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.alarmTimer = setInterval(() => {
      this.tickAlarms();
    }, 250);
    if (typeof this.alarmTimer.unref === 'function') {
      this.alarmTimer.unref();
    }
  }

  /**
   * Procesa una solicitud HTTP Upgrade si pertenece a la ruta de PartyKit (`/parties/...` o `/ws/...`).
   * @param req Solicitud HTTP entrante.
   * @param socket Socket TCP subyacente.
   * @param head Primer paquete del stream.
   * @returns true si el upgrade fue interceptado por el hub de Ni Idea.
   */
  public handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    const rawUrl = req.url ?? '';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const match =
      parsedUrl.pathname.match(/^\/parties\/[^/]+\/([a-zA-Z0-9_-]+)/) ??
      parsedUrl.pathname.match(/^\/party\/([a-zA-Z0-9_-]+)/) ??
      parsedUrl.pathname.match(/^\/ws\/([a-zA-Z0-9_-]+)/);

    if (!match) {
      return false;
    }

    let roomCode: string;
    try {
      roomCode = sanitizeRoomCode(match[1] ?? '');
    } catch {
      socket.destroy();
      return true;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.attachClientSocket(roomCode, ws);
    });
    return true;
  }

  private getOrCreateRoom(roomCode: string): RoomEntry {
    let entry = this.rooms.get(roomCode);
    if (!entry) {
      entry = {
        engine: new RoomMatchEngine(roomCode),
        sockets: new Map<WebSocket, string>()
      };
      this.rooms.set(roomCode, entry);
    }
    return entry;
  }

  private attachClientSocket(roomCode: string, ws: WebSocket): void {
    const entry = this.getOrCreateRoom(roomCode);
    entry.sockets.set(ws, '');

    ws.on('message', (data) => {
      try {
        const command = JSON.parse(data.toString()) as ClientCommand;
        if (command.sessionToken) {
          entry.sockets.set(ws, command.sessionToken);
        }
        entry.engine.handleCommand(command, Date.now());
        this.broadcastRoom(entry);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Comando invalido.';
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'room_error', message: errorMessage }));
        }
      }
    });

    ws.on('close', () => {
      const token = entry.sockets.get(ws);
      entry.sockets.delete(ws);
      if (token) {
        entry.engine.markDisconnected(token);
        this.broadcastRoom(entry);
      }
    });
  }

  private tickAlarms(): void {
    const now = Date.now();
    for (const entry of this.rooms.values()) {
      const changed = entry.engine.evaluateAlarms(now);
      if (changed) {
        this.broadcastRoom(entry);
      }
    }
  }

  private broadcastRoom(entry: RoomEntry): void {
    for (const [clientWs, token] of entry.sockets.entries()) {
      if (clientWs.readyState === WebSocket.OPEN && token) {
        const projection = entry.engine.buildProjectionForSession(token);
        clientWs.send(JSON.stringify({ type: 'room_state', state: projection }));
      }
    }
  }
}
