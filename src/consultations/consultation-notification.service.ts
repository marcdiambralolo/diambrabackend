import { GradeConfig } from '@/grades';
import { Rubrique, RubriqueDocument } from '@/rubriques/rubrique.schema';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserGrade } from '../common/enums/user-grade.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { GradeService } from '../users/grade.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserGradeProgressService } from '../users/user-grade-progress.service';
import { AnalysisService } from './analysis.service';
import { ConsultationsService } from './consultations.service';
import { ConsultationDocument } from './schemas/consultation.schema';

@Injectable()
export class ConsultationNotificationService {

    constructor(
        private readonly consultationsService: ConsultationsService,
        private readonly analysisService: AnalysisService,
        private readonly notificationsService: NotificationsService,
        private readonly gradeService: GradeService,
        private readonly userGradeProgressService: UserGradeProgressService,
        @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(GradeConfig.name) private readonly gradeConfigModel: Model<GradeConfig>,
    ) { }

    async notifyUser(id: string) {
        try {
            const consultation = await this.notifyConsultationUser(id) as ConsultationDocument;
            const userId = consultation.clientId.toString();
            await this.createOrUpdateGradeProgress(consultation);

            const user = await this.userModel.findById(userId).exec();
            if (!user) throw new NotFoundException('User not found');
            const gradeConfigs = await this.gradeConfigModel.find().sort({ level: 1 }).lean().exec();
            let currentIndex = user.grade ? gradeConfigs.findIndex((g: any) => g.grade === user.grade) : 0;
            if (currentIndex < 0) currentIndex = 0;
            if (!user.grade) {
                user.grade = gradeConfigs[0].grade as UserGrade;
                user.lastGradeUpdate = new Date();
            }
            const currentGradeConfig = gradeConfigs[currentIndex];
            const rc = currentGradeConfig.requirements?.consultations ?? 0;

            let progress = null;
            const gradeId = currentGradeConfig._id.toString();
            progress = await this.userGradeProgressService['userGradeProgressModel']
                .findOne({ userId, gradeId }).exec();

            if (progress && !progress.completed) {
                const currentChoices = progress.choiceIds?.length ?? 0;
                const meets = currentChoices >= rc;
                if (meets && currentIndex + 1 < gradeConfigs.length) {
                    user.grade = gradeConfigs[currentIndex + 1].grade as UserGrade;
                    user.lastGradeUpdate = new Date();
                    progress.completed = true;
                    await progress.save();
                }
                await user.save();
            }
            return {
                success: true,
                message: "Notification envoyée à l'utilisateur.",
            };
        } catch (error) {
            console.error('Erreur dans notifyUser:', error);
            throw error;
        }
    }

    private async createOrUpdateGradeProgress(consultation: ConsultationDocument) {
        const userId: string = consultation.clientId.toString();
        if (!consultation.choiceId) return;

        const userGradeProgressModel = this.userGradeProgressService['userGradeProgressModel'];
        const ids: string[] = Array.isArray(consultation.choiceId) ? consultation.choiceId.map(String) : [String(consultation.choiceId)];
        if (!ids.length) return;
        const rubrique = await this.rubriqueModel.findOne({ 'consultationChoices._id': ids[0] }, { 'consultationChoices.$': 1 }).lean().exec();
        const foundChoice = rubrique?.consultationChoices?.[0];
        const gradeIdForChoice = foundChoice?.gradeId?.toString();
        if (!gradeIdForChoice) {
            throw new NotFoundException('Aucun grade associé au choix de consultation trouvé');
        }
        await userGradeProgressModel.updateOne(
            { userId, gradeId: gradeIdForChoice },
            { $addToSet: { choiceIds: { $each: ids } } },
            { upsert: true }
        ).exec();
    }

    async notifyConsultationUser(id: string) {
        const consultation = await this.consultationsService.findOne(id) as ConsultationDocument;
        if (!consultation?.clientId) {
            throw new HttpException('Consultation ou utilisateur non trouvé', HttpStatus.NOT_FOUND);
        }
        const analysis = await this.analysisService.findByConsultationId(id);
        if (!analysis) {
            throw new HttpException('Analyse non trouvée', HttpStatus.NOT_FOUND);
        }
        if (consultation.analysisNotified || analysis.analysisNotified) {
            await this.consultationsService.markAnalysisAsNotified(id);
            return { success: true, message: "L'analyse a déjà été notifiée." };
        }
        const userId = consultation.clientId.toString();
        await Promise.all([
            this.notificationsService.createConsultationResultNotification(userId, id, consultation.title),
            this.consultationsService.markAnalysisAsNotified(id),
            this.gradeService.incrementConsultations(userId)
        ]);
        return consultation;
    }
}