import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConsultationsService } from '../consultations/consultations.service';
import { RubriqueService } from '../rubriques/rubrique.service';
import { UsersService } from '../users/users.service';

@Processor('user-doors')
@Injectable()
export class DoorsJobProcessor extends WorkerHost {
  private readonly logger = new Logger(DoorsJobProcessor.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly consultationsService: ConsultationsService,
    private readonly rubriqueService: RubriqueService,
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
    // 1. Update user profile
    try {
      console.log('[DoorsJobProcessor] [STEP 1] Mise à jour profil utilisateur', { userId, formData });
      await this.usersService.update(userId, formData);
      job.updateProgress(20);
      console.log('[DoorsJobProcessor] [STEP 1] Profil utilisateur mis à jour');
    } catch (err) {
      this.logger.error('[STEP 1] Erreur update user:', err);
      console.error('[DoorsJobProcessor] [STEP 1] Erreur update user:', err, { userId, formData });
      throw new Error('[STEP 1] Erreur update user: ' + (typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)));
    }

    // 2. Generate sky chart (carte du ciel)
    try {
      console.log('[DoorsJobProcessor] [STEP 2] Appel DeepseekService.generateSkyChart', {
        nom: formData.nom,
        prenoms: formData.prenoms,
        dateNaissance: formData.dateNaissance,
        heureNaissance: formData.heureNaissance,
        villeNaissance: formData.villeNaissance,
        paysNaissance: formData.paysNaissance || formData.country || 'Côte d’Ivoire',
        gender: formData.gender,
        country: formData.country || formData.paysNaissance || 'Côte d’Ivoire',
      });
     
      job.updateProgress(50);
    } catch (err) {
      this.logger.error('[STEP 2] Erreur generateSkyChart:', err);
      console.error('[DoorsJobProcessor] [STEP 2] Erreur generateSkyChart:', err, { userId, formData });
      throw new Error('[STEP 2] Erreur generateSkyChart: ' + (typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)));
    }

 
    try {
      const rubriqueId = '694acf59bd12675f59e7a7f2';
      console.log('[DoorsJobProcessor] [STEP 3] Suppression anciennes consultations pour', { userId, rubriqueId });
      await this.consultationsService.deleteMany({ clientId: userId, rubriqueId });
      console.log('[DoorsJobProcessor] [STEP 3] Anciennes consultations supprimées');
      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      console.log('[DoorsJobProcessor] [STEP 3] Rubrique trouvée:', rubrique);
 
     
      job.updateProgress(100);
       return { success: true, consultations: [] };
    } catch (err) {
      this.logger.error('[STEP 3] Erreur globale génération consultations:', err);
      console.error('[DoorsJobProcessor] [STEP 3] Erreur globale génération consultations:', err, { userId, formData });
      throw err;
    }
  }
}
