import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameConfiguration, GameConfigurationSchema } from './schemas/game-configuration.schema';
import { GameConfigurationService } from './game-configuration.service';
import { GameConfigurationController } from './game-configuration.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameConfiguration.name, schema: GameConfigurationSchema },
    ]),
  ],
  controllers: [GameConfigurationController],
  providers: [GameConfigurationService],
  exports: [GameConfigurationService],
})
export class GameConfigurationModule {}
