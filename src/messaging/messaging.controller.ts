import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations/:userId')
  getConversations(@Param('userId') userId: string) {
    return this.messagingService.getConversations(userId);
  }
 
  /**
   * Récupère tous les messages simples envoyés ou reçus par un utilisateur (inbox style)
   */
  @Get('simple-messages/:userId')
  async getSimpleMessages(@Param('userId') userId: string) {
    return this.messagingService.getSimpleMessagesForUser(userId);
  }

    /**
   * Envoi d'un message simple à un médium (pas de thread)
   */
  @Post('simple-message')
  async sendSimpleMessage(
      @Body() body: {
        toUserId: string;
        text: string;
        subject?: string;
        email?: string;
        phone?: string;
      },
      @Body('fromUserId') fromUserId: string,
  ) {
    // fromUserId peut aussi être récupéré via le JWT si besoin
    return this.messagingService.sendSimpleMessage({
      fromUserId,
         toUserId: body.toUserId,
      text: body.text,
      subject: body.subject,
      email: body.email,
      phone: body.phone,
    });
  }

  @Get('messages/:conversationId')
  getMessages(
    @Param('conversationId') conversationId: string,
    @Body('limit') limit?: number,
    @Body('skip') skip?: number
  ) {
    return this.messagingService.getMessages(conversationId, limit, skip);
  }

  @Post('messages/:conversationId/read')
  markAsRead(
    @Param('conversationId') conversationId: string,
    @Body('userId') userId: string
  ) {
    return this.messagingService.markMessagesAsRead(conversationId, userId);
  }

  @Post('send')
  sendMessage(
    @Body() body: { conversationId: string; from: string; to: string; text: string }
  ) {
    return this.messagingService.sendMessage(body);
  }
}
