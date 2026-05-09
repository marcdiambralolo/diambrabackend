import { Injectable } from '@nestjs/common';
import { UserDocument } from '../users/schemas/user.schema';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';
import { ConsultationsService } from './consultations.service';

@Injectable()
export class ConsultationMessagesService {
  constructor(private readonly consultationsService: ConsultationsService) {}

  getClientThreadByConsultant(user: Pick<UserDocument, '_id'>, consultantId: string) {
    return this.consultationsService.getClientThreadByConsultant(user, consultantId);
  }

  sendClientMessageToConsultant(
    consultantId: string,
    user: Pick<UserDocument, '_id'>,
    dto: SendConsultationMessageDto,
  ) {
    return this.consultationsService.addClientMessageByConsultant(consultantId, user, dto);
  }

  getConsultationThread(
    consultationId: string,
    user: Pick<UserDocument, '_id' | 'role'>,
  ) {
    return this.consultationsService.getConsultationThreadForUser(consultationId, user);
  }

  sendConsultationMessage(
    consultationId: string,
    user: Pick<UserDocument, '_id' | 'role'>,
    dto: SendConsultationMessageDto,
  ) {
    return this.consultationsService.sendConsultationMessageForUser(consultationId, user, dto);
  }
}
