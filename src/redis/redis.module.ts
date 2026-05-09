import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisClientModule, REDIS_CLIENT } from './redis-client.module';

@Global()
@Module({
  imports: [RedisClientModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
