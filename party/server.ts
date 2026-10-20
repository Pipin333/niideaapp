import type * as Party from 'partykit/server';
import { RoomMatchEngine } from '../src/domain/room-engine';
import type { ClientCommand } from '../src/domain/room-types';

/**
 * Servidor de sala sobre PartyKit y Cloudflare Durable Objects.
 * Mantiene el estado en memoria por sala, aplica proyeccion asimetrica por socket
 * y delega las alarmas Anti-AFK (15s) a `storage.setAlarm()`.
 */
export default class NiIdeaPartyServer implements Party.Server {
  private readonly engine: RoomMatchEngine;
  private readonly socketTokens = new Map<string, string>();

  /**
   * Inicializa el actor Durable Object para la sala solicitada.
   * @param room Instancia de sala provista por PartyKit.
   */
  constructor(readonly room: Party.Room) {
    const cleanId = (room.id || 'K9X2').slice(0, 4).padEnd(4, 'X');
    this.engine = new RoomMatchEngine(cleanId);
  }

  /**
   * Gestiona la recepcion de mensajes WebSocket desde los contendientes.
   * @param message Payload JSON con el comando del cliente.
   * @param sender Conexion WebSocket emisora.
   */
  public async onMessage(message: string, sender: Party.Connection): Promise<void> {
    try {
      const command = JSON.parse(message) as ClientCommand;
      if (command.sessionToken) {
        this.socketTokens.set(sender.id, command.sessionToken);
      }

      this.engine.handleCommand(command, Date.now());
      await this.scheduleNextAlarm();
      this.broadcastAsymmetricProjections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Comando no reconocido.';
      sender.send(
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
  public onClose(connection: Party.Connection): void {
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
  public async onAlarm(): Promise<void> {
    const mutated = this.engine.evaluateAlarms(Date.now());
    if (mutated) {
      this.broadcastAsymmetricProjections();
    }
    await this.scheduleNextAlarm();
  }

  private async scheduleNextAlarm(): Promise<void> {
    const nextAlarm = this.engine.getNextAlarmTimestamp();
    if (nextAlarm !== null) {
      await this.room.storage.setAlarm(nextAlarm);
    }
  }

  private broadcastAsymmetricProjections(): void {
    for (const connection of this.room.getConnections()) {
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
