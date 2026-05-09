
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ConsultationsService } from '../consultations/consultations.service';
import { RubriqueService } from '../rubriques/rubrique.service';
import { DeepseekService } from '../consultations/deepseek.service';
import { ConsultationType } from '../common/enums/consultation-status.enum';

@Controller('users/me/doors-job')
@UseGuards(JwtAuthGuard)
export class DoorsJobController {
  constructor(
    private readonly usersService: UsersService,
    private readonly consultationsService: ConsultationsService,
    private readonly rubriqueService: RubriqueService,
    private readonly deepseekService: DeepseekService,
  ) { }

  @Post()
  async processJob(@CurrentUser() user: any, @Body() body: any) {
    const userId = String(user?._id || user?.id || user);
    const formData = body.formData;
    try {

      const skyChart = await this.deepseekService.generateSkyChart({
        nom: formData.nom,
        prenoms: formData.prenoms,
        dateNaissance: formData.dateNaissance,
        heureNaissance: formData.heureNaissance,
        villeNaissance: formData.villeNaissance,
        paysNaissance: formData.paysNaissance || formData.country || 'Côte d’Ivoire',
        gender: formData.gender,
        country: formData.country || formData.paysNaissance || 'Côte d’Ivoire',
      });

      await this.usersService.update(userId, { ...formData, premium: true, aspectsTexte: skyChart.aspectsTexte, aspectsTexteBrute: skyChart.aspectsTexte });
      await this.consultationsService.deleteMany({ clientId: userId, rubriqueId: '694acf59bd12675f59e7a7f2' });
      const rubrique = await this.rubriqueService.findOne('694acf59bd12675f59e7a7f2');
      const choixConsultations = rubrique.consultationChoices;
      const results = [];
      for (const choix of choixConsultations) {
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
          rubriqueId: '694acf59bd12675f59e7a7f2',
          choice: choiceDto,
          title: choiceDto.title,
          description: choiceDto.description,
          type: ConsultationType.CINQ_ETOILES,
          formData: {
            ...formData,
            paysNaissance: formData.paysNaissance || formData.country || 'Côte d’Ivoire',
            premium: true,
            carteDuCiel: skyChart.aspectsTexte,
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
        const consultation = await this.consultationsService.create(userId, ledto);
        results.push({ consultation: this.consultationsService.serializeConsultationForFrontend(consultation) });
      }
      return { success: true, consultations: results };
    } catch (error) {
      return { success: false, error: typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error) || 'Erreur inconnue' };
    }
  }
}
