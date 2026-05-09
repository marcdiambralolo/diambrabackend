import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  GradeInfoDto,
  GradeProgressDto,
  GradeUpdateResponseDto,
} from './dto/grade.dto';
import { GradeService } from './grade.service';
import { GRADE_ORDER } from '@/common/enums/user-grade.enum';
import { RubriqueService } from '@/rubriques/rubrique.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Grades')
@Controller('grades')
export class GradeController {
  constructor(private readonly gradeService: GradeService,
    private readonly rubriqueService: RubriqueService,
  ) { }

  @Get('info')
  @ApiOperation({ summary: 'Récupérer les informations sur tous les grades' })
  @ApiResponse({
    status: 200,
    description: 'Liste de tous les grades avec leurs exigences',
    type: [GradeInfoDto],
  })
  async getAllGradesInfo(): Promise<GradeInfoDto[]> {
    return this.gradeService.getAllGradesInfo();
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer la progression de l\'utilisateur connecté' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de progression de l\'utilisateur',
    type: GradeProgressDto,
  })
  async getMyProgress(@CurrentUser() user: any): Promise<GradeProgressDto> {
    return this.gradeService.getProgressStats(user._id);
  }

  @Get('progress/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer la progression d\'un utilisateur spécifique' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de progression de l\'utilisateur',
    type: GradeProgressDto,
  })
  async getUserProgress(@Param('userId') userId: string): Promise<GradeProgressDto> {
    return this.gradeService.getProgressStats(userId);
  }

  @Post('check/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier et mettre à jour le grade d\'un utilisateur' })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la vérification du grade',
    type: GradeUpdateResponseDto,
  })
  async checkGrade(@Param('userId') userId: string): Promise<GradeUpdateResponseDto> {
    throw new Error('checkAndUpdateGrade endpoint is deprecated');
  }

  @Patch('increment-consultations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Incrémenter le compteur de consultations de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur incrémenté avec succès',
  })
  async incrementMyConsultations(@Req() req: Request & { user: any }): Promise<{ success: boolean }> {
    await this.gradeService.incrementConsultations(req.user._id);
    return { success: true };
  }

  @Patch('increment-rituels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Incrémenter le compteur de rituels de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur incrémenté avec succès',
  })
  async incrementMyRituels(@Req() req: Request & { user: any }): Promise<{ success: boolean }> {
    await this.gradeService.incrementRituels(req.user._id);
    return { success: true };
  }

  @Patch('increment-books')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Incrémenter le compteur de livres lus de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur incrémenté avec succès',
  })
  async incrementMyBooks(@Req() req: Request & { user: any }): Promise<{ success: boolean }> {
    await this.gradeService.incrementBooksRead(req.user._id);
    return { success: true };
  }

  @Get('welcome-message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le message de bienvenue personnalisé' })
  @ApiResponse({
    status: 200,
    description: 'Message de bienvenue',
  })
  async getWelcomeMessage(@Req() req: Request & { user: any }): Promise<{ message: string }> {
    const message = this.gradeService.getWelcomeMessage(
      req.user.username || req.user.email,
    );
    return { message };
  }

  @Get('consultation-choices/available')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retourne tous les choix de consultations accessibles pour le grade actuel et les grades inférieurs' })
  @ApiResponse({ status: 200, description: 'Liste des choix de consultations accessibles.' })
  async getAvailableConsultationChoices(@Req() req: Request & { user: any }) {
    const user = req.user;
    const userGrade = user.grade;
    if (!userGrade) {
      return [];
    }
    const gradeIndex = GRADE_ORDER.indexOf(userGrade);
    if (gradeIndex === -1) {
      return [];
    }
    // Récupérer toutes les rubriques et populate consultationChoices.gradeId
    const rubriques = await this.rubriqueService['rubriqueModel']
      .find()
      .populate('consultationChoices.gradeId')
      .exec();

    // Inclure tous les grades sous-adjacents (inférieurs) au grade actuel
    const allowedGradeIds = GRADE_ORDER.slice(0, gradeIndex + 1);
    // Agréger tous les _id des choix dont le gradeId correspond
    const ids = rubriques.flatMap((r: any) =>
      (r.consultationChoices || [])
        .filter((c: any) => {
          // gradeId peut être un objet peuplé ou un string
          const grade = c.gradeId;
          if (!grade) return false;
          return allowedGradeIds.includes(grade.grade);
        })
        .map((c: any) => c._id?.toString())
    ).filter((id: any) => typeof id === 'string');

    return ids;
  }
}
