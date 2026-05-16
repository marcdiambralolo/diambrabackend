import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GeolocationService } from '../common/services/geolocation.service';
import { UserDocument } from '../users/schemas/user.schema';
import { ConsultationsService } from './consultations.service';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly geolocationService: GeolocationService,
  ) { }


  /**
   * POST /consultations
   * Créer une consultation pour un utilisateur authentifié
   * L'ID du client est automatiquement récupéré depuis le token JWT
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un jeu (utilisateur connecté)',
    description:
      "Crée une consultation en associant automatiquement l'utilisateur connecté comme client.",
  })
  @ApiResponse({ status: 201, description: 'Consultation créée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async create(@Body() body: any, @CurrentUser() user: UserDocument) {

 

    const consultation = await this.consultationsService.create(user._id.toString(), body, "country");
    const normalizedConsultation = this.consultationsService.serializeConsultationForFrontend(consultation);

    return {
      success: true,
      message: 'Consultation créée avec succès',
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
    const messaging = await this.consultationsService.getConsultationThreadForUser(id, user);

    return {
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation as any),
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
      }),
    };
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
}
