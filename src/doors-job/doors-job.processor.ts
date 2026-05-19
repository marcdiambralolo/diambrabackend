import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { UsersService } from '../users/users.service';

@Processor('user-doors')
@Injectable()
export class DoorsJobProcessor extends WorkerHost {
  private readonly logger = new Logger(DoorsJobProcessor.name);

  constructor(
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { userId, formData } = job.data;
    console.log('[DoorsJobProcessor] Entrée process:', { userId, formData });
    if (!userId) {
      this.logger.error('userId manquant dans le job');
      console.error('[DoorsJobProcessor] userId manquant dans le job:', job.data);
      throw new Error('userId manquant');
    }
    this.logger.log(`Processing user doors job for user ${userId}`);
    console.log('[DoorsJobProcessor] Début process pour user:', userId);

    try {
      console.log('[DoorsJobProcessor] [STEP 1] Mise à jour profil utilisateur', { userId, formData });
      await this.usersService.update(userId, formData);
      job.updateProgress(50);
      console.log('[DoorsJobProcessor] [STEP 1] Profil utilisateur mis à jour');
    } catch (err) {
      this.logger.error('[STEP 1] Erreur update user:', err);
      console.error('[DoorsJobProcessor] [STEP 1] Erreur update user:', err, { userId, formData });
      throw new Error('[STEP 1] Erreur update user: ' + (typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)));
    }

    job.updateProgress(100);
    return { success: true, consultations: [] };
  }
}