import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisDbService } from './analysis-db.service';
import { AnalysisService } from './analysis.service';
import { SaveAnalysisDto } from './dto/save-analysis.dto';

@Controller('analyses')
export class AnalysisController {
  constructor(
    private readonly analysisDbService: AnalysisDbService,
    private readonly analysisService: AnalysisService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: SaveAnalysisDto) {
    return this.analysisDbService.createAnalysis(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findAll() {
    return this.analysisDbService['analysisModel'].find();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.analysisDbService['analysisModel'].findById(id);
  }

  @Get('by-consultation/:consultationId')
  async getByConsultationId(@Param('consultationId') consultationId: string) {
    const existing = await this.analysisDbService.findByConsultationId(consultationId);
    if (!existing) {
      throw new NotFoundException('Analyse non trouvée pour cette consultation');
    }

    return {
      success: true,
      analysis: this.analysisService.serializeAnalysisForFrontend(existing),
    };
  }

  @Get('by-choice/:choiceId')
  @UseGuards(JwtAuthGuard)
  async getByChoiceId(
    @Param('choiceId') choiceId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const analyses = await this.analysisService.findConsultationSummariesByChoiceForUser(
      user._id.toString(),
      choiceId,
    );

    return {
      success: true,
      choiceId,
      total: analyses.total,
      consultations: analyses.items,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() body: { texte: string }) {
    return this.analysisDbService['analysisModel'].findByIdAndUpdate(id, { texte: body.texte }, { new: true });
  }
 
  @Patch('by-consultation/:consultationId/texte')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async updateTexteByConsultationId(
    @Param('consultationId') consultationId: string,
    @Body('texte') texte: string
  ) {
    return this.analysisDbService.updateTexteByConsultationId(consultationId, texte);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.analysisDbService['analysisModel'].findByIdAndDelete(id);
  }
}
