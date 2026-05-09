import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class AnalysisGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // File d'attente locale pour les événements émis avant l'init
  private pendingEvents: Array<{ consultationId: string; status: string; payload: any }> = [];
  private isReady = false;

  afterInit(server: Server) {
    this.isReady = true;
    // Émettre tous les événements en attente
    if (this.pendingEvents.length > 0) {
      for (const evt of this.pendingEvents) {
        this.server.emit(`analysis:status:${evt.consultationId}`, { consultationId: evt.consultationId, status: evt.status, ...evt.payload });
      }
       this.pendingEvents = [];
    }
  }

  handleConnection(client: any) {
    console.log('[AnalysisGateway] Client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('[AnalysisGateway] Client disconnected:', client.id);
  }

  emitStatus(consultationId: string, status: string, payload: any = {}) {
    if (!this.server || !this.isReady) {
      // Ajoute à la file d'attente locale, mais ne log plus de warning
      this.pendingEvents.push({ consultationId, status, payload });
      // (optionnel) console.debug('[AnalysisGateway] WebSocket server not ready, event queued:', { consultationId, status });
      return;
    }
    this.server.emit(`analysis:status:${consultationId}`, { consultationId, status, ...payload });
  }
}
