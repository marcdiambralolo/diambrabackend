import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Analysis } from './schemas/analysis.schema';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { AnalysisJobStatus } from '../queue/analysis-queue.constants';

@Injectable()
export class AnalysisDbService {
  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<Analysis>,
  ) { }

  private buildConsultationIdFilter(consultationId: string) {
    return { consultationId };
  }

  async createAnalysis(dto: SaveAnalysisDto): Promise<Analysis | null> {
    const consultationId = dto.consultationId;
    const {
      texte,
      clientId,
      choiceId,
      type,
      status,
      title,
      completedDate,
    } = dto;

    if (!consultationId) {
      throw new Error('consultationId is required to create or update an analysis');
    }

    return this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      {
        $set: {
          consultationId,
          texte,
          clientId,
          choiceId,
          type,
          status,
          title,
          completedDate,
          prompt: dto.prompt,
          dateGeneration: dto.dateGeneration,
          metadata: dto.metadata,
        },
      },
      { new: true, upsert: true },
    );
  }

  /**
   * Marquer une analyse comme notifiée
   */
  async markAnalysisAsNotified(consultationId: string): Promise<Analysis | null> {
    return this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      { $set: { analysisNotified: true } },
      { new: true },
    );
  }

  /**
   * Récupérer une analyse par son consultationID
   */
  async findByConsultationId(consultationId: string): Promise<Analysis | null> {
    return this.analysisModel.findOne(this.buildConsultationIdFilter(consultationId)).exec();
  }

  async findByConsultationIds(consultationIds: string[]): Promise<Analysis[]> {
    if (!consultationIds.length) {
      return [];
    }

    return this.analysisModel.find({ consultationId: { $in: consultationIds } }).lean().exec() as any;
  }

  async updateTexteByConsultationId(consultationId: string, texte: string): Promise<Analysis | null> {
    return this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      { texte },
      { new: true },
    );
  }

  async markQueued(consultationId: string, jobId: string): Promise<Analysis | null> {
    return this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      {
        $set: {
          status: AnalysisJobStatus.QUEUED,
          jobId,
          errorMessage: null,
          finishedAt: null,
        },
      },
      { new: true },
    );
  }

  async markProcessing(
    consultationId: string,
    jobId: string,
    attempts: number,
  ): Promise<Analysis | null> {
    // Log explicite pour la prise en charge par le worker
    console.log(`[analysis-worker] Prise en charge du job pour consultation ${consultationId} (jobId: ${jobId})`);
    return this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      {
        $set: {
          status: AnalysisJobStatus.PROCESSING,
          jobId,
          attempts,
          errorMessage: null,
          startedAt: new Date(),
          finishedAt: null,
        },
      },
      { new: true },
    );
  }

  async markCompleted(consultationId: string, attempts: number): Promise<Analysis | null> {
    const analysis = await this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      {
        $set: {
          status: AnalysisJobStatus.COMPLETED,
          attempts,
          errorMessage: null,
          finishedAt: new Date(),
        },
      },
      { new: true },
    );
    // Synchroniser la consultation liée
    if (analysis && analysis.consultationId) {
      // Import dynamique pour éviter l'injection circulaire
      const { ConsultationsService } = await import('./consultations.service');
      if (typeof ConsultationsService.syncConsultationCompletionFromAnalysisStatic === 'function') {
        // On importe les modèles Mongoose nécessaires
        const { Consultation } = await import('./schemas/consultation.schema');
        await ConsultationsService.syncConsultationCompletionFromAnalysisStatic(
          analysis.consultationId,
          this.analysisModel.db.model('Consultation'),
          this.analysisModel // AnalysisModel
        );
      }
    }
    return analysis;
  }

  async markFailed(
    consultationId: string,
    attempts: number,
    errorMessage: string,
  ): Promise<Analysis | null> {
    return this.analysisModel.findOneAndUpdate(
      this.buildConsultationIdFilter(consultationId),
      {
        $set: {
          status: AnalysisJobStatus.FAILED,
          attempts,
          errorMessage,
          finishedAt: new Date(),
        },
      },
      { new: true },
    );
  }
}
