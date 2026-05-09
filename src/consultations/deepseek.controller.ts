import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { DeepseekService, BirthData } from './deepseek.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('deepseek')
@UseGuards(JwtAuthGuard)
export class DeepseekController {
  constructor(private readonly deepseekService: DeepseekService) {}

  // Génère la carte du ciel et l'analyse complète pour un utilisateur
  @Post('carte-du-ciel')
  async generateCarteDuCiel(@Body() birthData: BirthData) {
    return this.deepseekService.genererAnalyseComplete('birthData', '');
  }

  // Exemple d'endpoint pour récupérer une analyse par cacheKey (optionnel)
  @Get('carte-du-ciel/:cacheKey')
  async getCarteDuCiel(@Param('cacheKey') cacheKey: string) {
    return null;
  }
}
