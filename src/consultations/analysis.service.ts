import { UserDocument } from '@/users/schemas/user.schema';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { AnalysisDbService } from './analysis-db.service';
import { AnalysisPromptService } from './analysisprompt.service';
import { ConsultationsService } from './consultations.service';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Injectable()
export class AnalysisService {
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly DEFAULT_TEMPERATURE = 0.8;
  private readonly DEFAULT_MAX_TOKENS = 4500;
  private readonly DEFAULT_MODEL = 'deepseek-chat';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly RETRYABLE_ERROR_CODES = new Set([
    'ECONNABORTED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ERR_NETWORK',
    'EAI_AGAIN',
  ]);

  constructor(
    private consultationsService: ConsultationsService,
    private userConsultationChoiceService: UserConsultationChoiceService,
    private analysisDbService: AnalysisDbService,
    private analysisPromptService: AnalysisPromptService,
  ) { }

  private extractAnalysisConsultationId(analysis: any): string {
    return String(analysis?.consultationId || '').trim();
  }

  serializeAnalysisForFrontend(analysis: any) {
    if (!analysis) {
      return null;
    }

    const plain = typeof analysis?.toObject === 'function' ? analysis.toObject() : analysis;
    const analysisId = plain?._id?.toString?.() || plain?.id?.toString?.() || '';
    const consultationId = this.extractAnalysisConsultationId(plain);

    return {
      ...plain,
      id: analysisId,
      analysisId,
      consultationId,
      texte: plain.texte || '',
      dateGeneration: plain?.dateGeneration || plain?.createdAt || null,
      status: plain.status || 'COMPLETED',
    };
  }

  private buildFallbackConsultationSummaryFromAnalysis(analysis: any) {
    const consultationId = this.extractAnalysisConsultationId(analysis);

    return {
      _id: analysis?._id?.toString?.() || analysis?._id || consultationId,
      id: consultationId,
      consultationId,
      client: null,
      title: analysis?.title || 'Consultation',
      titre: analysis?.title || 'Consultation',
      description: '',
      type: analysis?.type || null,
      status: ConsultationStatus.COMPLETED,
      normalizedStatus: ConsultationStatus.COMPLETED,
      dateGeneration: analysis?.dateGeneration || analysis?.createdAt || null,
      analysisId: analysis?._id?.toString?.() || analysis?._id,
      texte: analysis?.texte,
      analysisNotified: analysis?.analysisNotified ?? true,
      ui: {
        normalizedStatus: ConsultationStatus.COMPLETED,
        state: 'ready',
        statusLabel: 'Analyse prete',
        statusTone: 'emerald',
        helperText: "Ouvre l'analyse ou telecharge le PDF si disponible.",
        canView: true,
        canDownload: false,
        viewLabel: "Voir l'analyse",
        consultButtonStatus: 'VOIR_L_ANALYSE',
        isFreeConsultation: false,
        effectiveIsPaid: true,
        requiresPayment: false,
        hasAnalysisArtifacts: true,
        isPending: false,
        isCompleted: true,
      },
    };
  }

  private async mapAnalysesToConsultationSummaries(analyses: any[]) {
    const consultationIds = analyses
      .map((analysis: any) => this.extractAnalysisConsultationId(analysis))
      .filter(Boolean);

    const consultations = await this.consultationsService.findManyByIds(consultationIds);
    const consultationsById = new Map(
      consultations.map((consultation: any) => [consultation._id.toString(), consultation]),
    );

    return analyses
      .map((analysis: any) => {
        const consultationId = this.extractAnalysisConsultationId(analysis);
        const consultation = consultationsById.get(consultationId);

        if (!consultation) {
          return this.buildFallbackConsultationSummaryFromAnalysis(analysis);
        }

        return {
          ...this.consultationsService.serializeConsultationSummaryForFrontend(consultation),
          analysisId: analysis?._id?.toString?.() || analysis?._id,
          texte: analysis?.texte,
          analysisNotified: analysis?.analysisNotified ?? true,
          analysisDateGeneration: analysis?.dateGeneration || analysis?.createdAt || null,
        };
      })
      .filter(Boolean);
  }

