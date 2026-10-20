/**
 * Modos de juego disponibles en la ruleta de Ni Idea.
 */
export type GameMode = 'trivia' | 'thats_you' | 'pinturillo';

/**
 * Fases del ciclo de vida de una sala de partida.
 */
export type RoomPhase =
  | 'lobby'
  | 'roulette'
  | 'playing'
  | 'round_reveal'
  | 'podium';

/**
 * Representa a un contendiente dentro de una sala activa.
 */
export interface Contender {
  /** Identificador publico del jugador en la sala */
  id: string;
  /** Token efimero secreto para reconexion transparente */
  sessionToken: string;
  /** Apodo temporal elegido para la sesion */
  nickname: string;
  /** Indica si es el anfitrion de la sala */
  isHost: boolean;
  /** Indica si la conexion WebSocket se encuentra activa */
  isConnected: boolean;
  /** Indica si es un contendiente automatizado de practica */
  isBot: boolean;
  /** Puntaje acumulado en la partida actual */
  score: number;
  /** Racha de aciertos consecutivos */
  streak: number;
  /** Indica si ya emitio respuesta o voto en la ronda en curso */
  hasAnswered: boolean;
  /** Puntos obtenidos en la ultima ronda */
  lastRoundDelta: number;
}

/**
 * Punto normalizado (0 a 1000) dentro de un trazo vectorial de Pinturillo.
 */
export interface VectorPoint {
  x: number;
  y: number;
}

/**
 * Lote compacto de trazos despachado a 30 Hz desde el lienzo del dibujante.
 */
export interface VectorBatch {
  strokeId: string;
  color: string;
  width: number;
  points: VectorPoint[];
}

/**
 * Entrada en el registro de intentos de adivinanza en Pinturillo.
 */
export interface GuessFeedEntry {
  contenderId: string;
  nickname: string;
  text: string;
  isCorrect: boolean;
  timestamp: number;
}

/**
 * Pregunta estructurada para el modo Trivia Rush.
 */
export interface TriviaPrompt {
  id: string;
  category: string;
  question: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
}

/**
 * Proyeccion asimetrica del estado de la sala adaptada para un contendiente especifico.
 * Jamas expone respuestas correctas ni palabras secretas antes de la fase de revelacion.
 */
export interface AsymmetricProjection {
  roomCode: string;
  phase: RoomPhase;
  roundNumber: number;
  totalRounds: number;
  selfContenderId: string;
  contenders: Array<Omit<Contender, 'sessionToken'>>;
  activeRollerId: string | null;
  selectedMode: GameMode | null;
  watchdogDeadlineAt: number | null;
  roundDeadlineAt: number | null;
  statusBanner: string;
  triviaView: {
    category: string;
    question: string;
    options: [string, string, string, string];
    selectedOptionIndex: number | null;
    revealedCorrectIndex: number | null;
  } | null;
  socialVoteView: {
    prompt: string;
    votedTargetId: string | null;
    revealedWinnerIds: string[] | null;
    voteBreakdown: Record<string, number> | null;
  } | null;
  sketchView: {
    drawerId: string;
    drawerNickname: string;
    isSelfDrawer: boolean;
    secretWord: string | null;
    wordHint: string;
    strokes: VectorBatch[];
    guessedContenderIds: string[];
    feed: GuessFeedEntry[];
    revealedWord: string | null;
  } | null;
}

/**
 * Comandos soportados desde el cliente hacia el servidor de sala.
 */
export type ClientCommand =
  | {
      type: 'join_room';
      nickname: string;
      sessionToken: string;
      createIfEmpty?: boolean;
    }
  | {
      type: 'add_bot';
      sessionToken: string;
    }
  | {
      type: 'start_match';
      sessionToken: string;
      totalRounds?: number;
    }
  | {
      type: 'spin_roulette';
      sessionToken: string;
    }
  | {
      type: 'submit_trivia';
      sessionToken: string;
      optionIndex: number;
    }
  | {
      type: 'submit_social_vote';
      sessionToken: string;
      targetContenderId: string;
    }
  | {
      type: 'push_vector_batch';
      sessionToken: string;
      batch: VectorBatch;
    }
  | {
      type: 'clear_canvas';
      sessionToken: string;
    }
  | {
      type: 'submit_sketch_guess';
      sessionToken: string;
      guess: string;
    }
  | {
      type: 'next_round';
      sessionToken: string;
    }
  | {
      type: 'rematch';
      sessionToken: string;
    };
