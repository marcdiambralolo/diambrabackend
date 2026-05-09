import { Injectable, HttpException, HttpStatus, Inject, Logger, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MoneyfusionService {
  private readonly logger = new Logger(MoneyfusionService.name);

  constructor(
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    try {
      const response = await axios.post('https://www.pay.moneyfusion.net/api/pay', dto, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Erreur MoneyFusion API:', error?.message || error);
      // Mode dégradé : stocker la demande pour retry
      await this.storeFailedNotification({ type: 'createPayment', dto, error: error?.message || error });
      throw new HttpException('MoneyFusion indisponible. Paiement mis en attente.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async checkPaymentStatus(token: string) {
    try {
      const response = await axios.get(`https://www.pay.moneyfusion.net/paiementNotif/${token}`);
      return response.data;
    } catch (error) {
      this.logger.error('Erreur MoneyFusion API (checkPaymentStatus):', error?.message || error);
      await this.storeFailedNotification({ type: 'checkPaymentStatus', token, error: error?.message || error });
      throw new HttpException('MoneyFusion indisponible. Vérification en attente.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async handleWebhook(payload: any) {
    // Ici, tu peux traiter et stocker la notification reçue
    // Ex: vérifier le tokenPay, mettre à jour la transaction, etc.
    return { received: true, payload };
  }

  /**
   * Stocke une notification ou requête échouée dans Redis pour retry ultérieur
   */
  async storeFailedNotification(data: any) {
    const key = `moneyfusion:failed:${Date.now()}`;
    await this.redisService.set(key, JSON.stringify(data), 60 * 60 * 24); // 24h TTL
    this.logger.warn(`Notification MoneyFusion stockée pour retry: ${key}`);
  }
}
