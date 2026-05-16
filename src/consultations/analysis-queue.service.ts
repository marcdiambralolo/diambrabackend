import { Injectable, Logger, OnApplicationShutdown, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  ANALYSIS_JOB_NAME,
  ANALYSIS_QUEUE_NAME,
  AnalysisJobData,
  AnalysisJobStatus,
} from '../queue/analysis-queue.constants';
import { getRedisConnection } from '../queue/redis.connection';

@Injectable()
export class AnalysisQueueService implements OnApplicationShutdown {
  private readonly logger = new Logger(AnalysisQueueService.name);
  private queue: Queue<AnalysisJobData> | null = null;
  private redisUnavailableUntil = 0;



  constructor(
    private readonly configService: ConfigService,
  ) {}

  async enqueueAnalysis(consultationId: string) {
    console.log(`[enqueueAnalysis][${consultationId}] je ne comprends pas pourquoi je suis appelé... Enqueue de l'analyse pour consultation ${consultationId}`);
    console.log(`[enqueueAnalysis][${consultationId}] Début de l'enfilement du job`);
    // Ajout de logs détaillés pour chaque étape critique
    const logPrefix = `[enqueueAnalysis][${consultationId}]`;
    if (Date.now() < this.redisUnavailableUntil) {
      console.warn(`${logPrefix} Redis indisponible`);
      this.logger.warn(`${logPrefix} Redis indisponible`);
      throw new ServiceUnavailableException(
        'La file Redis est temporairement indisponible. Réessayez dans quelques secondes.',
      );
    }
 

    let job;
    try {
      job = await this.getQueue().add(
        ANALYSIS_JOB_NAME,
        {
          consultationId,
          requestedAt: new Date().toISOString(),
        },
        {
          jobId: consultationId,
        },
      );
      this.logger.log(`${logPrefix} Job ajouté à la queue: name=${ANALYSIS_JOB_NAME}, jobId=${consultationId}, data=${JSON.stringify({ consultationId })}`);
      console.log(`${logPrefix} Job ajouté à la queue: name=${ANALYSIS_JOB_NAME}, jobId=${consultationId}`);
    } catch (error) {
      this.redisUnavailableUntil = Date.now() + 15000;
      this.logger.error(`${logPrefix} Connexion Redis impossible`, error instanceof Error ? error.stack : undefined);
      console.error(`${logPrefix} Connexion Redis impossible`, error);
      await this.resetQueue();
      throw new ServiceUnavailableException(
        'La file Redis est indisponible. Démarrez Redis avant de lancer un job d’analyse.',
      );
    }

    try {
      this.logger.log(`${logPrefix} Analyse créée/MAJ en base (jobId: ${String(job.id)})`);
      console.log(`${logPrefix} Analyse créée/MAJ en base (jobId: ${String(job.id)})`);
    } catch (error) {
      this.logger.error(`${logPrefix} Erreur lors de la création de l'analyse en base`, error instanceof Error ? error.stack : undefined);
      console.error(`${logPrefix} Erreur lors de la création de l'analyse en base`, error);
      throw error;
    }

    this.logger.log(`${logPrefix} Job ajouté à la file pour la consultation (jobId: ${String(job.id)})`);
    console.log(`${logPrefix} Job ajouté à la file pour la consultation (jobId: ${String(job.id)})`);

    return {
      consultationId,
      jobId: String(job.id),
      status: AnalysisJobStatus.QUEUED,
    };
  }

  async getAnalysisJobStatus(consultationId: string) {
    

    const hasResult = true;
    

    return {
      consultationId,
     
      hasResult,
    };
  }
 

  async onApplicationShutdown() {
    await this.resetQueue();
  }

  private async resetQueue() {
    if (!this.queue) {
      return;
    }

    await this.queue.close();
    this.queue = null;
  }

  private getQueue(): Queue<AnalysisJobData> {
    if (!this.queue) {
      this.queue = new Queue<AnalysisJobData>(ANALYSIS_QUEUE_NAME, {
        connection: getRedisConnection(this.configService),
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });
    }

    return this.queue;
  }

}
