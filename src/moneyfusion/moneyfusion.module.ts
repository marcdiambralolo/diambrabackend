import { Module, forwardRef } from '@nestjs/common';
import { MoneyfusionController } from './moneyfusion.controller';
import { MoneyfusionService } from './moneyfusion.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [forwardRef(() => RedisModule)],
  controllers: [MoneyfusionController],
  providers: [MoneyfusionService],
})
export class MoneyfusionModule {}
