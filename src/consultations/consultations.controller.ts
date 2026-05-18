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
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ConsultationsService } from './consultations.service';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
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
    const consultation = await this.consultationsService.create(user._id.toString(), body);
    const normalizedConsultation = this.consultationsService.serializeConsultationForFrontend(consultation);

    return {
      success: true,
      message: 'Consultation créée avec succès',
      consultation: normalizedConsultation,
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
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.consultationsService.findAll({
      page,
      limit,
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
   * GET /consultations/me
   * Récupérer les consultations de l'utilisateur connecté
   */
  @Get('me')
  @ApiOperation({
    summary: "Récupérer les consultations de l'utilisateur connecté",
    description: "Retourne toutes les consultations de l'utilisateur actuellement authentifié.",
  })
  @ApiResponse({ status: 200, description: "Liste des consultations de l'utilisateur connecté." })
  async getMyConsultations(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findByClient(user._id.toString(), { page, limit });
    return {
      success: true,
      userId: user._id,
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
   * GET /consultations/:id/front-data
   * Retourne un payload agrégé pour la page résultat et la messagerie.
   */
  @Get(':id/front-data')
  async getConsultationFrontData(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const { consultation } = await this.consultationsService.findOneForUser(id, user);

    return {
      success: true,
      consultation: this.consultationsService.serializeConsultationForFrontend(consultation as any),
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
  updatePut(@Param('id') id: string, @Body() updateConsultationDto: any) {
    console.log('Received PATCH request for id:', id);
    console.log('Received body:', updateConsultationDto);

    return this.consultationsService.update(id, updateConsultationDto).then((consultation) => ({
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