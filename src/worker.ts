import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { QueueEvents, Worker } from 'bullmq';
import Redis from 'ioredis';
import 'reflect-metadata';
import { AppModule } from './app.module';
import {
  ANALYSIS_JOB_NAME,
  ANALYSIS_QUEUE_NAME,
  AnalysisJobData,
} from './queue/analysis-queue.constants';
import { getRedisConnection } from './queue/redis.connection';

function isRedisUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('ECONNREFUSED') || message.includes('Connection is closed');
}

let redisStartupErrorLogged = false;

function getRedisEndpoint(configService: ConfigService): string {
  const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
  const port = configService.get<number>('REDIS_PORT', 6379);
  return `${host}:${port}`;
}

function logRedisUnavailableMessage(configService: ConfigService): void {
  if (redisStartupErrorLogged) {
    return;
  }

  redisStartupErrorLogged = true;
  console.error(`[analysis-worker] Démarrage impossible: Redis n'est pas accessible sur ${getRedisEndpoint(configService)}.`);
  console.error('[analysis-worker] Lance Redis localement, exécute npm run redis:start, ou configure REDIS_HOST et REDIS_PORT avant de démarrer le worker.');
}

async function bootstrap() {
  console.log('[analysis-worker] Démarrage du process worker (bootstrap)...');

  let worker: Worker<AnalysisJobData> | null = null;
  let queueEvents: QueueEvents | null = null;
  let app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | null = null;

  try {
    app = await NestFactory.createApplicationContext(AppModule);
    // DEBUG : Affiche la config Redis et le nom de la queue après initialisation de app
    try {
      const configServiceDebug = app.get(ConfigService);
      if (configServiceDebug) {
        const redisConfig = getRedisConnection(configServiceDebug);
        console.log('[DEBUG][worker] ANALYSIS_QUEUE_NAME:', ANALYSIS_QUEUE_NAME);
        console.log('[DEBUG][worker] Redis config:', redisConfig);
      } else {
        console.log('[DEBUG][worker] Impossible d’obtenir ConfigService pour debug.');
      }
    } catch (e) {
      console.error('[DEBUG][worker] Impossible d’afficher la config Redis:', e);
    }
    const configService = app.get(ConfigService);
    const connection = getRedisConnection(configService);
    // On ne peut pas utiliser AnalysisGateway ici (pas de WebSocketServer en mode worker)
    const redisPublisher = new Redis({
      host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: configService.get<number>('REDIS_PORT', 6379),
     });

    // Correction robustesse: toujours un entier > 0
    let concurrencyValue = configService.get('ANALYSIS_WORKER_CONCURRENCY');
    concurrencyValue = parseInt(concurrencyValue ?? '1', 10);
    if (!Number.isFinite(concurrencyValue) || concurrencyValue < 1) concurrencyValue = 1;

    worker = new Worker<AnalysisJobData>(
      ANALYSIS_QUEUE_NAME,
      async (job) => {
        console.log('[DEBUG][worker] Job callback appelé:', {
          id: job.id,
          name: job.name,
          data: job.data,
          attemptsMade: job.attemptsMade,
          expectedJobName: ANALYSIS_JOB_NAME,
        });
        if (job.name !== ANALYSIS_JOB_NAME) {
          console.warn('[analysis-worker] Job ignoré (nom incorrect):', job.name, 'attendu:', ANALYSIS_JOB_NAME);
          return;
        }

        console.log('[DEBUG][worker] markProcessing...');
 
        try {
          console.log('[analysis-worker] Lancement generateAnalysis pour', job.data.consultationId);
          const result =null;
          console.log('[analysis-worker] Résultat generateAnalysis:', result);
 
           setTimeout(() => {
            redisPublisher.publish('analysis-status', JSON.stringify({
              consultationId: job.data.consultationId,
              status: 'COMPLETED',
              step: 'completed',
              jobId: job.id,
            }));
          }, 200); // Légère attente pour garantir la propagation
        } catch (error) {
          console.error('[analysis-worker] Erreur lors de generateAnalysis:', {
            consultationId: job.data.consultationId,
            error,
          });
          
          throw error;
        }
      },
      {
        connection,
        concurrency: concurrencyValue,
      },
    );

    queueEvents = new QueueEvents(ANALYSIS_QUEUE_NAME, { connection });

    worker.on('error', (error) => {
      if (isRedisUnavailableError(error)) {
        logRedisUnavailableMessage(configService);
        return;
      }

      console.error('[analysis-worker] Erreur worker:', error);
    });

    queueEvents.on('error', (error) => {
      if (isRedisUnavailableError(error)) {
        logRedisUnavailableMessage(configService);
        return;
      }

      console.error('[analysis-worker] Erreur queue events:', error);
    });

    await Promise.all([worker.waitUntilReady(), queueEvents.waitUntilReady()]);

    // Événement : job ajouté à la file
    queueEvents.on('waiting', ({ jobId }) => {
      console.log(`[analysis-worker] Job ajouté à la file pour consultation ${jobId}`);
      redisPublisher.publish('analysis-status', JSON.stringify({
        consultationId: jobId,
        status: 'QUEUED',
        step: 'queued',
        jobId,
      }));
    });

    // Événement : job en cours de traitement
    worker.on('active', (job) => {
      console.log(`[analysis-worker] Traitement démarré pour consultation ${job.data.consultationId}`);
      redisPublisher.publish('analysis-status', JSON.stringify({
        consultationId: job.data.consultationId,
        status: 'PROCESSING',
        step: 'processing',
        jobId: job.id,
      }));
    });

    worker.on('ready', () => {
      console.log('[analysis-worker] Worker prêt');
    });

    worker.on('completed', (job) => {
      console.log(`[analysis-worker] Job terminé pour consultation ${job.data.consultationId}`);
    });

    // Événement : job échoué
    worker.on('failed', (job, error) => {
      if (!job) {
        console.error('[analysis-worker] Job échoué : job est undefined', error?.message);
        return;
      }
      const consultationId = job.data?.consultationId || 'unknown';
      console.error(`[analysis-worker] Job échoué pour consultation ${consultationId}:`, error?.message);
      redisPublisher.publish('analysis-status', JSON.stringify({
        consultationId,
        status: 'FAILED',
        step: 'failed',
        jobId: job.id,
        error: error?.message,
      }));
    });

    const shutdown = async (signal: string) => {
      console.log(`[analysis-worker] Arrêt demandé (${signal})`);
      await worker?.close();
      await queueEvents?.close();
      await app?.close();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    console.log('[analysis-worker] En écoute sur la queue analysis-generation');
  } catch (error) {
    if (isRedisUnavailableError(error)) {
      if (app) {
        logRedisUnavailableMessage(app.get(ConfigService));
      } else {
        console.error('[analysis-worker] Démarrage impossible: Redis n\'est pas accessible sur 127.0.0.1:6379.');
        console.error('[analysis-worker] Lance Redis localement, exécute npm run redis:start, ou configure REDIS_HOST et REDIS_PORT avant de démarrer le worker.');
      }
      process.exit(1);
      return;
    } else {
      console.error('[analysis-worker] Erreur fatale au démarrage:', error);
    }

    await worker?.close().catch(() => undefined);
    await queueEvents?.close().catch(() => undefined);
    await app?.close().catch(() => undefined);
    process.exit(1);
  }
}

void bootstrap();