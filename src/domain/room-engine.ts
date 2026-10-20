import {
  SKETCH_WORDS,
  SOCIAL_PROMPTS,
  TRIVIA_BANK
} from './question-bank';
import type {
  AsymmetricProjection,
  ClientCommand,
  Contender,
  GameMode,
  GuessFeedEntry,
  RoomPhase,
  TriviaPrompt,
  VectorBatch
} from './room-types';

/**
 * Constantes de tiempo y limites de capacidad de la sala.
 */
export const MAX_CONTENDERS = 16;
export const WATCHDOG_TIMEOUT_MS = 15_000;
export const TRIVIA_DURATION_MS = 15_000;
export const SOCIAL_VOTE_DURATION_MS = 20_000;
export const SKETCH_DURATION_MS = 45_000;

const BOT_NAMES = ['BetoBot', 'CamiPixel', 'NicoTurbo', 'SofiVFD', 'Lucho2000', 'MatiRayo'];

/**
 * Normaliza un texto removiendo tildes, espacios redundantes y convirtiendo a mayusculas.
 * @param input Cadena de entrada del usuario.
 * @returns Cadena normalizada para comparacion determinista.
 */
export function normalizeAnswerText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Valida y formatea un codigo de sala a 4 caracteres alfanumericos en mayusculas.
 * @param rawCode Codigo ingresado o generado.
 * @returns Codigo de 4 caracteres validado.
 * @throws Error si el codigo no contiene 4 caracteres alfanumericos.
 */
export function sanitizeRoomCode(rawCode: string): string {
  const cleaned = rawCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  if (cleaned.length !== 4) {
    throw new Error('El codigo de sala debe tener exactamente 4 caracteres alfanumericos.');
  }
  return cleaned;
}

/**
 * Genera un codigo alfanumerico aleatorio de 4 caracteres excluyendo caracteres ambiguos (I, O, 0, 1).
 * @param randomFn Funcion generadora de numeros entre 0 y 1.
 * @returns Codigo de sala de 4 caracteres.
 */
export function generateRoomCode(randomFn: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(randomFn() * alphabet.length) % alphabet.length;
    result += alphabet[idx];
  }
  return result;
}

/**
 * Construye una mascara de pista para una palabra secreta de Pinturillo.
 * @param word Palabra secreta en mayusculas.
 * @returns Cadena con guiones bajos separados por espacios.
 */
export function buildWordHint(word: string): string {
  return word
    .split('')
    .map((char, index) => (index === 0 ? char : '_'))
    .join(' ');
}

/**
 * Motor de dominio determinista para una sala de Ni Idea.
 * Encapsula las reglas de Trivia Rush, Ese Eres Tu y Pinturillo,
 * el Watchdog Anti-AFK de 15 segundos y la proyeccion asimetrica anti-trampas.
 */
export class RoomMatchEngine {
  public readonly roomCode: string;
  private phase: RoomPhase = 'lobby';
  private roundNumber = 0;
  private totalRounds = 3;
  private contenders: Contender[] = [];
  private rollerRotationIndex = 0;
  private activeRollerId: string | null = null;
  private selectedMode: GameMode | null = null;
  private modeBag: GameMode[] = [];
  private roundStartedAt: number | null = null;
  private roundDeadlineAt: number | null = null;
  private watchdogDeadlineAt: number | null = null;
  private statusBanner = 'Esperando jugadores en la sala.';

  // Estado especifico de Trivia Rush
  private currentTrivia: TriviaPrompt | null = null;
  private triviaSelections = new Map<string, { optionIndex: number; answeredAt: number }>();
  private triviaCursor = 0;

  // Estado especifico de Ese Eres Tu
  private currentSocialPrompt: string | null = null;
  private socialVotes = new Map<string, string>();
  private socialVoteBreakdown: Record<string, number> | null = null;
  private socialWinnerIds: string[] | null = null;
  private socialCursor = 0;

  // Estado especifico de Pinturillo
  private currentDrawerId: string | null = null;
  private currentSecretWord: string | null = null;
  private sketchStrokes: VectorBatch[] = [];
  private sketchGuessedIds: string[] = [];
  private sketchFeed: GuessFeedEntry[] = [];
  private hasDrawerSubmittedStroke = false;
  private sketchCursor = 0;

