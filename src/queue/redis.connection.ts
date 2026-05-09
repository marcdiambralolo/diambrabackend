import { ConfigService } from '@nestjs/config';
import { ConnectionOptions } from 'bullmq';

export function getRedisConnection(configService: ConfigService): ConnectionOptions {
  return {
    host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
    port: configService.get<number>('REDIS_PORT', 6379),
    username: configService.get<string>('REDIS_USERNAME') || undefined,
    db: configService.get<number>('REDIS_DB', 0),
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: () => null,
  };
}
