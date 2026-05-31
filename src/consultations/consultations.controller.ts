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

  // ============================================================================
  // ROUTES AVEC MOTS-CLÉS FIXES (sans paramètres dynamiques)
  // ============================================================================

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
      consultations: result.consultations,
      editions: result.editions, // 🔥 Ajout des informations des éditions
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
  * GET /consultations/me/by-idjeu/:idjeu
  * Récupérer les consultations de l'utilisateur connecté par idjeu
  */
  @Get('me/by-idjeu/:idjeu')
  @ApiOperation({
    summary: "Récupérer les consultations de l'utilisateur connecté par idjeu",
    description: "Retourne les consultations de l'utilisateur authentifié qui correspondent à un idjeu spécifique.",
  })
  @ApiResponse({ status: 200, description: 'Liste des consultations trouvées.' })
  @ApiResponse({ status: 404, description: 'Aucune consultation trouvée.' })
  async getMyConsultationsByidjeu(
    @CurrentUser() user: UserDocument,
    @Param('idjeu') idjeu: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findByClientAndIdjeu(
      user._id.toString(),
      idjeu,
      { page, limit }
    );

    return {
      success: true,
      userId: user._id,
      idjeu,
      consultations: result.consultations,
      edition: {  // 🔥 Ajout des informations de l'édition
        id: result.edition!._id.toString(),
        startDate: result.edition!.startgameDate,
        endDate: result.edition!.endgameDate,
        status: result.edition!.status,
        isActive: result.edition!.isActive,
        winningCombination: result.edition!.winningCombination || null,
      },
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ============================================================================
  // ROUTES AVEC PARAMÈTRES NOMMÉS (spécifiques)
  // ============================================================================

  /**
   * GET /consultations/by-idjeu/:idjeu
   * Récupérer les consultations par idjeu
   */
  @Get('by-idjeu/:idjeu')
  @Public()
  @ApiOperation({
    summary: 'Récupérer les consultations par idjeu',
    description: 'Retourne toutes les consultations ayant un idjeu spécifique.',
  })
  @ApiResponse({ status: 200, description: 'Liste des consultations trouvées.' })
  @ApiResponse({ status: 404, description: 'Aucune consultation trouvée.' })
  async findByidjeu(
    @Param('idjeu') idjeu: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findByIdjeu(idjeu, { page, limit });
    return {
      success: true,
      idjeu,
      consultations: result.consultations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
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
      consultations: result.consultations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ============================================================================
  // ROUTES AVEC PARAMÈTRE DYNAMIQUE :id (avec suffixe)
  // ============================================================================

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
      consultation,
    };
  }

  // ============================================================================
  // ROUTES GÉNÉRIQUES (sans paramètres)
  // ============================================================================

  /**
   * POST /consultations
   * Créer une consultation pour un utilisateur authentifié
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

    return {
      success: true,
      message: 'Consultation créée avec succès',
      consultation: consultation,
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
    @Query('userId') userId?: string,
  ) {
    const result = await this.consultationsService.findAll({
      page,
      limit,
      clientId: userId,
    });

    return {
      success: true,
      consultations: result.consultations,
      total: result.total,
    };
  }

  @Get('ended-game')
  @ApiOperation({ summary: 'Récupérer les consultations du jeu actif (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des consultations du jeu actif' })
  async getMyEndedGameConsultations(
    @Query('page') page = '1',
    @Query('limit') limit = '18',
  ) {
    const result = await this.consultationsService.getEndedGameConsultations({
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 18,
    });
    return result;
  }

  @Get('ended-learning')
  @ApiOperation({ summary: 'Récupérer les consultations du jeu actif (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des consultations du jeu actif' })
  async getMyEndedLearningConsultations(
    @Query('page') page = '1',
    @Query('limit') limit = '18',
  ) {
    const result = await this.consultationsService.getEndedLearningConsultations({
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 18,
    });
    return result;
  }

  // ============================================================================
  // ROUTES GÉNÉRIQUES AVEC PARAMÈTRE :id (EN DERNIER)
  // ============================================================================

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
    const consultation = await this.consultationsService.findOne(id);
    const consultationObj = consultation.toObject();

    return {
      success: true,
      consultation: consultationObj,
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
      consultation,
    }));
  }

  /**
   * PUT /consultations/:id
   * Mettre à jour une consultation (alternative PUT)
   */
  @Put(':id')
  updatePut(@Param('id') id: string, @Body() updateConsultationDto: any) {
    return this.consultationsService.update(id, updateConsultationDto).then((consultation) => ({
      success: true,
      consultation,
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