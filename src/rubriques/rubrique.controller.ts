import { Patch } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ReorderChoicesDto } from './dto/reorder-choices.dto';
import { RubriqueWithChoiceCountDto } from './dto/rubrique-with-count.dto';
import { RubriqueDto } from './dto/rubrique.dto';
import { RubriqueService } from './rubrique.service';

@Controller('rubriques')
export class RubriqueController {
  constructor(private readonly rubriqueService: RubriqueService) { }

  /**
   * POST /rubriques/:rubriqueId/consultation-choices
   * Ajoute un choix de consultation à une rubrique
   */
  @Post(':rubriqueId/consultation-choices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async addConsultationChoice(
    @Param('rubriqueId') rubriqueId: string,
    @Body() dto: any // Utiliser ConsultationChoiceDto si importé
  ) {
    return this.rubriqueService.addConsultationChoice(rubriqueId, dto);
  }

  @Get()
  findAll() {
    return this.rubriqueService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: RubriqueDto) {
    return this.rubriqueService.create(dto);
  }

    /**
   * PATCH /rubriques/:rubriqueId/consultation-choices/:choiceId
   * Met à jour un choix de consultation (gradeId, etc)
   */
  @Patch(':rubriqueId/consultation-choices/:choiceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async updateConsultationChoice(
    @Param('rubriqueId') rubriqueId: string,
    @Param('choiceId') choiceId: string,
    @Body() update: Partial<any>,
  ) {
    return this.rubriqueService.updateConsultationChoice(rubriqueId, choiceId, update);
  }

  /**
  * Retourne les alternatives d'un choix de consultation donné
  */
  @Get('choice/:choiceId/alternatives')
  async getAlternativesForChoice(@Param('choiceId') choiceId: string) {
    return this.rubriqueService.getAlternativesForChoice(choiceId);
  }

  @Get('cinqetoiles')
  findOneCinqetoiles() {
    return this.rubriqueService.findOne('694acf59bd12675f59e7a7f2');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rubriqueService.findOne(id);
  }

  @Get(':id/choices-with-count')
  @UseGuards(JwtAuthGuard)
  getChoicesWithConsultationCount(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<RubriqueWithChoiceCountDto> {
    return this.rubriqueService.getChoicesWithConsultationCount(id, user._id.toString());
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: RubriqueDto) {
    return this.rubriqueService.update(id, dto);
  }

  @Put(':id/reorder-choices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  reorderChoices(@Param('id') id: string, @Body() dto: ReorderChoicesDto) {
    return this.rubriqueService.reorderChoices(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.rubriqueService.remove(id);
  }
}
