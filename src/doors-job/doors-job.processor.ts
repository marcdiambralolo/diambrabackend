import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ConsultationsService } from '../consultations/consultations.service';
import { RubriqueService } from '../rubriques/rubrique.service';
import { DeepseekService } from '../consultations/deepseek.service';
import { ConsultationType } from '../common/enums/consultation-status.enum';
import { WorkerHost } from '@nestjs/bullmq';

@Processor('user-doors')
@Injectable()
export class DoorsJobProcessor extends WorkerHost {
  private readonly logger = new Logger(DoorsJobProcessor.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly consultationsService: ConsultationsService,
    private readonly rubriqueService: RubriqueService,
    private readonly deepseekService: DeepseekService,
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
    let skyChart;
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
      skyChart = await this.deepseekService.generateSkyChart({
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
      console.log('[DoorsJobProcessor] [STEP 2] Sky chart généré:', skyChart);
    } catch (err) {
      this.logger.error('[STEP 2] Erreur generateSkyChart:', err);
      console.error('[DoorsJobProcessor] [STEP 2] Erreur generateSkyChart:', err, { userId, formData });
      throw new Error('[STEP 2] Erreur generateSkyChart: ' + (typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)));
    }

    // 3. Générer les consultations pour la rubrique (ID hardcodé comme dans le front)
    let results = [];
    try {
      const rubriqueId = '694acf59bd12675f59e7a7f2';
      console.log('[DoorsJobProcessor] [STEP 3] Suppression anciennes consultations pour', { userId, rubriqueId });
      await this.consultationsService.deleteMany({ clientId: userId, rubriqueId });
      console.log('[DoorsJobProcessor] [STEP 3] Anciennes consultations supprimées');
      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      console.log('[DoorsJobProcessor] [STEP 3] Rubrique trouvée:', rubrique);
      const choixConsultations = rubrique.consultationChoices;
      results = [];
      for (const choix of choixConsultations) {
        console.log('[DoorsJobProcessor] [STEP 3] Génération consultation pour choix:', choix);
        const choiceDto = {
          _id: choix._id ?? '',
          prompt: choix.prompt,
          title: choix.title,
          description: choix.description,
          order: choix.order,
          frequence: choix.frequence,
          participants: choix.participants,
          offering: {
            alternatives: (choix.offering?.alternatives || []).map((alt: any) => ({
              _id: alt._id ?? '',
              category: alt.category,
              offeringId: alt.offeringId,
              quantity: alt.quantity ?? 1,
            })),
          },
        };
        const ledto = {
          rubriqueId,
          choice: choiceDto,
          title: choiceDto.title,
          description: choiceDto.description,
          type: ConsultationType.CINQ_ETOILES,
          formData: {
            ...formData,
            paysNaissance: formData.paysNaissance || formData.country || 'Côte d’Ivoire',
            premium: true,
            carteDuCiel: skyChart,
          },
          status: 'PENDING',
          scheduledDate: undefined,
          price: 0,
          alternatives: choiceDto.offering.alternatives,
          requiredOffering: undefined,
          requiredOfferingsDetails: [],
          tierce: undefined,
          analysisNotified: false,
          result: undefined,
          visible: false,
        };
        console.log('[DoorsJobProcessor] [STEP 3] ledto pour création consultation:', ledto);
        try {
          const consultation = await this.consultationsService.create(userId, ledto);
          console.log('[DoorsJobProcessor] [STEP 3] Consultation créée:', consultation);
          results.push({ consultation: this.consultationsService.serializeConsultationForFrontend(consultation) });
        } catch (err) {
          this.logger.error('[STEP 3] Erreur création consultation:', err);
          console.error('[DoorsJobProcessor] [STEP 3] Erreur création consultation:', err, { userId, ledto });
          throw new Error('[STEP 3] Erreur création consultation: ' + (typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)));
        }
      }
      job.updateProgress(100);
      console.log('[DoorsJobProcessor] [STEP 3] Toutes consultations générées, résultat final:', results);
      return { success: true, consultations: results };
    } catch (err) {
      this.logger.error('[STEP 3] Erreur globale génération consultations:', err);
      console.error('[DoorsJobProcessor] [STEP 3] Erreur globale génération consultations:', err, { userId, formData });
      throw err;
    }
  }
}
