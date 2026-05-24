import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameConfiguration, GameConfigurationSchema } from './schemas/game-configuration.schema';
import { GameConfigurationService } from './game-configuration.service';
import { GameConfigurationController } from './game-configuration.controller';
import { Consultation, ConsultationSchema } from '@/consultations/schemas/consultation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameConfiguration.name, schema: GameConfigurationSchema },
      { name: Consultation.name, schema: ConsultationSchema },
    ]),
  ],
  controllers: [GameConfigurationController],
  providers: [GameConfigurationService],
  exports: [GameConfigurationService],
})
export class GameConfigurationModule {}
