import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { AnalysisDbService } from './analysis-db.service';

@Controller('analyses/raw')
export class AnalysisRawController {
  constructor(private readonly analysisDbService: AnalysisDbService) {}

  /**
   * Retourne l'analyse brute (non formatée) liée à une consultation, dès qu'elle existe.
   */
  @Get(':consultationId')
  async getRawByConsultationId(@Param('consultationId') consultationId: string) {
    const analysis = await this.analysisDbService.findByConsultationId(consultationId);
    if (!analysis) {
      throw new NotFoundException('Aucune analyse générée pour cette consultation');
    }
    return analysis;
  }
}
