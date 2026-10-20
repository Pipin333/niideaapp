import {
  routePartykitRequest,
  Server,
  type Connection,
  type WSMessage
} from 'partyserver';
import { RoomMatchEngine } from '../src/domain/room-engine';
import type { ClientCommand } from '../src/domain/room-types';

export interface Env {
  Main: DurableObjectNamespace<Main>;
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}

/**
 * Actor Durable Object sobre PartyServer (Cloudflare Workers).
 * Mantiene el estado en memoria por sala, aplica proyeccion asimetrica por socket
 * y delega las alarmas Anti-AFK (15s) a `ctx.storage.setAlarm()`.
 */
export class Main extends Server<Env> {
  static options = {
    hibernate: true
  };

  private engineInstance: RoomMatchEngine | null = null;
  private readonly socketTokens = new Map<string, string>();

  private get engine(): RoomMatchEngine {
    if (!this.engineInstance) {
      const cleanId = (this.name || 'K9X2').slice(0, 4).padEnd(4, 'X');
      this.engineInstance = new RoomMatchEngine(cleanId);
    }
    return this.engineInstance;
  }

  /**
   * Gestiona la recepcion de mensajes WebSocket desde los contendientes.
   * @param connection Conexion WebSocket emisora.
   * @param message Payload JSON con el comando del cliente.
   */
  public override async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    try {
      const rawText = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const command = JSON.parse(rawText) as ClientCommand;
      if (command.sessionToken) {
        this.socketTokens.set(connection.id, command.sessionToken);
      }

      this.engine.handleCommand(command, Date.now());
      await this.scheduleNextAlarm();
      this.broadcastAsymmetricProjections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Comando no reconocido.';
      connection.send(
        JSON.stringify({
          type: 'room_error',
          message: errorMessage
        })
      );
    }
  }

  /**
   * Marca al contendiente como desconectado cuando su socket se cierra,
   * preservando su asiento y puntaje para reconexion transparente.
   * @param connection Conexion WebSocket cerrada.
   */
  public override onClose(connection: Connection): void {
    const token = this.socketTokens.get(connection.id);
    if (token) {
      this.engine.markDisconnected(token);
      this.socketTokens.delete(connection.id);
      this.broadcastAsymmetricProjections();
    }
  }

  /**
   * Alarma ejecutada por Cloudflare Durable Objects para el Watchdog Anti-AFK (15s)
   * y los cierres de ronda automaticos sin depender del cliente.
   */
  public override async onAlarm(): Promise<void> {
    const mutated = this.engine.evaluateAlarms(Date.now());
    if (mutated) {
      this.broadcastAsymmetricProjections();
    }
    await this.scheduleNextAlarm();
  }

  private async scheduleNextAlarm(): Promise<void> {
    const nextAlarm = this.engine.getNextAlarmTimestamp();
    if (nextAlarm !== null) {
      await this.ctx.storage.setAlarm(nextAlarm);
    }
  }

  private broadcastAsymmetricProjections(): void {
    for (const connection of this.getConnections()) {
      const token = this.socketTokens.get(connection.id) ?? '';
      const projection = this.engine.buildProjectionForSession(token);
      connection.send(
        JSON.stringify({
          type: 'room_state',
          state: projection
        })
      );
    }
  }
}

/**
 * Worker principal: enruta conexiones WebSocket `/parties/main/:room` al Durable Object `Main`
 * y sirve los archivos estaticos de Astro desde el mismo dominio.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const partyResponse = await routePartykitRequest(request, env as unknown as Record<string, unknown>, {
      cors: true,
      locationHint: 'sam'
    });
    if (partyResponse) {
      return partyResponse;
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Ni Idea PartyServer Active', { status: 200 });
  }
};
