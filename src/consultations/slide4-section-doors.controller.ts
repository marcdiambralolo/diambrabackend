import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { ConsultationsService } from './consultations.service';

const CINQ_PORTES_RUBRIQUE_ID = '694acf59bd12675f59e7a7f2' as const;

@ApiTags('Consultations')
@Controller('slide4-section-doors')
export class Slide4SectionDoorsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Compatibilité ancienne route cinq portes',
    description: 'Alias historique conservé pour les anciens bundles frontend qui appellent encore /slide4-section-doors.',
  })
  @ApiResponse({ status: 200, description: 'Consultations cinq portes de l’utilisateur connecté.' })
  async findMySlide4SectionDoors(@CurrentUser() user: UserDocument) {
    const result = await this.consultationsService.findAll({
      clientId: user._id.toString(),
      rubriqueId: CINQ_PORTES_RUBRIQUE_ID,
      page: 1,
      limit: 100,
    });

    return result.consultations;
  }
}