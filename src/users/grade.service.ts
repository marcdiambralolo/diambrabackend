import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { GradeConfig } from '../grades/schemas/grade-config.schema';
import { UserGradeProgressService } from './user-grade-progress.service';
import {
  UserGrade,
  GRADE_ORDER,
  GRADE_MESSAGES,
  PROFILE_WELCOME_MESSAGE,
} from '../common/enums/user-grade.enum';

@Injectable()
export class GradeService {
  private readonly logger = new Logger(GradeService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Consultation.name)
    private consultationModel: Model<ConsultationDocument>,
    @InjectModel(GradeConfig.name)
    private gradeConfigModel: Model<GradeConfig & Document>,
    private readonly userGradeProgressService: UserGradeProgressService,
  ) { }

  /**
   * Vérifie et met à jour le grade d'un utilisateur en fonction de ses activités.
   * La progression est conditionnée par :
   * 1. Les seuils globaux (consultations, rituels, livres)
   * 2. Le nombre de consultations complétées dans chaque rubrique requise
   * 
      const newGrade = candidateGrade;
    oldGrade: UserGrade | null;
    newGrade: UserGrade | null;
    message?: string;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const currentGrade = user.grade ?? null;

    // Calculer le grade avec vérification globale
    const candidateGrade = this.calculateGrade(
      user.consultationsCompleted || 0,
      user.rituelsCompleted || 0,
      user.booksRead || 0,
    );

    // Vérifier en plus les exigences par rubrique
    const newGrade = await this.validateGradeWithRubriqueRequirements(
      userId,
      candidateGrade,
    );

    // Si le grade n'a pas changé
    if (currentGrade === newGrade) {
      return {
        updated: false,
        oldGrade: currentGrade,
        newGrade: currentGrade,
      };
    }
      const gradeConfig = await this.gradeConfigModel
        .findOne({ grade })
        .exec();

      if (!gradeConfig || !gradeConfig.rubriqueRequirements || gradeConfig.rubriqueRequirements.length === 0) {
        // Pas d'exigences par rubrique → le grade est validé par les seuils globaux seuls
        return grade;
      }

      // Vérifier chaque exigence par rubrique
      const allRubriqueMet = gradeConfig.rubriqueRequirements.every((req) => {
        const rubriqueId = req.rubriqueId.toString();
        const count = consultationsByRubrique.get(rubriqueId) || 0;
        return count >= req.minConsultations;
      });

      if (allRubriqueMet) {
        return grade;
      }
    }

    return null; // Aucun grade satisfait
  }

  /**
   * Compte le nombre de consultations COMPLETED par rubrique pour un utilisateur.
   * Retourne une Map<rubriqueId, count>.
   */
  async getConsultationsPerRubrique(userId: string): Promise<Map<string, number>> {
    const result = await this.consultationModel.aggregate([
      {
        $match: {
          clientId: new Types.ObjectId(userId),
          status: 'COMPLETED',
          rubriqueId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$rubriqueId',
          count: { $sum: 1 },
        },
      },
    ]);

    const map = new Map<string, number>();
    for (const r of result) {
      map.set(r._id.toString(), r.count);
    }
    return map;
  }

  /**
   * Calcule le grade approprié en fonction des activités (depuis la BD)
   */
  async calculateGradeFromDb(
    consultations: number,
    rituels: number,
    livres: number,
  ): Promise<UserGrade | null> {
    // Récupérer tous les grades depuis la BD, triés du plus haut au plus bas
    const gradeConfigs = await this.gradeConfigModel.find().sort({ level: -1 }).lean().exec();
    for (const config of gradeConfigs) {
      const requirements = config.requirements;
      if (
        consultations >= requirements.consultations &&
        rituels >= requirements.rituels &&
        livres >= requirements.livres
      ) {
        return config.grade as UserGrade;
      }
    }
    return null; // Aucun grade atteint
  }

  /**
   * Récupère le message de félicitations pour un grade
   */
  getGradeMessage(grade: UserGrade, userName: string): string {
    const message = GRADE_MESSAGES[grade];
    return message.replace(/{name}/g, userName);
  }

  /**
   * Récupère le message de bienvenue personnalisé
   */
  getWelcomeMessage(userName: string): string {
    return PROFILE_WELCOME_MESSAGE.replace(/{name}/g, userName);
  }

  /**
   * Incrémente le compteur de consultations et vérifie le grade
   */
  async incrementConsultations(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { consultationsCompleted: 1 },
    });
  }

  /**
   * Incrémente le compteur de rituels et vérifie le grade
   */
  async incrementRituels(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { rituelsCompleted: 1 },
    });
  }

  /**
   * Incrémente le compteur de livres lus et vérifie le grade
   */
  async incrementBooksRead(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { booksRead: 1 },
    });
  }

  /**
   * Récupère les statistiques de progression d'un utilisateur,
   * incluant la progression par rubrique.
   */
  async getProgressStats(userId: string): Promise<{
    currentGrade: UserGrade | null;
    nextGrade: UserGrade | null;
    consultationsCompleted: number;
    consultationsParRubrique: Array<{
      rubriqueId: string;
      rubriqueTitle: string;
      required: number;
      completed: number;
      progress: number;
    }> | null;
    rituelsCompleted: number;
    booksRead: number;
    nextGradeRequirements: {
      consultationsParRubrique: number;
      rituels: number;
      livres: number;
    } | null;
    progress: {
      consultationsParRubrique: number;
      rituels: number;
      livres: number;
    } | null;
    userGradeProgress: any | null;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) { throw new Error('Utilisateur introuvable'); }

    const currentGrade = user.grade ?? null;
    const nextGrade = this.getNextGrade(currentGrade);
    let userGradeProgress: any = null;
    const gradeConfigs = await this.gradeConfigModel.find().sort({ level: 1 }).lean().exec();

    let currentIndex = user.grade ? gradeConfigs.findIndex((g: any) => g.grade === user.grade) : 0;
    if (currentIndex < 0) currentIndex = 0;
    const gradeId = gradeConfigs[currentIndex]._id;
    userGradeProgress = await this.userGradeProgressService['userGradeProgressModel']
      .findOne({ userId, gradeId }).exec();






    const stats: any = {
      currentGrade,
      nextGrade,
      consultationsCompleted: user.consultationsCompleted || 0,
      consultationsParRubrique: null,
      rituelsCompleted: user.rituelsCompleted || 0,
      booksRead: user.booksRead || 0,
      nextGradeRequirements: null,
      progress: null,
      userGradeProgress,
    };

    if (nextGrade) {
      // Récupérer les requirements du grade suivant depuis la BD
      const nextGradeConfig = gradeConfigs.find((g: any) => g.grade === nextGrade);
      if (nextGradeConfig && nextGradeConfig.requirements) {
        const requirements = nextGradeConfig.requirements;
        stats.nextGradeRequirements = {
          consultationsParRubrique: requirements.consultations,
          rituels: requirements.rituels,
          livres: requirements.livres,
        };
        stats.progress = {
          consultationsParRubrique: Math.min(
            100,
            Math.round(
              ((user.consultationsCompleted || 0) / requirements.consultations) * 100,
            ),
          ),
          rituels: Math.min(
            100,
            Math.round(((user.rituelsCompleted || 0) / requirements.rituels) * 100),
          ),
          livres: Math.min(
            100,
            Math.round(((user.booksRead || 0) / requirements.livres) * 100),
          ),
        };
      }
    }

    return stats;
  }

  /**
   * Retourne le grade suivant
   */
  private getNextGrade(currentGrade: UserGrade | null): UserGrade | null {
    if (!currentGrade) {
      return GRADE_ORDER[0];
    }

    const currentIndex = GRADE_ORDER.indexOf(currentGrade);
    if (currentIndex === -1 || currentIndex === GRADE_ORDER.length - 1) {
      return null; // Dernier grade atteint
    }

    return GRADE_ORDER[currentIndex + 1];
  }

  /**
   * Récupère tous les grades avec leurs exigences
   */
  async getAllGradesInfo(): Promise<Array<{
    grade: UserGrade;
    level: number;
    requirements: {
      consultations: number;
      rituels: number;
      livres: number;
    };
  }>> {
    const gradeConfigs = await this.gradeConfigModel.find().sort({ level: 1 }).lean().exec();
    return gradeConfigs.map((config: any) => ({
      grade: config.grade as UserGrade,
      level: config.level,
      requirements: config.requirements,
    }));
  }
}
