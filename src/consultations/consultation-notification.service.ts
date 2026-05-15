import { Rubrique, RubriqueDocument } from '@/rubriques/rubrique.schema';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AnalysisService } from './analysis.service';
import { ConsultationsService } from './consultations.service';
import { ConsultationDocument } from './schemas/consultation.schema';

@Injectable()
export class ConsultationNotificationService {

    constructor(
        private readonly consultationsService: ConsultationsService,
        private readonly analysisService: AnalysisService,
        private readonly notificationsService: NotificationsService,
         @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
     ) { }

    async notifyUser(id: string) {
        try {
            const consultation = await this.notifyConsultationUser(id) as ConsultationDocument;
            const userId = consultation.clientId.toString();
            await this.createOrUpdateGradeProgress(consultation);

            const user = await this.userModel.findById(userId).exec();
            if (!user) throw new NotFoundException('User not found');
           
          
           

           
              await user.save();
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
   
        if (!consultation.choiceId) return;

         const ids: string[] = Array.isArray(consultation.choiceId) ? consultation.choiceId.map(String) : [String(consultation.choiceId)];
        if (!ids.length) return;
        const rubrique = await this.rubriqueModel.findOne({ 'consultationChoices._id': ids[0] }, { 'consultationChoices.$': 1 }).lean().exec();
        const foundChoice = rubrique?.consultationChoices?.[0];
        const gradeIdForChoice = foundChoice?.gradeId?.toString();
        if (!gradeIdForChoice) {
            throw new NotFoundException('Aucun grade associé au choix de consultation trouvé');
        }
        
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
        ]);
        return consultation;
    }
}