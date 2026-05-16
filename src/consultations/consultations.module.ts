import { UsersService } from '@/users/users.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeolocationService } from '../common/services/geolocation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { RubriqueModule } from '../rubriques/rubrique.module';
import { Rubrique, RubriqueSchema } from '../rubriques/rubrique.schema';
import { RubriqueService } from '../rubriques/rubrique.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalysisQueueService } from './analysis-queue.service';
import { ConsultationChoiceController } from './consultation-choice.controller';
import { ConsultationChoiceService } from './consultation-choice.service';
import { ConsultationMessagesController } from './consultation-messages.controller';
import { ConsultationMessagesService } from './consultation-messages.service';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { DeepseekService } from './deepseek.service';
import { ConsultationChoiceSchema } from './schemas/consultation-choice.schema';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { UserConsultationChoice, UserConsultationChoiceSchema } from './schemas/user-consultation-choice.schema';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Module({
  imports: [
    HttpModule,
    // forwardRef(() => AnalysisModule),
    OfferingsModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: UserConsultationChoice.name, schema: UserConsultationChoiceSchema },
      { name: 'ConsultationChoice', schema: ConsultationChoiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Rubrique.name, schema: RubriqueSchema },
    ]),
    NotificationsModule,
    RubriqueModule,
  ],
  controllers: [ConsultationsController, ConsultationMessagesController, ConsultationChoiceController,],
  providers: [AnalysisQueueService, ConsultationMessagesService, ConsultationsService, DeepseekService,
    UserConsultationChoiceService, 
    ConsultationChoiceService, RubriqueService, UsersService, GeolocationService,
  ],
  exports: [ConsultationsService, ConsultationMessagesService, DeepseekService, UserConsultationChoiceService, AnalysisQueueService,  ConsultationChoiceService, RubriqueService, UsersService,]
})
export class ConsultationsModule { }
