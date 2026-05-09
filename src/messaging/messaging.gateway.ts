import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { MessagingService } from './messaging.service';

@WebSocketGateway({ cors: true, namespace: '/ws-messaging' })
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly messagingService: MessagingService) { }

  afterInit() {
    console.log('[ws-messaging] Gateway initialisé');
  }


  handleConnection(client: Socket) {
    // Authentification JWT à la connexion WebSocket
    const token = client.handshake.auth?.token || client.handshake.headers['authorization'];
    if (!token) {
      console.log('[ws-messaging] Connexion refusée : pas de token');
      client.disconnect();
      return;
    }
    try {
      const payload = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'changeme');
      (client as any).user = payload;
      console.log('[ws-messaging] Client authentifié', client.id);
    } catch (e) {
      console.log('[ws-messaging] Connexion refusée : token invalide');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log('[ws-messaging] Client déconnecté', client.id);
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(client: Socket, conversationId: string) {
    client.join(conversationId);
  }

  @SubscribeMessage('leave-conversation')
  async handleLeaveConversation(client: Socket, conversationId: string) {
    client.leave(conversationId);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(client: Socket, data: { conversationId: string; from: string; to: string; text: string }) {
    const msg = await this.messagingService.sendMessage(data);
    this.server.to(data.conversationId).emit('new-message', msg);
    return msg;
  }
}
