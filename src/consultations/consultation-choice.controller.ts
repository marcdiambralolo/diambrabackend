import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ConsultationChoiceService } from './consultation-choice.service';

@ApiTags('Consultation Choices')
@Controller('consultation-choices')
export class ConsultationChoiceController {  

  @Get('from-rubriques/:id')
  @ApiOperation({ summary: 'Trouver un choix de consultation par id dans toutes les rubriques' })
  @ApiResponse({ status: 200, description: 'Choix de consultation trouvé dans une rubrique.' })
  async getChoiceFromRubriques(@Param('id') id: string) {
    return this.consultationChoiceService.findChoiceInRubriquesById(id);
  }
  constructor(private readonly consultationChoiceService: ConsultationChoiceService) { }

  @Get(':id/with-prompt')
  async getChoiceWithPrompt(@Param('id') id: string) {
    return this.consultationChoiceService.findOneWithPrompt(id);
  }

  @Get(':id/raw')
  async getChoiceByIdRaw(@Param('id') id: string) {
    return this.consultationChoiceService.findByIdRaw(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Récupérer tous les choix de consultation' })
  @ApiResponse({ status: 200, description: 'Liste des choix de consultation retournée.' })
  async getAllChoices() {
    return this.consultationChoiceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un choix de consultation par ID (public)' })
  @ApiResponse({ status: 200, description: 'Choix de consultation retourné.' })
  async getChoiceById(@Param('id') id: string) {
    const result = await this.consultationChoiceService.findById(id);
    return result;
  }
 
}