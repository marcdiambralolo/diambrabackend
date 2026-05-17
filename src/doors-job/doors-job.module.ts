import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DoorsJobProcessor } from './doors-job.processor';
import { DoorsJobService } from './doors-job.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'user-doors',
    }),
    UsersModule,
  ],
  providers: [DoorsJobProcessor, DoorsJobService],
  exports: [DoorsJobService],
})
export class DoorsJobModule {}