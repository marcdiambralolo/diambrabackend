import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';
import { GradeConfigService } from './grade-config.service';
import { UpdateGradeConfigDto } from './dto/update-grade-config.dto';
import { CreateGradeConfigDto } from './dto/create-grade-config.dto';
import { ReorderGradeChoicesDto } from './dto/reorder-grade-choices.dto';
// import UpdateNextGradeDto supprimé

@ApiTags('Admin - Grades')
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class GradeConfigController {

  constructor(private readonly gradeConfigService: GradeConfigService) { }

  /**
     * GET /admin/grades/by-name/:name
     * Récupère un grade spécifique par son nom
     */
  @Get('grades/by-name/:name')
  @ApiOperation({
    summary: 'Récupère un grade par son nom',
    description: 'Retourne la configuration complète d\'un grade par son nom.'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration du grade retournée',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade non trouvé',
  })
  async getGradeConfigByName(@Param('name') name: string) {
     return this.gradeConfigService.getGradeConfigByName(name);
  }

  /**
   * GET /admin/grades
   * Récupère tous les grades configurés, triés par niveau
   */
  @Get('grades')
  @ApiOperation({
    summary: 'Récupère tous les grades configurés',
    description: 'Retourne la liste de tous les grades initiatiqu, triés par niveau.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des grades retournée',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  // Utilise 'any[]' pour éviter l'erreur d'export de type
  async getAllGradeConfigs(): Promise<any[]> {
     return this.gradeConfigService.getAllGradeConfigs();
  }

  /**
 * GET /grades/choices-grade-map
 * Retourne un mapping de chaque choiceId vers le grade auquel il appartient
 * (public, pas besoin d'être admin)
 */
  @Get('grades/choices-grade-map')
  @ApiOperation({
    summary: 'Mapping choix de consultation → grade',
    description: 'Retourne pour chaque choiceId le grade auquel il appartient, pour affichage côté front.'
  })
  @ApiResponse({ status: 200, description: 'Mapping retourné' })
  async getChoicesGradeMap() {
    // On ne vérifie pas l'admin ici, c'est public
    return this.gradeConfigService.getChoicesGradeMap();
  }

  /**
   * GET /admin/grades/enriched
   * Récupère tous les grades avec infos enrichies (nb choix, grade suivant, exigences rubriques)
   */
  @Get('grades/enriched')
  @ApiOperation({
    summary: 'Récupère tous les grades avec infos enrichies',
    description:
      'Retourne les grades avec le nombre de choix assignés, le nom du grade suivant, et le résumé des exigences par rubrique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste enrichie des grades retournée',
  })
  async getEnrichedGradeConfigs(@CurrentUser() user: User) {
     return this.gradeConfigService.getEnrichedGradeConfigs(user);
  }

  /**
   * GET /admin/grades/:id
   * Récupère un grade spécifique par son ID
   */
  @Get('grades/:id')
  @ApiOperation({
    summary: 'Récupère un grade spécifique',
    description: 'Retourne la configuration complète d\'un grade par son ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration du grade retournée',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade non trouvé',
  })
  async getGradeConfigById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.gradeConfigService.getGradeConfigById(id, user);
  }

  /**
   * GET /admin/consultation-choices
   * Récupère tous les choix de consultations disponibles
   */
  @Get('consultation-choices')
  @ApiOperation({
    summary: 'Récupère tous les choix de consultations disponibles',
    description:
      'Retourne la liste complète des choix de consultations provenant de toutes les rubriques.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des choix de consultations retournée',
  })
  async getAvailableConsultationChoices(@CurrentUser() user: User) {
    return this.gradeConfigService.getAvailableConsultationChoices(user);
  }

  /**
   * POST /admin/grades
   * Créer un nouveau grade
   */
  @Post('grades')
  @ApiOperation({
    summary: 'Créer un nouveau grade',
    description: 'Crée un grade avec son niveau, nom, et exigences.',
  })
  @ApiResponse({
    status: 201,
    description: 'Grade créé',
  })
  @ApiResponse({
    status: 400,
    description: 'Grade ou niveau déjà existant',
  })
  async createGradeConfig(
    @Body() createDto: CreateGradeConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.gradeConfigService.createGradeConfig(createDto, user);
  }

  /**
   * PATCH /admin/grades/:id
   * Met à jour un grade (choix de consultations et/ou grade suivant)
   */
  @Patch('grades/:id')
  @ApiOperation({
    summary: 'Met à jour la configuration d\'un grade',
    description:
      'Permet de modifier les choix de consultations, le grade suivant, et la description.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grade mis à jour',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade non trouvé',
  })
  async updateGradeConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateGradeConfigDto 
  ) {
    return this.gradeConfigService.updateGradeConfig(id, updateDto);
  }

  /**
   * DELETE /admin/grades/:id
   * Supprimer un grade
   */
  @Delete('grades/:id')
  @ApiOperation({
    summary: 'Supprimer un grade',
    description: 'Supprime un grade.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grade supprimé',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade non trouvé',
  })
  async deleteGradeConfig(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.gradeConfigService.deleteGradeConfig(id, user);
  }

  // PATCH /admin/grades/:id/next-grade supprimé (plus de nextGradeId)

  /**
   * PUT /admin/grades/:id/reorder-choices
   * Réordonne les choix de consultations d'un grade
   */
  @Put('grades/:id/reorder-choices')
  @ApiOperation({
    summary: 'Réordonne les choix de consultations',
    description:
      'Permet de modifier l\'ordre de présentation des choix de consultations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Choix réordonnés',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade non trouvé',
  })
  async reorderGradeChoices(
    @Param('id') id: string,
    @Body() reorderDto: ReorderGradeChoicesDto,
    @CurrentUser() user: User,
  ) {
    return this.gradeConfigService.reorderGradeChoices(id, reorderDto, user);
  }
}