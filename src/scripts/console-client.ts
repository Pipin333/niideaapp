import PartySocket from 'partysocket';
import { generateRoomCode, sanitizeRoomCode } from '../domain/room-engine';
import type {
  AsymmetricProjection,
  ClientCommand,
  VectorBatch,
  VectorPoint
} from '../domain/room-types';

const SESSION_TOKEN_KEY = 'ni_idea_session_token';
const NICKNAME_KEY = 'ni_idea_nickname';
const VECTOR_BATCH_INTERVAL_MS = 33; // 30 Hz

/**
 * Obtiene o genera un token de sesion efimero persistido en `sessionStorage`
 * para garantizar reconexion transparente sin requerir cuentas de usuario.
 * @returns Token unico de la pestaña actual.
 */
export function getOrCreateSessionToken(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tok-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, generated);
    return generated;
  } catch {
    return `tok-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Inicializa el controlador interactivo de la consola Ni Idea en el navegador.
 */
export function bootNiIdeaConsole(): void {
  const sessionToken = getOrCreateSessionToken();
  let socket: PartySocket | null = null;
  let currentProjection: AsymmetricProjection | null = null;
  let activeRoomCode = '';
  let activeNickname = '';
  let countdownInterval: number | null = null;

  // Referencias de los 5 estados principales de UI
  const viewEntry = document.getElementById('state-entry');
  const viewLoading = document.getElementById('state-loading');
  const viewError = document.getElementById('state-error');
  const viewActiveRoom = document.getElementById('state-active-room');
  const errorMessageEl = document.getElementById('error-state-message');
  const retryBtn = document.getElementById('btn-retry-connection');

  // Controles de entrada (Estado 1)
  const nicknameInput = document.getElementById('input-nickname') as HTMLInputElement | null;
  const pinInputs = [0, 1, 2, 3].map(
    (idx) => document.getElementById(`pin-slot-${idx}`) as HTMLInputElement | null
  );
  const pinSlotContainer = document.getElementById('pin-slot-group');
  const createRoomBtn = document.getElementById('btn-create-room') as HTMLButtonElement | null;
  const joinRoomBtn = document.getElementById('btn-join-room') as HTMLButtonElement | null;
  const entryInlineFeedback = document.getElementById('entry-inline-feedback');

  // Sub-vistas de sala activa (Estado 3)
  const subviewLobby = document.getElementById('subview-lobby');
  const subviewRoulette = document.getElementById('subview-roulette');
  const subviewTrivia = document.getElementById('subview-trivia');
  const subviewThatsYou = document.getElementById('subview-thats-you');
  const subviewPinturillo = document.getElementById('subview-pinturillo');
  const subviewReveal = document.getElementById('subview-reveal');
  const subviewPodium = document.getElementById('subview-podium');

  // Elementos de cabecera de sala activa
  const headerRoomCode = document.getElementById('active-room-code');
  const headerRoundBadge = document.getElementById('active-round-badge');
  const headerTimerBadge = document.getElementById('active-timer-badge');
  const headerStatusBanner = document.getElementById('active-status-banner');
  const copyPinBtn = document.getElementById('btn-copy-pin');
  const leaveRoomBtn = document.getElementById('btn-leave-room');

  // Inicializar linterna / spotlight reactivo al cursor
  window.addEventListener(
    'pointermove',
    (ev) => {
      document.documentElement.style.setProperty('--mouse-x', `${ev.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${ev.clientY}px`);
    },
    { passive: true }
  );

  // Restaurar apodo previo si existe
  try {
    const savedNick = window.sessionStorage.getItem(NICKNAME_KEY);
    if (savedNick && nicknameInput) {
      nicknameInput.value = savedNick;
    }
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    if (urlRoom) {
      const cleaned = urlRoom.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      for (let i = 0; i < 4; i++) {
        const slot = pinInputs[i];
        if (slot) slot.value = cleaned[i] ?? '';
      }
      if (pinSlotContainer) {
        pinSlotContainer.dataset.complete = cleaned.length === 4 ? 'true' : 'false';
      }
    }
  } catch {
    // Continuar sin persistencia si el navegador restringe sessionStorage
  }

  // Configurar el cajetin caracteristico de 4 ranuras (_ _ _ _)
  function getEnteredPinCode(): string {
    return pinInputs
      .map((input) => (input?.value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
      .join('');
  }

  function updatePinVisualState(): void {
    const code = getEnteredPinCode();
    const isComplete = code.length === 4;
    if (pinSlotContainer) {
      pinSlotContainer.dataset.complete = isComplete ? 'true' : 'false';
    }
  }

  pinInputs.forEach((input, idx) => {
    if (!input) return;

    input.addEventListener('input', () => {
      const cleaned = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      input.value = cleaned.slice(-1);
      updatePinVisualState();
      if (input.value && idx < 3) {
        pinInputs[idx + 1]?.focus();
        pinInputs[idx + 1]?.select();
      }
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !input.value && idx > 0) {
        pinInputs[idx - 1]?.focus();
      } else if (ev.key === 'ArrowLeft' && idx > 0) {
        ev.preventDefault();
        pinInputs[idx - 1]?.focus();
      } else if (ev.key === 'ArrowRight' && idx < 3) {
        ev.preventDefault();
        pinInputs[idx + 1]?.focus();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        joinRoomBtn?.click();
      }
    });

    input.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const pasted = (ev.clipboardData?.getData('text') ?? '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4);
      for (let i = 0; i < 4; i++) {
        const target = pinInputs[i];
        if (target) {
          target.value = pasted[i] ?? '';
        }
      }
      updatePinVisualState();
      const focusIdx = Math.min(3, pasted.length);
      pinInputs[focusIdx]?.focus();
    });
  });

  function showPrimaryView(state: 'entry' | 'loading' | 'error' | 'active'): void {
    viewEntry?.classList.toggle('hidden', state !== 'entry');
    viewLoading?.classList.toggle('hidden', state !== 'loading');
    viewError?.classList.toggle('hidden', state !== 'error');
    viewActiveRoom?.classList.toggle('hidden', state !== 'active');
  }

  function showInlineFeedback(msg: string): void {
    if (!entryInlineFeedback) return;
    entryInlineFeedback.textContent = msg;
    entryInlineFeedback.classList.remove('hidden');
  }

  function clearInlineFeedback(): void {
    if (!entryInlineFeedback) return;
    entryInlineFeedback.textContent = '';
    entryInlineFeedback.classList.add('hidden');
  }

  function sendCommand(cmd: ClientCommand): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(cmd));
  }

  function connectToRoom(rawRoomCode: string, rawNickname: string): void {
    clearInlineFeedback();
    let cleanCode: string;
    try {
      cleanCode = sanitizeRoomCode(rawRoomCode);
    } catch (err) {
      showInlineFeedback(
        err instanceof Error ? err.message : 'Ingresa un codigo de 4 letras o numeros.'
      );
      pinInputs[0]?.focus();
      return;
    }

    const cleanNick = rawNickname.trim().slice(0, 18) || `Jugador${Math.floor(Math.random() * 90 + 10)}`;
    activeRoomCode = cleanCode;
    activeNickname = cleanNick;

    try {
      window.sessionStorage.setItem(NICKNAME_KEY, cleanNick);
    } catch {
      // Ignorar si sessionStorage no esta disponible
    }

    showPrimaryView('loading');

    if (socket) {
      socket.close();
      socket = null;
    }

    const configuredHost =
      (document.body.dataset.partykitHost || '').trim() || window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    socket = new PartySocket({
      host: configuredHost,
      room: cleanCode,
      protocol
    });

    socket.addEventListener('open', () => {
      sendCommand({
        type: 'join_room',
        nickname: cleanNick,
        sessionToken
      });
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as
          | { type: 'room_state'; state: AsymmetricProjection }
          | { type: 'room_error'; message: string };

        if (payload.type === 'room_state') {
          currentProjection = payload.state;
          showPrimaryView('active');
          renderProjection(payload.state);
        } else if (payload.type === 'room_error') {
          if (headerStatusBanner && currentProjection) {
            headerStatusBanner.textContent = payload.message;
          } else {
            if (errorMessageEl) errorMessageEl.textContent = payload.message;
            showPrimaryView('error');
          }
        }
      } catch {
        // Ignorar tramas malformadas
      }
    });

    socket.addEventListener('error', () => {
      if (!currentProjection) {
        if (errorMessageEl) {
          errorMessageEl.textContent =
            'No se pudo establecer la conexion en tiempo real con la sala.';
        }
        showPrimaryView('error');
      }
    });
  }

  // Acciones principales del Estado 1
  createRoomBtn?.addEventListener('click', () => {
    const newCode = generateRoomCode();
    for (let i = 0; i < 4; i++) {
      const slot = pinInputs[i];
      if (slot) slot.value = newCode[i] ?? '';
    }
    updatePinVisualState();
    connectToRoom(newCode, nicknameInput?.value ?? '');
  });

  joinRoomBtn?.addEventListener('click', () => {
    const enteredCode = getEnteredPinCode();
    connectToRoom(enteredCode, nicknameInput?.value ?? '');
  });

  retryBtn?.addEventListener('click', () => {
    if (activeRoomCode) {
      connectToRoom(activeRoomCode, activeNickname);
    } else {
      showPrimaryView('entry');
    }
  });

  leaveRoomBtn?.addEventListener('click', () => {
    if (socket) {
      socket.close();
      socket = null;
    }
    currentProjection = null;
    showPrimaryView('entry');
  });

  copyPinBtn?.addEventListener('click', async () => {
    if (!currentProjection) return;
    try {
      await navigator.clipboard.writeText(currentProjection.roomCode);
      if (copyPinBtn) {
        const original = copyPinBtn.textContent;
        copyPinBtn.textContent = 'Copiado';
        setTimeout(() => {
          copyPinBtn.textContent = original;
        }, 1200);
      }
    } catch {
      // Ignorar si clipboard API no esta disponible
    }
  });

  // Botones de Lobby, Ruleta, Revelacion y Podio
  document.getElementById('btn-add-bot')?.addEventListener('click', () => {
    sendCommand({ type: 'add_bot', sessionToken });
  });

  document.getElementById('btn-start-match')?.addEventListener('click', () => {
    sendCommand({ type: 'start_match', sessionToken, totalRounds: 3 });
  });

  document.getElementById('btn-spin-wheel')?.addEventListener('click', () => {
    const wheelSvg = document.getElementById('roulette-wheel-graphic');
    wheelSvg?.classList.add('animate-spin');
    setTimeout(() => {
      wheelSvg?.classList.remove('animate-spin');
      sendCommand({ type: 'spin_roulette', sessionToken });
    }, 350);
  });

  document.getElementById('btn-next-round')?.addEventListener('click', () => {
    sendCommand({ type: 'next_round', sessionToken });
  });

  document.getElementById('btn-rematch')?.addEventListener('click', () => {
    sendCommand({ type: 'rematch', sessionToken });
  });

  // Pinturillo Canvas & 30Hz Vector Batching
  const sketchCanvas = document.getElementById('pinturillo-canvas') as HTMLCanvasElement | null;
  const clearCanvasBtn = document.getElementById('btn-clear-canvas');
  const rerollWordBtn = document.getElementById('btn-reroll-word') as HTMLButtonElement | null;
  const sketchGuessForm = document.getElementById('sketch-guess-form') as HTMLFormElement | null;
  const sketchGuessInput = document.getElementById('sketch-guess-input') as HTMLInputElement | null;

  let isDrawing = false;
  let activeStrokeId = '';
  let pendingPoints: VectorPoint[] = [];
  let selectedStrokeColor = '#10B981';

  document.querySelectorAll<HTMLButtonElement>('[data-brush-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedStrokeColor = btn.dataset.brushColor || '#10B981';
    });
  });

  function getNormalizedCanvasPoint(ev: PointerEvent, canvas: HTMLCanvasElement): VectorPoint {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1000, Math.round(((ev.clientX - rect.left) / rect.width) * 1000)));
    const y = Math.max(0, Math.min(1000, Math.round(((ev.clientY - rect.top) / rect.height) * 1000)));
    return { x, y };
  }

  if (sketchCanvas) {
    sketchCanvas.addEventListener('pointerdown', (ev) => {
      if (!currentProjection?.sketchView?.isSelfDrawer) return;
      sketchCanvas.setPointerCapture(ev.pointerId);
      isDrawing = true;
      activeStrokeId = `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pt = getNormalizedCanvasPoint(ev, sketchCanvas);
      pendingPoints.push(pt);
    });

    sketchCanvas.addEventListener('pointermove', (ev) => {
      if (!isDrawing || !currentProjection?.sketchView?.isSelfDrawer) return;
      const pt = getNormalizedCanvasPoint(ev, sketchCanvas);
      pendingPoints.push(pt);
      drawStreaksOnCanvas(sketchCanvas, [
        ...(currentProjection.sketchView.strokes ?? []),
        {
          strokeId: activeStrokeId,
          color: selectedStrokeColor,
          width: 5,
          points: pendingPoints
        }
      ]);
    });

    const finishStroke = () => {
      if (!isDrawing) return;
      isDrawing = false;
      flushVectorBatch();
    };

    sketchCanvas.addEventListener('pointerup', finishStroke);
    sketchCanvas.addEventListener('pointercancel', finishStroke);
  }

  function flushVectorBatch(): void {
    if (pendingPoints.length === 0 || !currentProjection?.sketchView?.isSelfDrawer) return;
    const batch: VectorBatch = {
      strokeId: activeStrokeId || `st-${Date.now()}`,
      color: selectedStrokeColor,
      width: 5,
      points: [...pendingPoints]
    };
    pendingPoints = [];
    sendCommand({
      type: 'push_vector_batch',
      sessionToken,
      batch
    });
  }

  window.setInterval(() => {
    if (isDrawing && pendingPoints.length >= 2) {
      const lastPoint = pendingPoints[pendingPoints.length - 1]!;
      flushVectorBatch();
      pendingPoints = [lastPoint];
    }
  }, VECTOR_BATCH_INTERVAL_MS);

  clearCanvasBtn?.addEventListener('click', () => {
    sendCommand({ type: 'clear_canvas', sessionToken });
  });

  rerollWordBtn?.addEventListener('click', () => {
    sendCommand({ type: 'reroll_sketch_word', sessionToken });
  });

  sketchGuessForm?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!sketchGuessInput) return;
    const guess = sketchGuessInput.value.trim();
    if (!guess) return;
    sendCommand({
      type: 'submit_sketch_guess',
      sessionToken,
      guess
    });
    sketchGuessInput.value = '';
  });

  function drawStreaksOnCanvas(canvas: HTMLCanvasElement, batches: VectorBatch[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grouped = new Map<string, { color: string; width: number; points: VectorPoint[] }>();
    for (const b of batches) {
      const existing = grouped.get(b.strokeId);
      if (existing) {
        existing.points.push(...b.points);
      } else {
        grouped.set(b.strokeId, {
          color: b.color,
          width: b.width,
          points: [...b.points]
        });
      }
    }

    for (const stroke of grouped.values()) {
      if (stroke.points.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = stroke.points[0]!;
      ctx.moveTo((first.x / 1000) * canvas.width, (first.y / 1000) * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i]!;
        ctx.lineTo((pt.x / 1000) * canvas.width, (pt.y / 1000) * canvas.height);
      }
      if (stroke.points.length === 1) {
        ctx.arc(
          (first.x / 1000) * canvas.width,
          (first.y / 1000) * canvas.height,
          stroke.width / 2,
          0,
          Math.PI * 2
        );
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderProjection(state: AsymmetricProjection): void {
    if (headerRoomCode) headerRoomCode.textContent = state.roomCode;
    if (headerRoundBadge) {
      headerRoundBadge.textContent =
        state.phase === 'lobby'
          ? `LOBBY (${state.contenders.length}/16)`
          : `RONDA ${state.roundNumber}/${state.totalRounds}`;
    }
    if (headerStatusBanner) {
      headerStatusBanner.textContent = state.statusBanner;
    }

    // Actualizar temporizador visible
    if (countdownInterval !== null) {
      window.clearInterval(countdownInterval);
      countdownInterval = null;
    }
    const deadline = state.roundDeadlineAt ?? state.watchdogDeadlineAt;
    const updateTimerText = () => {
      if (!headerTimerBadge) return;
      if (!deadline) {
        headerTimerBadge.textContent = 'EN VIVO';
        return;
      }
      const secs = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      headerTimerBadge.textContent = `${secs}s`;
    };
    updateTimerText();
    if (deadline) {
      countdownInterval = window.setInterval(updateTimerText, 250);
    }

    const selfContender = state.contenders.find((c) => c.id === state.selfContenderId);
    const isHost = Boolean(selfContender?.isHost);

    // Conmutar sub-vista activa sin scroll
    const isLobby = state.phase === 'lobby';
    const isRoulette = state.phase === 'roulette';
    const isTrivia = state.phase === 'playing' && state.selectedMode === 'trivia';
    const isThatsYou = state.phase === 'playing' && state.selectedMode === 'thats_you';
    const isPinturillo = state.phase === 'playing' && state.selectedMode === 'pinturillo';
    const isReveal = state.phase === 'round_reveal';
    const isPodium = state.phase === 'podium';

    subviewLobby?.classList.toggle('hidden', !isLobby);
    subviewRoulette?.classList.toggle('hidden', !isRoulette);
    subviewTrivia?.classList.toggle('hidden', !isTrivia);
    subviewThatsYou?.classList.toggle('hidden', !isThatsYou);
    subviewPinturillo?.classList.toggle('hidden', !isPinturillo);
    subviewReveal?.classList.toggle('hidden', !isReveal);
    subviewPodium?.classList.toggle('hidden', !isPodium);

    if (isLobby) {
      const listEl = document.getElementById('lobby-contenders-list');
      if (listEl) {
        listEl.innerHTML = state.contenders
          .map(
            (c) => `
            <li class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B241E] border border-[#064E3B]/60">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2 h-2 rounded-full ${c.isConnected ? 'bg-[#10B981]' : 'bg-[#F43F5E]'} shrink-0"></span>
                <span class="font-sans text-sm font-medium text-[#F8FAFC] truncate">${escapeHtml(c.nickname)}</span>
                ${c.id === state.selfContenderId ? '<span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981]">TU</span>' : ''}
              </div>
              <span class="font-mono text-[11px] text-[#94A3B8]">
                ${c.isHost ? 'ANFITRION' : c.isBot ? 'BOT' : 'LISTO'}
              </span>
            </li>`
          )
          .join('');
      }
      const startBtn = document.getElementById('btn-start-match') as HTMLButtonElement | null;
      const addBotBtn = document.getElementById('btn-add-bot') as HTMLButtonElement | null;
      const hostHint = document.getElementById('lobby-host-hint');
      if (startBtn) {
        startBtn.disabled = !isHost || state.contenders.length < 2;
      }
      if (addBotBtn) {
        addBotBtn.classList.toggle('hidden', !isHost || state.contenders.length >= 16);
      }
      if (hostHint) {
        hostHint.textContent =
          state.contenders.length < 2
            ? 'Se requieren al menos 2 jugadores (puedes sumar un bot de prueba o abrir otra pestaña).'
            : isHost
              ? 'Mesa lista. Pulsa Iniciar Partida para girar la ruleta.'
              : 'Esperando a que el anfitrion inicie la partida.';
      }
    }

    if (isRoulette) {
      const roller = state.contenders.find((c) => c.id === state.activeRollerId);
      const rollerLabel = document.getElementById('roulette-roller-name');
      const spinBtn = document.getElementById('btn-spin-wheel') as HTMLButtonElement | null;
      if (rollerLabel) {
        rollerLabel.textContent = roller?.nickname ?? 'Jugador';
      }
      const canSpin = state.activeRollerId === state.selfContenderId || isHost;
      if (spinBtn) {
        spinBtn.disabled = !canSpin;
        spinBtn.textContent = canSpin
          ? 'Girar Ruleta de Modos'
          : `Esperando giro de ${roller?.nickname ?? 'Jugador'}...`;
      }
    }

    if (isTrivia && state.triviaView) {
      const catEl = document.getElementById('trivia-category');
      const qEl = document.getElementById('trivia-question');
      const optsContainer = document.getElementById('trivia-options-grid');
      if (catEl) catEl.textContent = state.triviaView.category;
      if (qEl) qEl.textContent = state.triviaView.question;
      if (optsContainer) {
        const myChoice = state.triviaView.selectedOptionIndex;
        optsContainer.innerHTML = state.triviaView.options
          .map((optText, idx) => {
            const isSelected = myChoice === idx;
            const isDisabled = myChoice !== null;
            return `
              <button
                type="button"
                data-trivia-opt="${idx}"
                ${isDisabled ? 'disabled' : ''}
                class="text-left p-4 rounded-lg border transition-all duration-140 ease-spring font-sans text-sm sm:text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                  isSelected
                    ? 'bg-[#10B981] text-[#022C22] border-[#10B981] font-bold'
                    : 'bg-[#0B241E] text-[#F8FAFC] border-[#064E3B] hover:border-[#10B981]'
                } ${isDisabled && !isSelected ? 'opacity-60 cursor-not-allowed' : ''}"
              >
                <span class="font-mono text-xs uppercase mr-2 opacity-80">[${String.fromCharCode(65 + idx)}]</span>
                <span>${escapeHtml(optText)}</span>
              </button>
            `;
          })
          .join('');

        optsContainer.querySelectorAll<HTMLButtonElement>('[data-trivia-opt]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const optionIndex = Number(btn.dataset.triviaOpt);
            sendCommand({
              type: 'submit_trivia',
              sessionToken,
              optionIndex
            });
          });
        });
      }
    }

    if (isThatsYou && state.socialVoteView) {
      const promptEl = document.getElementById('social-prompt-text');
      const targetsGrid = document.getElementById('social-targets-grid');
      if (promptEl) promptEl.textContent = state.socialVoteView.prompt;
      if (targetsGrid) {
        const votedId = state.socialVoteView.votedTargetId;
        targetsGrid.innerHTML = state.contenders
          .map((c) => {
            const isSelected = votedId === c.id;
            const isDisabled = votedId !== null;
            return `
              <button
                type="button"
                data-social-target="${c.id}"
                ${isDisabled ? 'disabled' : ''}
                class="p-3.5 rounded-lg border transition-all duration-140 ease-spring flex items-center justify-between font-sans text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                  isSelected
                    ? 'bg-[#F43F5E] text-white border-[#F43F5E]'
                    : 'bg-[#0B241E] text-[#F8FAFC] border-[#064E3B] hover:border-[#F43F5E]'
                } ${isDisabled && !isSelected ? 'opacity-60 cursor-not-allowed' : ''}"
              >
                <span class="truncate">${escapeHtml(c.nickname)}</span>
                <span class="font-mono text-xs">${isSelected ? 'ACUSADO' : 'VOTAR'}</span>
              </button>
            `;
          })
          .join('');

        targetsGrid.querySelectorAll<HTMLButtonElement>('[data-social-target]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const targetContenderId = btn.dataset.socialTarget || '';
            sendCommand({
              type: 'submit_social_vote',
              sessionToken,
              targetContenderId
            });
          });
        });
      }
    }

    if (isPinturillo && state.sketchView) {
      const wordBanner = document.getElementById('sketch-word-banner');
      const drawerTools = document.getElementById('sketch-drawer-tools');
      const guesserBox = document.getElementById('sketch-guesser-box');
      const feedList = document.getElementById('sketch-feed-list');

      if (wordBanner) {
        wordBanner.textContent = state.sketchView.isSelfDrawer
          ? `DIBUJA: ${state.sketchView.secretWord}`
          : `PISTA (${state.sketchView.drawerNickname}): ${state.sketchView.wordHint}`;
      }
      drawerTools?.classList.toggle('hidden', !state.sketchView.isSelfDrawer);
      guesserBox?.classList.toggle('hidden', state.sketchView.isSelfDrawer);

      if (rerollWordBtn) {
        const remaining = state.sketchView.rerollsRemaining ?? 0;
        rerollWordBtn.disabled = remaining <= 0;
        rerollWordBtn.textContent = remaining > 0 ? `Re-roll (${remaining})` : 'Re-roll (0)';
      }

      if (sketchCanvas && !isDrawing) {
        drawStreaksOnCanvas(sketchCanvas, state.sketchView.strokes);
      }

      if (feedList) {
        feedList.innerHTML =
          state.sketchView.feed.length === 0
            ? '<li class="text-xs font-mono text-[#94A3B8]">Los intentos apareceran aqui en vivo...</li>'
            : state.sketchView.feed
                .map(
                  (entry) => `
                <li class="text-xs font-mono flex items-center justify-between py-1 border-b border-[#064E3B]/40">
                  <span class="font-bold ${entry.isCorrect ? 'text-[#10B981]' : 'text-[#F8FAFC]'}">${escapeHtml(entry.nickname)}:</span>
                  <span class="${entry.isCorrect ? 'text-[#10B981]' : 'text-[#94A3B8]'} truncate ml-2">${escapeHtml(entry.text)}</span>
                </li>`
                )
                .join('');
      }
    }

    if (isReveal) {
      const summaryEl = document.getElementById('reveal-outcome-summary');
      const scoreboardEl = document.getElementById('reveal-scoreboard-list');
      if (summaryEl) {
        if (state.selectedMode === 'trivia' && state.triviaView) {
          const correctIdx = state.triviaView.revealedCorrectIndex ?? 0;
          const correctText = state.triviaView.options[correctIdx] ?? '';
          summaryEl.textContent = `Respuesta correcta: ${correctText}`;
        } else if (state.selectedMode === 'thats_you' && state.socialVoteView) {
          const winners = (state.socialVoteView.revealedWinnerIds ?? [])
            .map((id) => state.contenders.find((c) => c.id === id)?.nickname ?? 'Nadie')
            .join(', ');
          summaryEl.textContent = `Mas votado por el grupo: ${winners || 'Empate sin votos'}`;
        } else if (state.selectedMode === 'pinturillo' && state.sketchView) {
          summaryEl.textContent = `Palabra secreta: ${state.sketchView.revealedWord ?? ''}`;
        }
      }

      if (scoreboardEl) {
        const sorted = [...state.contenders].sort((a, b) => b.score - a.score);
        scoreboardEl.innerHTML = sorted
          .map(
            (c, index) => `
            <li class="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#0B241E] border border-[#064E3B]/60">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs font-bold text-[#10B981]">#${index + 1}</span>
                <span class="font-sans text-sm font-semibold text-[#F8FAFC]">${escapeHtml(c.nickname)}</span>
              </div>
              <div class="flex items-center gap-3 font-mono text-xs">
                ${
                  c.lastRoundDelta > 0
                    ? `<span class="text-[#10B981] font-bold">+${c.lastRoundDelta}</span>`
                    : '<span class="text-[#94A3B8]">+0</span>'
                }
                <span class="px-2 py-0.5 rounded bg-[#061814] border border-[#064E3B] text-[#F8FAFC] font-bold">${c.score} pts</span>
              </div>
            </li>`
          )
          .join('');
      }
    }

    if (isPodium) {
      const podiumList = document.getElementById('podium-ranking-list');
      if (podiumList) {
        const sorted = [...state.contenders].sort((a, b) => b.score - a.score);
        podiumList.innerHTML = sorted
          .map(
            (c, index) => `
            <li class="flex items-center justify-between px-4 py-3 rounded-lg border ${
              index === 0
                ? 'bg-[#10B981]/15 border-[#10B981]'
                : 'bg-[#0B241E] border-[#064E3B]/60'
            }">
              <div class="flex items-center gap-3">
                <span class="font-mono text-sm font-bold ${index === 0 ? 'text-[#10B981]' : 'text-[#94A3B8]'}">
                  ${index === 0 ? '1° CAMPEON' : `${index + 1}° PUESTO`}
                </span>
                <span class="font-display text-base font-bold text-[#F8FAFC]">${escapeHtml(c.nickname)}</span>
              </div>
              <span class="font-mono text-sm font-bold text-[#10B981]">${c.score} PTS</span>
            </li>`
          )
          .join('');
      }
    }
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
