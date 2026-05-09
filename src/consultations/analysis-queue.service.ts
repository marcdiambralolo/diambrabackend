import { Injectable, Logger, OnApplicationShutdown, ServiceUnavailableException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { ConsultationsService } from './consultations.service';
import { AnalysisDbService } from './analysis-db.service';
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

  private hasAnalysisResult(analysis: { texte?: string | null } | null | undefined): boolean {
    return typeof analysis?.texte === 'string' && analysis.texte.trim().length > 0;
  }

  private getAnalysisConsultationId(analysis: { consultationId?: string } | null | undefined): string {
    return String(analysis?.consultationId || '').trim();
  }

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ConsultationsService))
    private readonly consultationsService: ConsultationsService,
    private readonly analysisDbService: AnalysisDbService,
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

    console.log(`${logPrefix} Recherche consultation`);
    this.logger.log(`${logPrefix} Recherche consultation`);
    const consultation = await this.consultationsService.findOne(consultationId);
    console.log(`${logPrefix} Consultation trouvée:`, consultation ? 'OK' : 'NON TROUVÉE');
    this.logger.log(`${logPrefix} Consultation trouvée: ${consultation ? 'OK' : 'NON TROUVÉE'}`);
    const existingAnalysis = await this.analysisDbService.findByConsultationId(consultationId);
    console.log(`${logPrefix} Analyse existante:`, existingAnalysis ? existingAnalysis.status : 'Aucune');
    this.logger.log(`${logPrefix} Analyse existante: ${existingAnalysis ? existingAnalysis.status : 'Aucune'}`);

    if (
      existingAnalysis?.status === AnalysisJobStatus.QUEUED ||
      existingAnalysis?.status === AnalysisJobStatus.PROCESSING ||
      existingAnalysis?.status === AnalysisJobStatus.COMPLETED
    ) {
      // Vérifie la présence réelle du job dans la queue BullMQ
      const bullJob = await this.getQueue().getJob(consultationId);
      if (bullJob) {
        this.logger.log(`${logPrefix} Job déjà présent (statut: ${existingAnalysis.status}, job BullMQ présent)`);
        console.log(`${logPrefix} Job déjà présent (statut: ${existingAnalysis.status}, job BullMQ présent)`);
        return {
          consultationId,
          jobId: existingAnalysis.jobId || consultationId,
          status: existingAnalysis.status,
        };
      } else {
        this.logger.warn(`${logPrefix} Décalage détecté : la base indique QUEUED/PROCESSING/COMPLETED mais aucun job BullMQ. Réinjection forcée.`);
        console.warn(`${logPrefix} Décalage détecté : la base indique QUEUED/PROCESSING/COMPLETED mais aucun job BullMQ. Réinjection forcée.`);
        // On continue pour réenfiler le job
      }
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
      await this.analysisDbService.createAnalysis({
        consultationId,
        texte: existingAnalysis?.texte || '',
        clientId: this.extractUserId(consultation.clientId),
        choiceId: consultation.choice?._id?.toString?.() || consultation.choiceId,
        type: consultation.type,
        status: AnalysisJobStatus.QUEUED,
        title: consultation.title,
        completedDate: consultation.completedDate,
        prompt: consultation.choice?.prompt,
        dateGeneration: existingAnalysis?.dateGeneration,
        metadata: {
          ...(existingAnalysis?.metadata || {}),
          queuedAt: new Date().toISOString(),
        },
        jobId: String(job.id),
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      } as any);
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
    const analysis = await this.analysisDbService.findByConsultationId(consultationId);

    if (!analysis) {
      return null;
    }

    const hasResult = this.hasAnalysisResult(analysis);
    const effectiveStatus = hasResult ? AnalysisJobStatus.COMPLETED : (analysis.status || null);

    // Ajout du log explicite si le job est en cours
    if (effectiveStatus === AnalysisJobStatus.PROCESSING) {
      this.logger.log(`Job en cours pour la consultation ${consultationId} (jobId: ${analysis.jobId || consultationId})`);
    }

    return {
      consultationId,
      jobId: analysis.jobId || consultationId,
      status: effectiveStatus,
      attempts: analysis.attempts || 0,
      errorMessage: analysis.errorMessage || null,
      startedAt: analysis.startedAt || null,
      finishedAt: analysis.finishedAt || null,
      dateGeneration: analysis.dateGeneration || null,
      hasResult,
    };
  }

  async getAnalysisJobStatuses(consultationIds: string[]) {
    const analyses = await this.analysisDbService.findByConsultationIds(consultationIds);
    const byConsultationId = new Map(
      analyses.map((analysis: any) => [this.getAnalysisConsultationId(analysis), analysis]),
    );

    return consultationIds.map((consultationId) => {
      const analysis: any = byConsultationId.get(consultationId);

      if (!analysis) {
        return {
          consultationId,
          jobId: consultationId,
          status: null,
          attempts: 0,
          errorMessage: null,
          startedAt: null,
          finishedAt: null,
          dateGeneration: null,
          hasResult: false,
        };
      }

      const hasResult = this.hasAnalysisResult(analysis as any);
      const effectiveStatus = hasResult ? AnalysisJobStatus.COMPLETED : (analysis.status || null);

      return {
        consultationId,
        jobId: analysis.jobId || consultationId,
        status: effectiveStatus,
        attempts: analysis.attempts || 0,
        errorMessage: analysis.errorMessage || null,
        startedAt: analysis.startedAt || null,
        finishedAt: analysis.finishedAt || null,
        dateGeneration: analysis.dateGeneration || null,
        hasResult,
      };
    });
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

  private extractUserId(clientId: any): string | null {
    if (!clientId) {
      return null;
    }

    if (typeof clientId === 'string') {
      return clientId;
    }

    if (typeof clientId === 'object' && clientId !== null) {
      if ('toHexString' in clientId && typeof clientId.toHexString === 'function') {
        return clientId.toHexString();
      }
      if ('_id' in clientId && clientId._id) {
        return String(clientId._id);
      }
      if (typeof clientId.toString === 'function') {
        return clientId.toString();
      }
    }

    return null;
  }
}
