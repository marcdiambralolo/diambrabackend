import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ConsultationMessagesService } from './consultation-messages.service';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';

@Controller('consultation-messages')
@UseGuards(JwtAuthGuard)
export class ConsultationMessagesController {
  constructor(private readonly consultationMessagesService: ConsultationMessagesService) { }

  @Get('consultants/:consultantId/thread')
  getClientThreadByConsultant(
    @Param('consultantId') consultantId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.consultationMessagesService.getClientThreadByConsultant(user, consultantId);
  }

  @Post('consultants/:consultantId/messages')
  sendClientMessageByConsultant(
    @Param('consultantId') consultantId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: SendConsultationMessageDto,
  ) {
    return this.consultationMessagesService.sendClientMessageToConsultant(consultantId, user, dto);
  }

  @Get('consultations/:consultationId')
  getConsultationThread(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.consultationMessagesService.getConsultationThread(consultationId, user);
  }

  @Post('consultations/:consultationId/messages')
  sendConsultationMessage(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: SendConsultationMessageDto,
  ) {
    return this.consultationMessagesService.sendConsultationMessage(consultationId, user, dto);
  }
}
