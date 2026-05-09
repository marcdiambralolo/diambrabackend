import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ConsultationChoiceStatusService } from './consultation-choice-status.service';

@Controller('consultation-choice-status')
export class ConsultationChoiceStatusController {
  constructor(
    private readonly consultationChoiceStatusService: ConsultationChoiceStatusService,
  ) {}

  /**
   * Récupère le statut d'un choix de consultation pour l'utilisateur connecté
   * GET /consultation-choice-status/me/:choiceId
   */
  @Get('me/:choiceId')
  @UseGuards(JwtAuthGuard)
  async getMyChoiceStatus(
    @CurrentUser() user: UserDocument,
    @Param('choiceId') choiceId: string,
  ) {
    return this.consultationChoiceStatusService.getChoiceStatus(user._id.toString(), choiceId);
  }

  /**
   * Récupère les statuts des choix de consultation pour l'utilisateur connecté
   * GET /consultation-choice-status/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyChoicesStatus(
    @CurrentUser() user: UserDocument,
    @Query('choiceIds') choiceIds?: string,
  ) {
    const choiceIdArray = choiceIds ? choiceIds.split(',').filter(id => id.trim()) : undefined;
    return this.consultationChoiceStatusService.getUserChoicesStatus(user._id.toString(), choiceIdArray);
  }

  /**
   * Récupère le statut d'un choix de consultation spécifique pour un utilisateur
   * GET /consultation-choice-status/:userId/:choiceId
   */
  @Get(':userId/:choiceId')
  async getChoiceStatus(
    @Param('userId') userId: string,
    @Param('choiceId') choiceId: string,
  ) {
    return this.consultationChoiceStatusService.getChoiceStatus(userId, choiceId);
  }

  /**
   * Récupère les statuts de tous les choix de consultation pour un utilisateur
   * GET /consultation-choice-status/:userId
   * Query params optionnels:
   * - choiceIds: string[] - Liste des IDs de choix à vérifier (séparés par des virgules)
   */
  @Get(':userId')
  async getUserChoicesStatus(
    @Param('userId') userId: string,
    @Query('choiceIds') choiceIds?: string,
  ) {
    const choiceIdArray = choiceIds ? choiceIds.split(',').filter(id => id.trim()) : undefined;
    return this.consultationChoiceStatusService.getUserChoicesStatus(userId, choiceIdArray);
  }

  /**
   * Récupère les statuts des choix d'une catégorie spécifique
   * GET /consultation-choice-status/:userId/category/:category
   */
  @Get(':userId/category/:category')
  async getUserChoicesStatusByCategory(
    @Param('userId') userId: string,
    @Param('category') category: string,
  ) {
    return this.consultationChoiceStatusService.getUserChoicesStatusByCategory(
      userId,
      category,
    );
  }
}
