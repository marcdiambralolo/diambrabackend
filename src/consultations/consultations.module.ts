import { UsersService } from '@/users/users.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeolocationService } from '../common/services/geolocation.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { GameConfiguration, GameConfigurationSchema } from '@/game/schemas/game-configuration.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: User.name, schema: UserSchema },
      { name: GameConfiguration.name, schema: GameConfigurationSchema },
    ]),
  ],
  controllers: [ConsultationsController,],
  providers: [ConsultationsService, UsersService, GeolocationService,],
  exports: [ConsultationsService, UsersService,]
})
export class ConsultationsModule { }