  async findNotifiedAnalysesByUser(userId: string, opts?: { page?: number; limit?: number }) {
    const page = opts?.page && opts.page > 0 ? Number(opts.page) : 1;
    const limit = opts?.limit && opts.limit > 0 ? Number(opts.limit) : 10;
    const skip = (page - 1) * limit;
    const filter = {
      analysisNotified: true,
      $or: [
        { clientId: userId },
        { clientId: { $regex: userId } }
      ]
    };

    const [items, total] = await Promise.all([
      this.analysisDbService['analysisModel']
        .find(filter)
        .sort({ dateGeneration: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.analysisDbService['analysisModel'].countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNotifiedConsultationSummariesByUser(userId: string, opts?: { page?: number; limit?: number }) {
    const analyses = await this.findNotifiedAnalysesByUser(userId, opts);
    const items = await this.mapAnalysesToConsultationSummaries(analyses.items);

    return {
      items,
      total: analyses.total,
      page: analyses.page,
      limit: analyses.limit,
      totalPages: analyses.totalPages,
    };
  }

  async findConsultationSummariesByChoiceForUser(userId: string, choiceId: string) {
    const analyses = await this.analysisDbService['analysisModel']
      .find({ choiceId, clientId: userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const items = await this.mapAnalysesToConsultationSummaries(analyses);

    return {
      items,
      total: items.length,
    };
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableAxiosError(error: AxiosError): boolean {
    if (error.response?.status) {
      return error.response.status === 408 || error.response.status === 429 || error.response.status >= 500;
    }

    return !!error.code && this.RETRYABLE_ERROR_CODES.has(error.code);
  }

  private buildDeepSeekHttpException(error: AxiosError): HttpException {
    const status = error.response?.status;
    const errorResponse = error.response?.data;
    const errorMessage = typeof errorResponse === 'string' ? errorResponse : JSON.stringify(errorResponse);

    if (status === 401) {
      return new HttpException('Authentification DeepSeek invalide', HttpStatus.UNAUTHORIZED);
    }

    if (status === 429) {
      return new HttpException('DeepSeek est temporairement saturé, veuillez réessayer', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (status) {
      return new HttpException(
        `DeepSeek a répondu avec le statut ${status}${errorMessage ? `: ${errorMessage}` : ''}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (error.code === 'ECONNABORTED') {
      return new HttpException('Délai dépassé lors de l\'appel à DeepSeek', HttpStatus.BAD_GATEWAY);
    }

    return new HttpException(
      `Erreur réseau lors de l'appel à DeepSeek: ${error.message || error.code || 'erreur inconnue'}`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async callDeepSeekAPI(
    systemPrompt: string,
    userPrompt: string,
    consultationId?: string
  ): Promise<any> {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      throw new HttpException('Clé API DeepSeek non configurée', HttpStatus.INTERNAL_SERVER_ERROR);
    }



    if (!systemPrompt || !userPrompt) {
      throw new HttpException(
        `Impossible d'appeler DeepSeek : systemPrompt ou userPrompt manquant ou vide. (systemPrompt: '${systemPrompt}', userPrompt: '${userPrompt}')`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const requestBody = {
        model: this.DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.DEFAULT_TEMPERATURE,
        max_tokens: this.DEFAULT_MAX_TOKENS,
      };

      let data: any;
      let lastAxiosError: AxiosError | null = null;

      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const response = await axios.post(this.DEEPSEEK_API_URL, requestBody, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              'Accept': 'application/json',
            },
            timeout: 300000,
            validateStatus: (status) => status < 500,
          });

          if (response.status === 429) {
            if (attempt === this.MAX_RETRIES) {
              throw new HttpException('DeepSeek est temporairement saturé, veuillez réessayer', HttpStatus.TOO_MANY_REQUESTS);
            }

            console.warn(`[DeepSeek] Rate limit reçu, nouvelle tentative ${attempt}/${this.MAX_RETRIES}`);
            await this.delay(this.RETRY_DELAY_MS * attempt * 2);
            continue;
          }

          if (response.status >= 400) {
            throw this.buildDeepSeekHttpException({
              response,
              message: `HTTP ${response.status}`,
              name: 'AxiosError',
              config: response.config,
              isAxiosError: true,
              toJSON: () => ({}),
            } as AxiosError);
          }

          data = response.data;
          break;
        } catch (err: any) {
          if (err instanceof HttpException) {
            throw err;
          }

          if (!(err instanceof AxiosError)) {
            console.error('[DeepSeek] Erreur lors de l\'appel à DeepSeek:', err);
            throw new HttpException(`Erreur réseau lors de l'appel à DeepSeek: ${err.message}`, HttpStatus.BAD_GATEWAY);
          }

          lastAxiosError = err;
          const errorResponse = err.response?.data;
          const errorMessage = typeof errorResponse === 'string' ? errorResponse : JSON.stringify(errorResponse);
          console.error(
            `[DeepSeek] Tentative ${attempt}/${this.MAX_RETRIES} échouée:`,
            err.message,
            'Code:',
            err.code,
            'Réponse brute:',
            errorMessage,
          );

          if (!this.isRetryableAxiosError(err) || attempt === this.MAX_RETRIES) {
            throw this.buildDeepSeekHttpException(err);
          }

          await this.delay(this.RETRY_DELAY_MS * attempt);
        }
      }

      if (!data) {
        throw this.buildDeepSeekHttpException(
          lastAxiosError ??
          ({
            message: 'Aucune réponse retournée par DeepSeek',
            name: 'AxiosError',
            isAxiosError: true,
            toJSON: () => ({}),
          } as AxiosError),
        );
      }

      const aiResponse = data.choices?.[0]?.message?.content || '';

      try {
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/i, '').replace(/```$/, '').trim();
        }

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        return {
          consultationId,
          ...(jsonMatch ? JSON.parse(jsonMatch[0]) : { texte: cleaned }),
          dateGeneration: new Date().toISOString(),
        };
      } catch (e) {
        console.warn('[DeepSeek] Erreur parsing JSON dans le message AI:', e, 'Texte:', aiResponse);
        return {
          consultationId,
          texte: aiResponse,
          dateGeneration: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[DeepSeek] Erreur lors de l’appel API:', error);
      throw new HttpException(
        `Échec de l'appel à l'API DeepSeek: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async recordUserChoices(consultation: any, userId: string): Promise<void> {
    if (!consultation.choice?._id) return;

    const { choice } = consultation;

    await this.userConsultationChoiceService.recordChoicesForConsultation(
      userId,
      consultation._id?.toString() || '',
      [{
        title: choice.title,
        choiceId: choice._id,
        frequence: choice.frequence || 'LIBRE',
        participants: choice.participants || 'SOLO',
      }]
    );
  }

  async findByConsultationId(consultationId: string): Promise<any> {
    return this.analysisDbService.findByConsultationId(consultationId);
  }

  //   private async buildUserPrompt(formData: any): Promise<string> {
  //     return await this.analysisPromptService.buildUserPromptByType(formData);
  //   }

  private extractUserId(clientId: any): string | null {
    if (!clientId) return null;

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

  private async saveAnalysisResults(
    consultationId: string,
    analysisData: any,
    monprompt: string
  ): Promise<void> {
    const consultation = await this.consultationsService.findOne(consultationId);
    if (!consultation) {
      console.warn(`[AnalysisService] Consultation non trouvée pour enrichir l'analyse (${consultationId})`);
      return;
    }

    const clientId = this.extractUserId(consultation.clientId);
 
    const analysisToSave = {
      consultationId,
      texte: analysisData.texte,
      clientId,
      choiceId: consultation.choice?._id?.toString?.() || consultation.choice?._id,
      type: consultation.type,
      status: ConsultationStatus.COMPLETED,
      title: consultation.title,
      completedDate: consultation.completedDate,
      prompt: monprompt,
      dateGeneration: analysisData.dateGeneration,
    };

    await this.analysisDbService.createAnalysis(analysisToSave as any);
  }

  async generateAnalysis(id: string) {
    try {
      const consultation = await this.consultationsService.findOne(id);
      return this.generateAnalysisForConsultation(consultation);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: `Erreur lors de la génération: ${error.message}`,
          status: 'error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateAnalysisWithConsultation(consultation: any) {
    try {
      return this.generateAnalysisForConsultation(consultation);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: `Erreur lors de la génération: ${error.message}`,
          status: 'error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateAnalysisuser(id: string, user: UserDocument) {
    try {
      const consultation = await this.consultationsService.findOne(id);
      if (!consultation) {
        throw new HttpException('Consultation non trouvée', HttpStatus.NOT_FOUND);
      }

      const systemPrompt = consultation.choice?.prompt || consultation.title;
      const userPrompt = await this.analysisPromptService.buildUserPromptByType(consultation);
      const analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt, id);
      const analysisDocument = {
        consultationId: id,
        ...analyseComplete,
        dateGeneration: new Date().toISOString(),
        prompt: systemPrompt,
      };

      await this.saveAnalysisResults(id, analysisDocument, systemPrompt);
      const updatedConsultation = await this.consultationsService.update(id, {
        status: ConsultationStatus.COMPLETED,
        prompt: systemPrompt,
      });

      const userId = this.extractUserId(consultation.clientId);
      if (userId) {
        await this.recordUserChoices(updatedConsultation, userId);
      }

      return {
        success: true,
        consultationId: id,
        status: ConsultationStatus.COMPLETED,
        message: 'Analyse générée avec succès',
        consultation: updatedConsultation,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: `Erreur lors de la génération: ${error.message}`,
          status: 'error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async generateAnalysisForConsultation(consultation: any) {
     if (!consultation) {
      console.error('[analysis-service] Consultation non trouvée pour analyse');
      throw new HttpException('Consultation non trouvée', HttpStatus.NOT_FOUND);
    }

    const consultationId = consultation._id?.toString?.() || consultation.id?.toString?.() || String(consultation._id || consultation.id);
    const userId = this.extractUserId(consultation.clientId);
    const systemPrompt = consultation.choice?.prompt || consultation.title;
    const carteDuCiel = consultation.formData.carteDuCiel;
    const finalPrompt = systemPrompt.replace('[CARTE DU CIEL]', carteDuCiel);
    try {
      const userPrompt = await this.analysisPromptService.buildUserPromptByType(consultation);
      console.log('[analysis-service] Appel DeepSeek pour', consultationId);
  
      const analyseComplete = await this.callDeepSeekAPI(finalPrompt, userPrompt, consultationId);
      const analysisDocument = {
        consultationId,
        ...analyseComplete,
        dateGeneration: new Date().toISOString(),
        prompt: systemPrompt,
      };

      await this.saveAnalysisResults(consultationId, analysisDocument, systemPrompt);
      const updatedConsultation = await this.consultationsService.update(consultationId, {
        status: ConsultationStatus.COMPLETED,
        prompt: systemPrompt,
      });

      if (userId) {
        await this.recordUserChoices(updatedConsultation, userId);
      }

       return {
        success: true,
        consultationId,
        status: ConsultationStatus.COMPLETED,
        message: 'Analyse générée avec succès',
        analysis: this.serializeAnalysisForFrontend(analysisDocument),
        consultation: updatedConsultation,
      };
    } catch (err) {
      console.error('[analysis-service] Erreur lors de la génération de l\'analyse pour', consultationId, err);
      throw err;
    }
  }
}