  private readonly randomFn: () => number;

  /**
   * Crea una nueva instancia del motor para una sala especifica.
   * @param roomCode Codigo de 4 caracteres de la sala.
   * @param randomFn Funcion opcional de aleatoriedad para pruebas deterministas.
   */
  constructor(roomCode: string, randomFn: () => number = Math.random) {
    this.roomCode = sanitizeRoomCode(roomCode);
    this.randomFn = randomFn;
  }

  /**
   * Obtiene el instante de la proxima alarma que el Durable Object debe programar.
   * @returns Timestamp en milisegundos o null si no hay alarma activa.
   */
  public getNextAlarmTimestamp(): number | null {
    const candidates = [this.watchdogDeadlineAt, this.roundDeadlineAt].filter(
      (value): value is number => typeof value === 'number'
    );
    if (candidates.length === 0) return null;
    return Math.min(...candidates);
  }

  /**
   * Procesa un comando emitido por un contendiente y actualiza las invariantes de la sala.
   * @param command Comando tipado del cliente.
   * @param now Timestamp actual en milisegundos.
   * @returns El contendiente asociado al comando procesado.
   * @throws Error si la accion viola las reglas de la fase o de autorizacion.
   */
  public handleCommand(command: ClientCommand, now: number = Date.now()): Contender {
    switch (command.type) {
      case 'join_room':
        return this.joinOrReconnect(command.nickname, command.sessionToken);
      case 'add_bot': {
        const actor = this.requireContenderByToken(command.sessionToken);
        return this.addPracticeBot(actor);
      }
      case 'start_match': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.startMatch(actor, command.totalRounds ?? 3, now);
        return actor;
      }
      case 'spin_roulette': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.spinRoulette(actor.id, now, false);
        return actor;
      }
      case 'submit_trivia': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.submitTriviaAnswer(actor, command.optionIndex, now);
        return actor;
      }
      case 'submit_social_vote': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.submitSocialVote(actor, command.targetContenderId, now);
        return actor;
      }
      case 'push_vector_batch': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.pushVectorBatch(actor, command.batch, now);
        return actor;
      }
      case 'clear_canvas': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.clearSketchCanvas(actor);
        return actor;
      }
      case 'submit_sketch_guess': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.submitSketchGuess(actor, command.guess, now);
        return actor;
      }
      case 'next_round': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.advanceFromReveal(now);
        return actor;
      }
      case 'rematch': {
        const actor = this.requireContenderByToken(command.sessionToken);
        this.triggerRematch(actor, now);
        return actor;
      }
    }
  }

  /**
   * Registra la desconexion temporal de un socket sin eliminar su asiento ni su puntaje.
   * Si todos los humanos se desconectan o el jugador activo queda inactivo, el Watchdog mantiene el flujo.
   * @param sessionToken Token de sesion del socket cerrado.
   */
  public markDisconnected(sessionToken: string): void {
    const existing = this.contenders.find((c) => c.sessionToken === sessionToken);
    if (!existing) return;
    existing.isConnected = false;

    if (existing.isHost) {
      const nextConnectedHuman = this.contenders.find((c) => !c.isBot && c.isConnected);
      if (nextConnectedHuman) {
        existing.isHost = false;
        nextConnectedHuman.isHost = true;
      }
    }
  }

  /**
   * Ejecuta la verificacion del Watchdog Anti-AFK y de los cierres de ronda por tiempo.
   * Invocado por `storage.setAlarm()` en PartyKit o el bucle de servidor local.
   * @param now Timestamp actual en milisegundos.
   * @returns true si el estado de la sala cambio producto de la alarma.
   */
  public evaluateAlarms(now: number = Date.now()): boolean {
    if (this.phase === 'roulette' && this.watchdogDeadlineAt && now >= this.watchdogDeadlineAt) {
      const rollerId = this.activeRollerId ?? this.contenders[0]?.id;
      if (rollerId) {
        this.spinRoulette(rollerId, now, true);
        return true;
      }
    }

    if (this.phase === 'playing') {
      if (
        this.selectedMode === 'pinturillo' &&
        !this.hasDrawerSubmittedStroke &&
        this.watchdogDeadlineAt &&
        now >= this.watchdogDeadlineAt
      ) {
        this.statusBanner = 'Watchdog Anti-AFK: El dibujante no trazo en 15s. Ronda revelada.';
        this.concludeActiveRound(now);
        return true;
      }

      if (this.roundDeadlineAt && now >= this.roundDeadlineAt) {
        this.concludeActiveRound(now);
        return true;
      }
    }

    return false;
  }

  /**
   * Genera la proyeccion asimetrica segura para un contendiente especifico.
   * Oculta indices de respuestas correctas y palabras secretas ajenas.
   * @param sessionToken Token de sesion del contendiente receptor.
   * @returns Vista asimetrica lista para serializar por WebSocket.
   */
  public buildProjectionForSession(sessionToken: string): AsymmetricProjection {
    const self = this.contenders.find((c) => c.sessionToken === sessionToken) ?? this.contenders[0];
    const selfId = self?.id ?? '';
    const isRevealOrPodium = this.phase === 'round_reveal' || this.phase === 'podium';

    const publicContenders = this.contenders.map(({ sessionToken: _hidden, ...rest }) => rest);

    let triviaView: AsymmetricProjection['triviaView'] = null;
    if (this.selectedMode === 'trivia' && this.currentTrivia) {
      const myAnswer = this.triviaSelections.get(selfId);
      triviaView = {
        category: this.currentTrivia.category,
        question: this.currentTrivia.question,
        options: this.currentTrivia.options,
        selectedOptionIndex: myAnswer ? myAnswer.optionIndex : null,
        revealedCorrectIndex: isRevealOrPodium ? this.currentTrivia.correctOptionIndex : null
      };
    }

    let socialVoteView: AsymmetricProjection['socialVoteView'] = null;
    if (this.selectedMode === 'thats_you' && this.currentSocialPrompt) {
      socialVoteView = {
        prompt: this.currentSocialPrompt,
        votedTargetId: this.socialVotes.get(selfId) ?? null,
        revealedWinnerIds: isRevealOrPodium ? this.socialWinnerIds : null,
        voteBreakdown: isRevealOrPodium ? this.socialVoteBreakdown : null
      };
    }

    let sketchView: AsymmetricProjection['sketchView'] = null;
    if (this.selectedMode === 'pinturillo' && this.currentDrawerId && this.currentSecretWord) {
      const drawer = this.contenders.find((c) => c.id === this.currentDrawerId);
      const isSelfDrawer = selfId === this.currentDrawerId;
      sketchView = {
        drawerId: this.currentDrawerId,
        drawerNickname: drawer?.nickname ?? 'Jugador',
        isSelfDrawer,
        secretWord: isSelfDrawer || isRevealOrPodium ? this.currentSecretWord : null,
        wordHint: buildWordHint(this.currentSecretWord),
        strokes: this.sketchStrokes,
        guessedContenderIds: [...this.sketchGuessedIds],
        feed: this.sketchFeed.slice(-8),
        revealedWord: isRevealOrPodium ? this.currentSecretWord : null
      };
    }

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      selfContenderId: selfId,
      contenders: publicContenders,
      activeRollerId: this.activeRollerId,
      selectedMode: this.selectedMode,
      watchdogDeadlineAt: this.watchdogDeadlineAt,
      roundDeadlineAt: this.roundDeadlineAt,
      statusBanner: this.statusBanner,
      triviaView,
      socialVoteView,
      sketchView
    };
  }

  /**
   * Obtiene la lista de tokens de sesion humanos registrados en la sala.
   * @returns Arreglo de tokens de sesion.
   */
  public getSessionTokens(): string[] {
    return this.contenders.filter((c) => !c.isBot).map((c) => c.sessionToken);
  }

  private joinOrReconnect(rawNickname: string, rawToken: string): Contender {
    const token = rawToken.trim();
    if (!token) {
      throw new Error('Se requiere un sessionToken valido para entrar a la sala.');
    }

    const cleanName = rawNickname.trim().slice(0, 18) || 'Invitado';
    const existing = this.contenders.find((c) => c.sessionToken === token);
    if (existing) {
      existing.isConnected = true;
      if (rawNickname.trim()) {
        existing.nickname = cleanName;
      }
      this.statusBanner = `${existing.nickname} reconectado a la mesa.`;
      return existing;
    }

    if (this.contenders.length >= MAX_CONTENDERS) {
      throw new Error('La sala ha alcanzado el maximo de 16 jugadores.');
    }

    const isFirstContender = this.contenders.length === 0;
    const contender: Contender = {
      id: `p-${this.contenders.length + 1}-${Math.floor(this.randomFn() * 9000 + 1000)}`,
      sessionToken: token,
      nickname: cleanName,
      isHost: isFirstContender,
      isConnected: true,
      isBot: false,
      score: 0,
      streak: 0,
      hasAnswered: false,
      lastRoundDelta: 0
    };

    this.contenders.push(contender);
    this.statusBanner = `${contender.nickname} entro a la sala (${this.contenders.length}/${MAX_CONTENDERS}).`;
    return contender;
  }

  private addPracticeBot(actor: Contender): Contender {
    if (!actor.isHost) {
      throw new Error('Solo el anfitrion puede agregar contendientes de practica.');
    }
    if (this.contenders.length >= MAX_CONTENDERS) {
      throw new Error('La sala ya tiene 16 jugadores.');
    }
    const existingBotCount = this.contenders.filter((c) => c.isBot).length;
    const botName = BOT_NAMES[existingBotCount % BOT_NAMES.length] ?? `Bot${existingBotCount + 1}`;
    const bot: Contender = {
      id: `bot-${existingBotCount + 1}`,
      sessionToken: `bot-token-${existingBotCount + 1}`,
      nickname: botName,
      isHost: false,
      isConnected: true,
      isBot: true,
      score: 0,
      streak: 0,
      hasAnswered: false,
      lastRoundDelta: 0
    };
    this.contenders.push(bot);
    this.statusBanner = `${bot.nickname} se sumo a la mesa para probar la partida.`;
    return bot;
  }

  private startMatch(actor: Contender, requestedRounds: number, now: number): void {
    if (!actor.isHost) {
      throw new Error('Solo el anfitrion puede iniciar la partida.');
    }
    if (this.contenders.length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores en la sala para iniciar.');
    }
    this.totalRounds = Math.max(1, Math.min(9, requestedRounds));
    this.roundNumber = 1;
    this.rollerRotationIndex = 0;
    this.modeBag = [];
    for (const c of this.contenders) {
      c.score = 0;
      c.streak = 0;
      c.hasAnswered = false;
      c.lastRoundDelta = 0;
    }
    this.enterRoulettePhase(now);
  }

  private enterRoulettePhase(now: number): void {
    this.phase = 'roulette';
    this.selectedMode = null;
    this.roundStartedAt = null;
    this.roundDeadlineAt = null;

    const humanContenders = this.contenders.filter((c) => !c.isBot);
    const pool = humanContenders.length > 0 ? humanContenders : this.contenders;
    const roller = pool[this.rollerRotationIndex % pool.length]!;
    this.rollerRotationIndex++;
    this.activeRollerId = roller.id;
    this.watchdogDeadlineAt = now + WATCHDOG_TIMEOUT_MS;

    for (const c of this.contenders) {
      c.hasAnswered = false;
      c.lastRoundDelta = 0;
    }

    this.statusBanner = `Ronda ${this.roundNumber}/${this.totalRounds}: Turno de ${roller.nickname} para girar la ruleta.`;
  }

  private spinRoulette(actorId: string, now: number, forcedByWatchdog: boolean): void {
    if (this.phase !== 'roulette') {
      throw new Error('La sala no se encuentra en fase de ruleta.');
    }
    if (!forcedByWatchdog && this.activeRollerId && actorId !== this.activeRollerId) {
      const actor = this.contenders.find((c) => c.id === actorId);
      if (!actor?.isHost) {
        throw new Error('Solo el jugador de turno o el anfitrion puede girar la ruleta.');
      }
    }

    if (this.modeBag.length === 0) {
      this.modeBag = ['trivia', 'thats_you', 'pinturillo'];
    }
    const bagIndex = Math.floor(this.randomFn() * this.modeBag.length) % this.modeBag.length;
    const [chosenMode] = this.modeBag.splice(bagIndex, 1);

    this.selectedMode = chosenMode!;
    this.phase = 'playing';
    this.roundStartedAt = now;

    if (chosenMode === 'trivia') {
      const prompt = TRIVIA_BANK[this.triviaCursor % TRIVIA_BANK.length]!;
      this.triviaCursor++;
      this.currentTrivia = prompt;
      this.triviaSelections.clear();
      this.roundDeadlineAt = now + TRIVIA_DURATION_MS;
      this.watchdogDeadlineAt = null;
      this.statusBanner = forcedByWatchdog
        ? 'Watchdog giro la ruleta automaticamente: ¡Trivia Rush en curso!'
        : '¡Ruleta en Trivia Rush! Responde antes de que caiga el reloj.';
      this.simulateBotTriviaResponses(now);
    } else if (chosenMode === 'thats_you') {
      const prompt = SOCIAL_PROMPTS[this.socialCursor % SOCIAL_PROMPTS.length]!;
      this.socialCursor++;
      this.currentSocialPrompt = prompt;
      this.socialVotes.clear();
      this.socialVoteBreakdown = null;
      this.socialWinnerIds = null;
      this.roundDeadlineAt = now + SOCIAL_VOTE_DURATION_MS;
      this.watchdogDeadlineAt = null;
      this.statusBanner = forcedByWatchdog
        ? 'Watchdog giro la ruleta automaticamente: ¡Ese Eres Tu en curso!'
        : '¡Ruleta en Ese Eres Tu! Vota en secreto para delatar a un amigo.';
      this.simulateBotSocialVotes();
    } else {
      const humanPool = this.contenders.filter((c) => !c.isBot);
      const drawerPool = humanPool.length > 0 ? humanPool : this.contenders;
      const drawer = drawerPool[(this.roundNumber - 1) % drawerPool.length]!;
      const secretWord = SKETCH_WORDS[this.sketchCursor % SKETCH_WORDS.length]!;
      this.sketchCursor++;
      this.currentDrawerId = drawer.id;
      this.currentSecretWord = secretWord;
      this.sketchStrokes = [];
      this.sketchGuessedIds = [];
      this.sketchFeed = [];
      this.hasDrawerSubmittedStroke = false;
      this.roundDeadlineAt = now + SKETCH_DURATION_MS;
      this.watchdogDeadlineAt = now + WATCHDOG_TIMEOUT_MS;
      this.statusBanner = forcedByWatchdog
        ? `Watchdog giro la ruleta: ¡Pinturillo! Dibuja ${drawer.nickname}.`
        : `¡Pinturillo! ${drawer.nickname} tiene el lapiz en la mano.`;
    }
  }

  private submitTriviaAnswer(actor: Contender, optionIndex: number, now: number): void {
    if (this.phase !== 'playing' || this.selectedMode !== 'trivia' || !this.currentTrivia) {
      throw new Error('No hay una ronda activa de Trivia Rush.');
    }
    if (optionIndex < 0 || optionIndex > 3) {
      throw new Error('Indice de alternativa fuera de rango.');
    }
    if (this.triviaSelections.has(actor.id)) {
      return;
    }

    this.triviaSelections.set(actor.id, { optionIndex, answeredAt: now });
    actor.hasAnswered = true;

    if (this.contenders.every((c) => c.hasAnswered)) {
      this.concludeActiveRound(now);
    }
  }

  private submitSocialVote(actor: Contender, targetContenderId: string, now: number): void {
    if (this.phase !== 'playing' || this.selectedMode !== 'thats_you') {
      throw new Error('No hay una votacion activa de Ese Eres Tu.');
    }
    const targetExists = this.contenders.some((c) => c.id === targetContenderId);
    if (!targetExists) {
      throw new Error('El jugador votado no existe en la sala.');
    }
    if (this.socialVotes.has(actor.id)) {
      return;
    }

    this.socialVotes.set(actor.id, targetContenderId);
    actor.hasAnswered = true;

    if (this.contenders.every((c) => c.hasAnswered)) {
      this.concludeActiveRound(now);
    }
  }

  private pushVectorBatch(actor: Contender, batch: VectorBatch, now: number): void {
    if (this.phase !== 'playing' || this.selectedMode !== 'pinturillo') {
      throw new Error('No hay una ronda activa de Pinturillo.');
    }
    if (actor.id !== this.currentDrawerId) {
      throw new Error('Solo el dibujante activo puede enviar trazos al lienzo.');
    }

    const sanitizedPoints = (batch.points ?? []).slice(0, 120).map((pt) => ({
      x: Math.max(0, Math.min(1000, Math.round(pt.x))),
      y: Math.max(0, Math.min(1000, Math.round(pt.y)))
    }));

    if (sanitizedPoints.length === 0) return;

    this.sketchStrokes.push({
      strokeId: String(batch.strokeId || `st-${this.sketchStrokes.length + 1}`),
      color: batch.color || '#10B981',
      width: Math.max(2, Math.min(16, Number(batch.width) || 4)),
      points: sanitizedPoints
    });

    if (!this.hasDrawerSubmittedStroke) {
      this.hasDrawerSubmittedStroke = true;
      this.watchdogDeadlineAt = null;
    }

    if (this.sketchStrokes.length === 3 || this.sketchStrokes.length >= 10) {
      this.simulateBotSketchGuesses(now, this.sketchStrokes.length >= 10);
    }
  }

  private clearSketchCanvas(actor: Contender): void {
    if (this.phase !== 'playing' || this.selectedMode !== 'pinturillo') return;
    if (actor.id !== this.currentDrawerId) {
      throw new Error('Solo el dibujante activo puede limpiar el lienzo.');
    }
    this.sketchStrokes = [];
  }

  private submitSketchGuess(actor: Contender, rawGuess: string, now: number): void {
    if (this.phase !== 'playing' || this.selectedMode !== 'pinturillo' || !this.currentSecretWord) {
      throw new Error('No hay una ronda activa de Pinturillo.');
    }
    if (actor.id === this.currentDrawerId) {
      throw new Error('El dibujante activo no puede enviar adivinanzas.');
    }
    if (this.sketchGuessedIds.includes(actor.id)) {
      return;
    }

    const cleanGuess = rawGuess.trim().slice(0, 40);
    if (!cleanGuess) return;

    const isMatch =
      normalizeAnswerText(cleanGuess) === normalizeAnswerText(this.currentSecretWord);

    if (isMatch) {
      this.sketchGuessedIds.push(actor.id);
      actor.hasAnswered = true;
      const orderBonus = Math.max(200, 900 - (this.sketchGuessedIds.length - 1) * 150);
      actor.lastRoundDelta = orderBonus;
      actor.score += orderBonus;
      actor.streak += 1;

      const drawer = this.contenders.find((c) => c.id === this.currentDrawerId);
      if (drawer) {
        drawer.lastRoundDelta += 250;
        drawer.score += 250;
      }

      this.sketchFeed.push({
        contenderId: actor.id,
        nickname: actor.nickname,
        text: '¡Adivino la palabra secreta!',
        isCorrect: true,
        timestamp: now
      });

      const nonDrawers = this.contenders.filter((c) => c.id !== this.currentDrawerId);
      if (nonDrawers.every((c) => this.sketchGuessedIds.includes(c.id))) {
        this.concludeActiveRound(now);
      }
    } else {
      this.sketchFeed.push({
        contenderId: actor.id,
        nickname: actor.nickname,
        text: cleanGuess,
        isCorrect: false,
        timestamp: now
      });
    }
  }

  private concludeActiveRound(now: number): void {
    if (this.phase !== 'playing') return;
    this.phase = 'round_reveal';
    this.watchdogDeadlineAt = null;
    this.roundDeadlineAt = null;

    if (this.selectedMode === 'trivia' && this.currentTrivia) {
      const started = this.roundStartedAt ?? now;
      for (const contender of this.contenders) {
        const entry = this.triviaSelections.get(contender.id);
        if (entry && entry.optionIndex === this.currentTrivia.correctOptionIndex) {
          const elapsed = Math.max(0, entry.answeredAt - started);
          const timeFactor = Math.max(0.25, 1 - elapsed / TRIVIA_DURATION_MS);
          const speedPoints = Math.round(1000 * timeFactor);
          const streakBonus = contender.streak * 100;
          const totalDelta = speedPoints + streakBonus;
          contender.streak += 1;
          contender.lastRoundDelta = totalDelta;
          contender.score += totalDelta;
        } else {
          contender.streak = 0;
          contender.lastRoundDelta = 0;
        }
      }
      this.statusBanner = `Ronda ${this.roundNumber} finalizada: Respuesta correcta revelada.`;
    } else if (this.selectedMode === 'thats_you') {
      const breakdown: Record<string, number> = {};
      let maxVotes = 0;
      for (const targetId of this.socialVotes.values()) {
        breakdown[targetId] = (breakdown[targetId] ?? 0) + 1;
        if (breakdown[targetId]! > maxVotes) {
          maxVotes = breakdown[targetId]!;
        }
      }
      const winners = Object.entries(breakdown)
        .filter(([, count]) => count === maxVotes && maxVotes > 0)
        .map(([targetId]) => targetId);

      this.socialVoteBreakdown = breakdown;
      this.socialWinnerIds = winners;

      for (const contender of this.contenders) {
        const votedFor = this.socialVotes.get(contender.id);
        if (votedFor && winners.includes(votedFor)) {
          contender.lastRoundDelta = 750;
          contender.score += 750;
          contender.streak += 1;
        } else {
          contender.lastRoundDelta = 0;
        }
      }
      this.statusBanner = 'Votacion cerrada: Consenso del grupo revelado.';
    } else if (this.selectedMode === 'pinturillo') {
      this.statusBanner = `Fin del dibujo: La palabra secreta era ${this.currentSecretWord}.`;
    }
  }

  private advanceFromReveal(now: number): void {
    if (this.phase !== 'round_reveal') {
      throw new Error('La sala no se encuentra en fase de revelacion de ronda.');
    }
    if (this.roundNumber >= this.totalRounds) {
      this.phase = 'podium';
      this.statusBanner = '¡Partida completada! Podio final de la sesion.';
      return;
    }
    this.roundNumber += 1;
    this.enterRoulettePhase(now);
  }

  private triggerRematch(actor: Contender, now: number): void {
    if (this.phase !== 'podium' && this.phase !== 'round_reveal') {
      throw new Error('La revancha solo esta disponible al concluir la ronda o en el podio.');
    }
    if (!actor.isHost && this.contenders.some((c) => c.isHost && c.isConnected)) {
      throw new Error('Solo el anfitrion puede activar la revancha inmediata.');
    }
    this.startMatch(this.contenders.find((c) => c.isHost) ?? actor, this.totalRounds, now);
    this.statusBanner = '¡Revancha inmediata iniciada en la misma sala!';
  }

  private simulateBotTriviaResponses(now: number): void {
    if (!this.currentTrivia) return;
    for (const bot of this.contenders.filter((c) => c.isBot)) {
      const isRight = this.randomFn() > 0.35;
      const chosenOption = isRight
        ? this.currentTrivia.correctOptionIndex
        : (this.currentTrivia.correctOptionIndex + 1) % 4;
      const simulatedDelay = Math.floor(2000 + this.randomFn() * 6000);
      this.triviaSelections.set(bot.id, {
        optionIndex: chosenOption,
        answeredAt: now + simulatedDelay
      });
      bot.hasAnswered = true;
    }
  }

  private simulateBotSocialVotes(): void {
    for (const bot of this.contenders.filter((c) => c.isBot)) {
      const target =
        this.contenders[Math.floor(this.randomFn() * this.contenders.length)] ?? this.contenders[0];
      if (target) {
        this.socialVotes.set(bot.id, target.id);
        bot.hasAnswered = true;
      }
    }
  }

  private simulateBotSketchGuesses(now: number, allowCorrectGuess: boolean): void {
    if (!this.currentSecretWord) return;
    const decoys = ['¿Una empanada?', '¿Un gato?', '¿Una nave espacial?', '¿Un sombrero?'];
    for (const bot of this.contenders.filter((c) => c.isBot && c.id !== this.currentDrawerId)) {
      if (this.sketchGuessedIds.includes(bot.id)) continue;
      if (!allowCorrectGuess) {
        const decoy = decoys[Math.floor(this.randomFn() * decoys.length)] ?? '¿Un circulo?';
        this.submitSketchGuess(bot, decoy, now + 500);
      } else if (this.randomFn() > 0.35) {
        this.submitSketchGuess(bot, this.currentSecretWord, now + 1000);
      }
    }
  }

  private requireContenderByToken(sessionToken: string): Contender {
    const found = this.contenders.find((c) => c.sessionToken === sessionToken);
    if (!found) {
      throw new Error('Contendiente no registrado en esta sala.');
    }
    return found;
  }
}
