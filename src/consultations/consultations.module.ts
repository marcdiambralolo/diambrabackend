import { UsersService } from '@/users/users.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeolocationService } from '../common/services/geolocation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalysisQueueService } from './analysis-queue.service';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { DeepseekService } from './deepseek.service';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
 
@Module({
  imports: [
    HttpModule,
    // forwardRef(() => AnalysisModule),
    OfferingsModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
       { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ConsultationsController,],
  providers: [AnalysisQueueService, ConsultationsService, DeepseekService,
    UsersService, GeolocationService,
  ],
  exports: [ConsultationsService, DeepseekService, AnalysisQueueService, UsersService,]
})
export class ConsultationsModule { }
