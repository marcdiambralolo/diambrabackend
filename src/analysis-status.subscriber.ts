import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AnalysisGateway } from './analysis.gateway';
import Redis from 'ioredis';

@Injectable()
export class AnalysisStatusSubscriber implements OnModuleInit {
  private readonly logger = new Logger('AnalysisStatusSubscriber');
  private readonly redis: Redis;

  constructor(private readonly gateway: AnalysisGateway) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  onModuleInit() {
    this.logger.log('Subscribing to analysis-status channel...');
    this.redis.subscribe('analysis-status', (err, count) => {
      if (err) {
        this.logger.error('Redis subscribe error', err);
        return;
      }
      this.logger.log(`Subscribed to analysis-status (${count} channels)`);
    });
    this.redis.on('message', (channel, message) => {
      if (channel === 'analysis-status') {
        try {
          const data = JSON.parse(message);
          const { consultationId, status, ...payload } = data;
          this.gateway.emitStatus(consultationId, status, payload);
        } catch (e) {
          this.logger.error('Invalid analysis-status message', e);
        }
      }
    });
  }
}
