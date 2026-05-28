// src/learning/learning.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { LearningConfigurationController } from './controllers/learning-configuration.controller';
import { LearningConfigurationService } from './services/learning-configuration.service';
import { LearningConfiguration, LearningConfigurationSchema } from './schemas/learning-configuration.schema';
import { Consultation, ConsultationSchema } from '@/consultations/schemas/consultation.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: LearningConfiguration.name, schema: LearningConfigurationSchema },
                  { name: Consultation.name, schema: ConsultationSchema },
        ]),
        ScheduleModule.forRoot(),
    ],
    controllers: [LearningConfigurationController],
    providers: [LearningConfigurationService],
    exports: [LearningConfigurationService],
})
export class LearningModule {}