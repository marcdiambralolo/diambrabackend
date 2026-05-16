import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DoorsJobProcessor } from './doors-job.processor';
import { DoorsJobService } from './doors-job.service';
import { UsersModule } from '../users/users.module';
import { ConsultationsModule } from '../consultations/consultations.module';
import { RubriqueModule } from '../rubriques/rubrique.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'user-doors',
    }),
    UsersModule,
    ConsultationsModule,
    RubriqueModule,
  ],
  providers: [DoorsJobProcessor, DoorsJobService],
  exports: [DoorsJobService],
})
export class DoorsJobModule {}
