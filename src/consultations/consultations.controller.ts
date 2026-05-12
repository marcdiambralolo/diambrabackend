import { UsersService } from '@/users/users.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ConsultationStatus, ConsultationType } from '../common/enums/consultation-status.enum';
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GeolocationService } from '../common/services/geolocation.service';
import { RubriqueService } from '../rubriques/rubrique.service';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisQueueService } from './analysis-queue.service';
import { AnalysisService } from './analysis.service';
import { ConsultationNotificationService } from './consultation-notification.service';
import { ConsultationsService } from './consultations.service';
import { DeepseekService } from './deepseek.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';
import { UpdateChoicePromptDto } from './dto/update-choice-prompt.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly analysisService: AnalysisService,
    private readonly analysisQueueService: AnalysisQueueService,
    private readonly rubriqueService: RubriqueService,
    private readonly deepseekService: DeepseekService,
    private readonly usersService: UsersService,
    private readonly geolocationService: GeolocationService,
    private readonly consultationNotificationService: ConsultationNotificationService,
  ) { }

  @Get('missing-choice-prompts')
  @ApiOperation({
    summary: 'Lister les choiceId sans prompt associé',
    description:
      'Retourne les choiceId de toutes les rubriques qui ne sont pas présents dans la collection prompts.',
  })
  async getMissingChoicePrompts() {
    // Accès natif aux collections MongoDB
    const db = this.consultationsService['consultationModel'].db;
    const rubriques = await db.collection('rubriques').find({}).toArray();
    const allChoiceIds = rubriques
      .flatMap((rub: any) => (rub.consultationChoices || []).map((choice: any) => choice._id?.toString()))
      .filter(Boolean);
    const prompts = await db.collection('prompts').find({}).toArray();
    const promptChoiceIds = new Set(prompts.map((p) => p.choiceId?.toString()));
    const missingChoiceIds = allChoiceIds.filter((id) => !promptChoiceIds.has(id));
    // Récupérer les objets de choix de consultation correspondants
    const missingChoices = [];
    for (const rubrique of rubriques) {
      for (const choice of rubrique.consultationChoices || []) {
        const choiceId = choice._id?.toString();
        if (missingChoiceIds.includes(choiceId)) {
          missingChoices.push({
            ...choice,
            rubriqueId: rubrique._id?.toString?.() || rubrique._id,
            rubriqueTitle: rubrique.title || rubrique.nom || '',
          });
        }
      }
    }
    return {
      success: true,
      missingChoiceIds,
      missingChoices,
      total: missingChoiceIds.length,
    };
  }


  /**
 * GET /consultations/progress
 * Retourne la progression de génération des consultations/analyses pour l'utilisateur courant.
 * À adapter selon la logique métier réelle (ici version simulée/minimale).
 */
  @Get('progress')
  @ApiOperation({ summary: 'Progression de génération des consultations/analyses' })
  @ApiResponse({ status: 200, description: 'Progression actuelle', schema: { example: { percent: 0, message: '' } } })
  async getConsultationsProgress() {
    // TODO: Remplacer par une vraie logique de suivi si disponible
    // Exemple minimal : progression simulée ou à stocker en base/cache côté service
    return {
      percent: 100,
      message: 'Nous finalisons la réalisation de vos opérations. Merci de patienter encore un peu !',
    };
  }

  /**
   * POST /consultations/generate-consultations-for-rubrique
   * Crée une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant (sans générer d'analyse).
   */
  @Post('generate-consultations-for-rubrique')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Créer consultations pour chaque choix d'une rubrique",
    description:
      "Crée une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant, sans générer d'analyse.",
  })
  async generateConsultationsForRubrique(
    @Body('rubriqueId') rubriqueId: string,
    @CurrentUser() user: UserDocument,
  ) {
    try {
      const aspectsTexte = user.aspectsTexte;
      await this.consultationsService.deleteMany({
        clientId: user._id.toString(),
        rubriqueId,
      });

      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      const choixConsultations = rubrique.consultationChoices;
      if (!choixConsultations || choixConsultations.length === 0) {
        throw new HttpException(
          'Aucun choix de consultation pour cette rubrique',
          HttpStatus.NOT_FOUND,
        );
      }

      const results = [];
      for (const choix of choixConsultations) {
        if (!user.paysNaissance) {
          user.paysNaissance = 'Côte d’Ivoire';
        }
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

        const ledto: CreateConsultationDto = {
          rubriqueId,
          choice: choiceDto,
          title: choiceDto.title,
          description: choiceDto.description,
          type: ConsultationType.CINQ_ETOILES,
          formData: {
            nom: user.nom,
            prenoms: user.prenoms,
            dateNaissance: user.dateNaissance,
            heureNaissance: user.heureNaissance,
            villeNaissance: user.villeNaissance,
            paysNaissance: user.paysNaissance || 'Côte d’Ivoire',
            gender: user.gender || user.genre || '',
            email: user.email || '',
            phone: user.phone || '',
            premium: user.premium || false,
            aspectsTexte: aspectsTexte,
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

        const consultation = await this.consultationsService.create(user._id.toString(), ledto);
        results.push({
          consultation: this.consultationsService.serializeConsultationForFrontend(consultation),
        });
      }

      return {
        success: true,
        message: `Consultations créées pour la rubrique ${rubriqueId}`,
        results,
      };
    } catch (err) {
      console.error('[generateConsultationsForRubrique] ERROR:', err);
      throw err;
    }
  }

  @Post('generate-sky-chart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Générer la carte du ciel de l'utilisateur courant",
    description: "Génère et retourne la carte du ciel complète pour l'utilisateur connecté.",
  })
  async generateSkyChartForCurrentUser(@CurrentUser() user: UserDocument) {
    try {
      const formData = this.extractUserFormData(user);
      const { aspectsTexte } = await this.deepseekService.generateSkyChart(formData);

      await this.usersService.update(user._id.toString(), { aspectsTexte: aspectsTexte });

      return {
        success: true,
        aspectsTexte: aspectsTexte,
      };
    } catch (error) {
      console.error('[generateSkyChartForCurrentUser] Erreur:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la génération de la carte du ciel',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /consultations/generate-for-rubrique
   * Génère une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant,
   * puis génère une analyse pour chacune d'elles.
   */
  @Post('generate-for-rubrique')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Générer consultations et analyses pour une rubrique',
    description:
      "Crée une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant, puis génère une analyse pour chacune.",
  })
  async generateForRubrique(
    @Body('rubriqueId') rubriqueId: string,
    @CurrentUser() user: UserDocument,
  ) {
    try {
      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      const choixConsultations = rubrique.consultationChoices;
      if (!choixConsultations || choixConsultations.length === 0) {
        console.warn(
          '[generateForRubrique] Aucun choix de consultation pour cette rubrique:',
          rubriqueId,
        );
        throw new HttpException(
          'Aucun choix de consultation pour cette rubrique',
          HttpStatus.NOT_FOUND,
        );
      }

      const results = [];
      for (const choix of choixConsultations) {
        if (!user.paysNaissance) {
          user.paysNaissance = 'Côte d’Ivoire';
          console.warn('[generateForRubrique] Patch: paysNaissance ajouté pour user:', user._id);
        }
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
        const ledto: CreateConsultationDto = {
          rubriqueId,
          choice: choiceDto,
          title: choiceDto.title,
          description: choiceDto.description,
          // Champs formData pour l'analyse
          formData: {
            nom: user.nom,
            prenoms: user.prenoms,
            dateNaissance: user.dateNaissance,
            heureNaissance: user.heureNaissance,
            villeNaissance: user.villeNaissance,
            paysNaissance: user.paysNaissance,
            genre: user.genre || '',
            email: user.email || '',
            phone: user.phone || '',
            premium: user.premium || false,
            aspectsTexte: user.aspectsTexte || null,
          },
          status: 'PENDING',
          // Ajout d'autres champs optionnels si besoin
          scheduledDate: undefined,
          price: 0,
          alternatives: choiceDto.offering.alternatives,
          requiredOffering: undefined,
          requiredOfferingsDetails: [],
          tierce: undefined,
          analysisNotified: false,
          result: undefined,
        };

        const consultation = await this.consultationsService.create(user._id.toString(), ledto);

        const analysis = await this.analysisService.generateAnalysisWithConsultation(consultation);

        results.push({
          consultation: this.consultationsService.serializeConsultationForFrontend(consultation),
          analysis,
        });
      }
      return {
        success: true,
        message: `Consultations et analyses générées pour la rubrique ${rubriqueId}`,
        results,
      };
    } catch (err) {
      console.error('[generateForRubrique] ERROR:', err);
      throw err;
    }
  }
  private extractUserFormData(user: UserDocument): any {
    const defaultPaysNaissance = user.country || user.paysNaissance || 'Côte d’Ivoire';

    return {
      nom: user.nom || '',
      prenoms: user.prenoms || '',
      dateNaissance: this.formatDate(user.dateNaissance),
      heureNaissance: user.heureNaissance || '',
      villeNaissance: user.villeNaissance || '',
      paysNaissance: defaultPaysNaissance,
      genre: user.genre || user.gender || '',
      email: user.email || '',
    };
  }

  private formatDate(date: any): string {
    if (!date) return '';

    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString().split('T')[0];

    return String(date);
  }

  /**
   * POST /consultations/:id/notify-user
   * Envoyer une notification à l'utilisateur de la consultation
   */
  @Post(':id/notify-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Notifier l'utilisateur de la consultation",
    description: "Envoie une notification à l'utilisateur lié à la consultation.",
  })
  @ApiResponse({ status: 200, description: 'Notification envoyée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async notifyUser(@Param('id') id: string) {
    return this.consultationNotificationService.notifyUser(id);
  }

  /**
   * GET /consultations/rubrique/:rubriqueId
   * Récupérer toutes les consultations de l'utilisateur connecté pour une rubrique donnée (filtrage par rubriqueId)
   */
  @Get('rubrique/:rubriqueId')
  @ApiOperation({
    summary: "Consultations de l'utilisateur connecté par rubriqueId",
    description:
      "Retourne toutes les consultations de l'utilisateur connecté pour une rubrique donnée (filtrage par rubriqueId).",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des consultations de l'utilisateur pour la rubrique.",
  })
  async getMyConsultationsByRubrique(
    @CurrentUser() user: UserDocument,
    @Param('rubriqueId') rubriqueId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findAll({
      clientId: user._id.toString(),
      rubriqueId,
      page,
      limit,
    });
    return {
      success: true,
      userId: user._id.toString(),
      rubriqueId,
      consultations: result.consultations.map((consultation: any) =>
        this.consultationsService.serializeConsultationForFrontend(consultation),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * POST /consultations
   * Créer une consultation pour un utilisateur authentifié
   * L'ID du client est automatiquement récupéré depuis le token JWT
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une consultation (utilisateur connecté)',
    description:
      "Crée une consultation en associant automatiquement l'utilisateur connecté comme client.",
  })
  @ApiResponse({ status: 201, description: 'Consultation créée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async create(@Body() body: any, @CurrentUser() user: UserDocument, @Req() request: any) {

    // Déterminer le pays depuis l'IP ou les données du formulaire
    const country = this.geolocationService.determineCountry(request, body.formData);

    const consultation = await this.consultationsService.create(user._id.toString(), body, country);
    const consultationId = consultation.consultationId || consultation.id || consultation._id?.toString?.();
    const isFreeCinqEtoilesConsultation = consultation.type === ConsultationType.CINQ_ETOILES;
    const analysisJob = isFreeCinqEtoilesConsultation && consultationId
      ? await this.analysisQueueService.enqueueAnalysis(consultationId)
      : null;
    const normalizedConsultation = this.consultationsService.serializeConsultationForFrontend(consultation);

    return {
      success: true,
      message: 'Consultation créée avec succès',
      analysisJob,
      consultation: normalizedConsultation,
    };
  }

  /**
   * POST /consultations/personal
   * Créer une consultation personnelle
   */
  @Post('personal')
  async createPersonalConsultation(@Body() body: any) {
    const consultation = await this.consultationsService.createPersonalConsultation(body);

    return {
      success: true,
      message: 'Consultation personnelle créée avec succès',
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation),
    };
  }

  /**
   * GET /consultations
   * Récupérer toutes les consultations (PUBLIC)
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Lister les consultations',
    description: 'Retourne toutes les consultations (accessible publiquement).',
  })
  @ApiResponse({ status: 200, description: 'Liste des consultations.' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ConsultationStatus,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.consultationsService.findAll({
      page,
      limit,
      status,
      type,
      clientId: userId,
    });

    return {
      success: true,
      consultations: result.consultations.map((consultation: any) =>
        this.consultationsService.serializeConsultationSummaryForFrontend(consultation),
      ),
      total: result.total,
    };
  }

  /**
   * GET /consultations/my
   * Récupérer ses propres consultations
   */
  @Get('my')
  async findMyAnalyses(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const analyses = await this.analysisService.findNotifiedConsultationSummariesByUser(user._id.toString(), { page, limit });
    return {
      success: true,
      userId: user._id.toString(),
      consultations: analyses.items,
      total: analyses.total,
      page: analyses.page,
      limit: analyses.limit,
      totalPages: analyses.totalPages,
    };
  }

  /**
   * GET /consultations/thread/consultant/:consultantId
   * Récupérer le fil de conversation du client connecté avec un consultant
   */
  @Get('thread/consultant/:consultantId')
  async getClientThreadByConsultant(
    @Param('consultantId') consultantId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.consultationsService.getClientThreadByConsultant(user, consultantId);
  }

  /**
   * POST /consultations/thread/consultant/:consultantId/messages
   * Envoyer un message client à un consultant sur la consultation la plus récente
   */
  @Post('thread/consultant/:consultantId/messages')
  sendClientMessageByConsultant(
    @Param('consultantId') consultantId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: SendConsultationMessageDto,
  ) {
    return this.consultationsService.addClientMessageByConsultant(consultantId, user, dto);
  }

  /**
   * GET /consultations/user/:userId
   * Récupérer les consultations d'un utilisateur spécifique (Admin only)
   */
  @Get('user/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({
    summary: "Récupérer les consultations d'un utilisateur",
    description:
      "Retourne toutes les consultations d'un utilisateur spécifique (réservé aux admins).",
  })
  @ApiResponse({ status: 200, description: "Liste des consultations de l'utilisateur." })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  async getUserConsultations(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findByClient(userId, { page, limit });

    return {
      success: true,
      userId,
      consultations: result.consultations.map((consultation: any) =>
        this.consultationsService.serializeConsultationSummaryForFrontend(consultation),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * GET /consultations/analysis/:consultationId
   * Récupérer l'analyse d'une consultation spécifique (PUBLIC)
   */
  @Get('analysis/:consultationId')
  @Public()
  @ApiOperation({
    summary: "Récupérer l'analyse d'une consultation",
    description: "Retourne uniquement l'analyse astrologique d'une consultation donnée.",
  })
  @ApiResponse({ status: 200, description: 'Analyse trouvée.' })
  @ApiResponse({ status: 404, description: 'Analyse non trouvée.' })
  async getAnalysisByConsultationId(@Param('consultationId') consultationId: string) {
    try {
      const analysis = await this.analysisService.findByConsultationId(consultationId);

      if (!analysis) {
        throw new HttpException(
          {
            success: false,
            message: 'Aucune analyse trouvée pour cette consultation',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        consultationId,
        analysis: this.analysisService.serializeAnalysisForFrontend(analysis),
        analysisNotified: analysis.analysisNotified ?? false,
        consultationType: analysis.type,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: "Erreur lors de la récupération de l'analyse",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /consultations/:id/analysis
   * Récupérer l'analyse d'une consultation spécifique - Route alternative (PUBLIC)
   */
  @Get(':id/analysis')
  @Public()
  @ApiOperation({
    summary: "Récupérer l'analyse d'une consultation (route alternative)",
    description: "Retourne l'analyse astrologique d'une consultation donnée.",
  })
  @ApiResponse({ status: 200, description: 'Analyse trouvée.' })
  @ApiResponse({ status: 404, description: 'Analyse non trouvée.' })
  async getAnalysisAlternative(@Param('id') id: string) {
    return this.getAnalysisByConsultationId(id);
  }

  /**
   * PUT /consultations/:id/analysis
   * Sauvegarder/Mettre à jour l'analyse d'une consultation
   */
  @Put(':id/analysis')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_OWN_CONSULTATION)
  @ApiOperation({
    summary: "Sauvegarder l'analyse d'une consultation",
    description: "Sauvegarde ou met à jour l'analyse astrologique d'une consultation.",
  })
  @ApiResponse({ status: 200, description: 'Analyse sauvegardée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async updateAnalysis(@Param('id') id: string, @Body() analysisData: any) {
    try {
      // Vérifier que la consultation existe
      const consultation = await this.consultationsService.findOne(id);

      if (!consultation) {
        throw new HttpException(
          {
            success: false,
            message: 'Consultation non trouvée',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'Analyse sauvegardée avec succès',
        consultationId: id,
        analysis: this.analysisService.serializeAnalysisForFrontend(analysisData),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: "Erreur lors de la sauvegarde de l'analyse",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /consultations/assigned
   * Récupérer les consultations attribuées au consultant connecté
   */
  @Get('assigned')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  findAssignedConsultations(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.consultationsService.findByConsultant(user._id.toString(), { page, limit }).then((result) => ({
      ...result,
      consultations: result.consultations.map((consultation: any) =>
        this.consultationsService.serializeConsultationSummaryForFrontend(consultation),
      ),
    }));
  }

  /**
   * POST /consultations/:id/messages
   * Envoyer un message consultant sur une consultation assignée
   */
  @Post(':id/messages')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_CONSULTATION)
  sendConsultationMessage(
    @Param('id') id: string,
    @Body() dto: SendConsultationMessageDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.consultationsService.addConsultantMessage(id, user, dto);
  }

  /**
   * GET /consultations/:id/messages
   * Récupérer le fil de messages d'une consultation pour le consultant connecté
   */
  @Get(':id/messages')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  getConsultationMessages(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.consultationsService.getConsultationThreadForUser(id, user);
  }

  /**
   * GET /consultations/:id/front-data
   * Retourne un payload agrégé pour la page résultat et la messagerie.
   */
  @Get(':id/front-data')
  async getConsultationFrontData(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const { consultation } = await this.consultationsService.findOneForUser(id, user);
    const analysis = await this.analysisService.findByConsultationId(id);
    const analysisStatus = await this.analysisQueueService.getAnalysisJobStatus(id);
    const messaging = await this.consultationsService.getConsultationThreadForUser(id, user);

    return {
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation as any),
      analysis: this.analysisService.serializeAnalysisForFrontend(analysis),
      analysisStatus: analysisStatus || {
        consultationId: id,
        jobId: id,
        status: null,
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
        dateGeneration: null,
        hasResult: false,
      },
      messaging,
    };
  }

  /**
   * GET /consultations/statistics
   * Récupérer les statistiques des consultations (admin only)
   */
  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_STATISTICS)
  getStatistics() {
    return this.consultationsService.getStatistics();
  }

  /**
   * GET /consultations/:id
   * Récupérer une consultation par ID (PUBLIC)
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une consultation',
    description: 'Récupère une consultation complète avec son analyse (accessible publiquement).',
  })
  @ApiResponse({ status: 200, description: 'Consultation trouvée.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async findOne(@Param('id') id: string) {
    const consultation: any = await this.consultationsService.findOne(id);

    if (
      consultation.type === ConsultationType.CINQ_ETOILES &&
      consultation.analysisNotified !== true &&
      consultation.status !== ConsultationStatus.COMPLETED
    ) {
      try {
        await this.analysisQueueService.enqueueAnalysis(id);
      } catch (error) {
        console.warn(`[consultations.findOne] Impossible de réenfiler l'analyse gratuite ${id}:`, error instanceof Error ? error.message : error);
      }
    }

    const consultationObj = consultation.toObject();

    let alternatives = consultation.alternatives || consultationObj.alternatives || [];
    if (alternatives.length) {
      alternatives = await this.consultationsService.populateAlternatives(alternatives);
    }

    return {
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend({
        ...consultationObj,
        alternatives,
        prompt: consultation.prompt,
      }),
    };
  }

  /**
   * POST /consultations/:id/save-analysis
   * Sauvegarder l'analyse générée (PUBLIC)
   */
  @Post(':id/save-analysis')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Sauvegarder l'analyse",
    description: "Sauvegarde l'analyse astrologique générée en base de données.",
  })
  @ApiResponse({ status: 200, description: 'Analyse sauvegardée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async saveAnalysis(@Param('id') id: string, @Body() saveAnalysisDto: SaveAnalysisDto) {
    await this.consultationsService.saveAnalysis(id, saveAnalysisDto);
    return {
      success: true,
      message: 'Analyse sauvegardée avec succès',
      consultationId: id,
    };
  }

  /**
   * POST /consultations/:id/generate-analysis
   * Générer l'analyse astrologique complète via DeepSeek (Authentifié)
   */
  @Post(':id/generate-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Générer l'analyse astrologique",
    description: 'Génère une analyse astrologique complète via DeepSeek AI.',
  })
  @ApiResponse({ status: 200, description: 'Analyse générée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async generateAnalysis(@Param('id') id: string) {
    try {
      return await this.analysisService.generateAnalysis(id);
    } catch (error) {
      // Log technique côté serveur
      // eslint-disable-next-line no-console
      console.error('[generate-analysis]', error);

      // Si c’est déjà une HttpException, relance-la (garde le code)
      if (error instanceof HttpException) throw error;

      // Sinon, retourne une erreur 200 avec un message structuré
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue: ' + String(error),
        status: 'error',
      };
    }
  }

  @Post(':id/generate-analysis-job')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Enfiler la génération d'analyse",
    description: 'Crée un job Redis pour générer l’analyse de manière asynchrone via un worker.',
  })
  @ApiResponse({ status: 202, description: 'Job de génération créé ou déjà en cours.' })
  async enqueueAnalysisJob(@Param('id') id: string) {
    console.log(`[enqueueAnalysisJob] Enfilage de l'analyse pour consultation ${id}`);
    return this.analysisQueueService.enqueueAnalysis(id);
  }

  @Public()
  @Get(':id/analysis-status')
  @ApiOperation({
    summary: "Lire le statut d'une analyse asynchrone",
    description: 'Retourne le statut courant du job d’analyse et la présence éventuelle du résultat.',
  })
  @ApiResponse({ status: 200, description: 'Statut du job récupéré.' })
  @ApiResponse({ status: 404, description: 'Aucun job ou résultat trouvé pour cette consultation.' })
  async getAnalysisStatus(@Param('id') id: string) {
    const status = await this.analysisQueueService.getAnalysisJobStatus(id);

    if (!status) {
      return {
        consultationId: id,
        jobId: id,
        status: null,
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
        dateGeneration: null,
        hasResult: false,
      };
    }

    return status;
  }

  /**
   * POST /consultations/:id/generate-analysis
   * Générer l'analyse astrologique complète via DeepSeek (Authentifié)
   */
  @Post(':id/generate-analysis-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Générer l'analyse astrologique",
    description: 'Génère une analyse astrologique complète via DeepSeek AI.',
  })
  @ApiResponse({ status: 200, description: 'Analyse générée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async generateAnalysisuser(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    try {
      return await this.analysisService.generateAnalysisuser(id, user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new HttpException(
        {
          success: false,
          error: `Erreur lors de la génération: ${errorMessage}`,
          status: 'error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /consultations/:id/generate-analysis
   * Récupérer l'analyse générée d'une consultation (PUBLIC)
   */
  @Get(':id/generate-analysis')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Récupérer l'analyse générée",
    description: "Retourne l'analyse astrologique si elle a été générée et sauvegardée.",
  })
  @ApiResponse({ status: 200, description: 'Analyse trouvée.' })
  @ApiResponse({ status: 404, description: 'Analyse non trouvée ou pas encore générée.' })
  async getGeneratedAnalysis(@Param('id') id: string) {
    try {
      const analysis = await this.analysisService.findByConsultationId(id);

      if (!analysis) {
        throw new HttpException(
          {
            success: false,
            message: 'Analyse pas encore générée',
            status: 'pending',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        consultationId: id,
        status: ConsultationStatus.COMPLETED,
        analysis: this.analysisService.serializeAnalysisForFrontend(analysis),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[API] Erreur récupération analyse:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Erreur lors de la récupération de l\'analyse',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PATCH /consultations/:id
   * Mettre à jour une consultation
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConsultationDto: UpdateConsultationDto) {
    return this.consultationsService.update(id, updateConsultationDto).then((consultation) => ({
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation as any),
    }));
  }

  /**
   * PUT /consultations/:id
   * Mettre à jour une consultation (alternative PUT)
   */
  @Put(':id')
  updatePut(@Param('id') id: string, @Body() updateConsultationDto: UpdateConsultationDto) {
    return this.consultationsService.update(id, updateConsultationDto).then((consultation) => ({
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation as any),
    }));
  }

  /**
   * PATCH /consultations/:id/assign/:consultantId
   * Attribuer une consultation à un consultant (admin only)
   */
  @Patch(':id/assign/:consultantId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.ASSIGN_CONSULTATION)
  assignToConsultant(
    @Param('id') id: string,
    @Param('consultantId') consultantId: string,
  ) {
    return this.consultationsService.assignToConsultant(id, consultantId).then((consultation) => ({
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation as any),
    }));
  }

  /**
   * DELETE /consultations/:id
   * Supprimer une consultation
   */
  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.DELETE_OWN_CONSULTATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    await this.consultationsService.remove(id, user._id.toString(), user.role!);
  }

  /**
   * PATCH /consultations/:id/mark-notified
   * Marquer une analyse comme notifiée
   */
  @Patch(':id/mark-notified')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Marquer une analyse comme notifiée' })
  @ApiResponse({ status: 200, description: 'Analyse marquée comme notifiée' })
  async markAsNotified(@Param('id') id: string) {
    return this.consultationsService.markAnalysisAsNotified(id);
  }

  /**
   * GET /consultations/:id/is-notified
   * Vérifier si une analyse a été notifiée
   */
  @Get(':id/is-notified')
  @Public()
  @ApiOperation({ summary: 'Vérifier si une analyse a été notifiée' })
  @ApiResponse({ status: 200, description: 'Statut de notification' })
  async isNotified(@Param('id') id: string) {
    const isNotified = await this.consultationsService.isAnalysisNotified(id);
    return { consultationId: id, analysisNotified: isNotified };
  }

  /**
   * GET /consultation-choices/:id/with-prompt
   * Récupère un choix de consultation avec son prompt (si non nul)
   */
  @Get(':id/with-prompt')
  async getChoiceWithPrompt(@Param('id') id: string) {
    // Récupérer toutes les rubriques
    // const rubriques = await this.rubriqueModel.find().populate('categorieId').exec();

    const rubriques = await this.rubriqueService.findAll();
    for (const rubrique of rubriques) {
      if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
        for (const choice of rubrique.consultationChoices) {
          if (choice._id?.toString() === id && choice.prompt) {
            return {
              _id: choice._id,
              title: choice.title,
              description: choice.description,
              frequence: choice.frequence,
              participants: choice.participants,
              offering: choice.offering,
              order: choice.order,
              rubriqueId: rubrique._id,
              rubriqueTitle: rubrique.titre,
              prompt: choice.prompt,
            };
          }
        }
      }
    }
    throw new NotFoundException(
      `Aucun choix de consultation avec l'ID ${id} et un prompt non nul trouvé.`,
    );
  }

  @Patch('choice/:id/prompt')
  async updateChoicePrompt(@Param('id') id: string, @Body() body: UpdateChoicePromptDto) {
    const prompt = (body?.prompt ?? '').trim();

    const choice = await this.rubriqueService.updateChoicePrompt(id, prompt);
    return {
      success: true,
      message: `Prompt mis à jour pour le choix ${id}`,
      choice,
    };
  }
}
