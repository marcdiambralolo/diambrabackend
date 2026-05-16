import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';

export interface BirthData {
  dateOfBirth?: string;
  nom: string;
  country: string;
  prenoms: string;
  dateNaissance: string;
  heureNaissance: string;
  paysNaissance: string;
  villeNaissance: string;
  gender?: string;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnalysisResult {
  timestamp: Date;
  carteDuCiel: {
    aspectsTexte: string;
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
    cached?: boolean;
  };
}

export interface PlanetPosition {
  planete: string;
  signe: string;
  maison: number;
  retrograde: boolean;
  degre?: number;
}

// Configuration minimale sans cache
const DEFAULT_CONFIG = {
  API_URL: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-chat',
  REQUEST_TIMEOUT: 3000000, // 50 minutes
  MAX_RETRIES: 4,
  RETRY_DELAY: 1000,
  DEFAULT_TEMPERATURE: 0.2,
  DEFAULT_MAX_TOKENS: 4000,
} as const;

// Regex précompilées pour la performance

@Injectable()
export class DeepseekService {

  private readonly logger = new Logger(DeepseekService.name);
  private readonly DEEPSEEK_API_KEY: string;
  private apiCalls = 0;


  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';

    if (!this.DEEPSEEK_API_KEY) {
      this.logger.warn('DEEPSEEK_API_KEY non configurée dans les variables d\'environnement');
    } else {
      this.logger.log('Service DeepSeek initialisé avec succès (sans cache)');
    }
  }
 
  private async callDeepSeekApi(
    messages: DeepSeekMessage[],
    temperature: number = DEFAULT_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: number = DEFAULT_CONFIG.DEFAULT_MAX_TOKENS,
    model: string = DEFAULT_CONFIG.MODEL,
  ): Promise<DeepSeekResponse> {
    if (!this.DEEPSEEK_API_KEY) {
      throw new HttpException('Service DeepSeek non configuré', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const requestId = randomUUID().slice(0, 8);
    const startTime = Date.now();

    this.logger.debug(`[${requestId}] Appel API DeepSeek - Model: ${model}, Tokens: ${maxTokens}, Temp: ${temperature}`);

    const requestBody: DeepSeekRequest = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.DEEPSEEK_API_KEY}`,
        'Accept': 'application/json',
      },
      timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500,
    };

    for (let attempt = 1; attempt <= DEFAULT_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post<DeepSeekResponse>(DEFAULT_CONFIG.API_URL, requestBody, config),
        );

        const duration = Date.now() - startTime;
        this.apiCalls++;

        if (response.status === 200) {
          this.logger.debug(`[${requestId}] Réponse reçue en ${duration}ms - Tokens: ${response.data.usage?.total_tokens || 0}`);
          return response.data;
        }

        // Gestion des erreurs HTTP
        if (response.status === 429) {
          this.logger.warn(`[${requestId}] Rate limit atteint, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
          await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt * 2);
          continue;
        }

        throw this.createHttpException(response);
      } catch (error) {
        if (error instanceof HttpException) throw error;

        const axiosError = error as AxiosError;
        const shouldRetry = await this.handleApiError(axiosError, attempt, requestId);

        if (!shouldRetry) {
          this.logger.error(`[${requestId}] Toutes les tentatives ont échoué`);
          throw new HttpException(
            'Échec de la communication avec DeepSeek API',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }
    }

    throw new HttpException(
      'Échec de la communication avec DeepSeek API après plusieurs tentatives',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Gère les erreurs d'API
   */
  private async handleApiError(error: AxiosError, attempt: number, requestId: string): Promise<boolean> {
    if (error.code === 'ECONNABORTED') {
      this.logger.warn(`[${requestId}] Timeout API, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
    } else if (error.response?.status === 429) {
      this.logger.warn(`[${requestId}] Rate limit, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
      await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt * 3);
      return attempt < DEFAULT_CONFIG.MAX_RETRIES;
    } else {
      this.logger.error(`[${requestId}] Erreur API`, {
        attempt,
        error: error.message,
        status: error.response?.status,
      });
    }

    if (attempt < DEFAULT_CONFIG.MAX_RETRIES) {
      await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt);
      return true;
    }

    return false;
  }

  /**
   * Crée une exception HTTP appropriée
   */
  private createHttpException(response: any): HttpException {
    const status = response.status;
    const data = response.data;

    const statusMap: Record<number, HttpStatus> = {
      401: HttpStatus.UNAUTHORIZED,
      429: HttpStatus.TOO_MANY_REQUESTS,
    };

    return new HttpException(
      `Erreur DeepSeek API: ${status} - ${JSON.stringify(data)}`,
      statusMap[status] || HttpStatus.BAD_GATEWAY,
    );
  }
 
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}