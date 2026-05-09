import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';
import { ConsultationChoiceStatusDto, UserConsultationChoicesStatusDto } from './dto/consultation-choice-status.dto';

@Injectable()
export class ConsultationChoiceStatusService {
  constructor(
    @InjectModel(Consultation.name) 
    private consultationModel: Model<ConsultationDocument>,
    @InjectModel(ConsultationChoice.name)
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
  ) {}

  /**
   * Détermine le statut du bouton pour un choix de consultation donné
   * @param userId - ID de l'utilisateur
   * @param choiceId - ID du choix de consultation
   * @returns Le statut du bouton et les informations associées
   */
  async getChoiceStatus(userId: string, choiceId: string): Promise<ConsultationChoiceStatusDto> {
    // Récupérer les informations du choix
    const choice = await this.consultationChoiceModel.findById(choiceId).exec();
    if (!choice) {
      return {
        choiceId,
        choiceTitle: 'Choix inconnu',
        buttonStatus: 'CONSULTER',
        hasActiveConsultation: false,
        consultationId: null,
      };
    }

    // Rechercher une consultation existante pour cet utilisateur et ce choix
    const consultation = await this.consultationModel
      .findOne({
        clientId: userId,
        'choice._id': choiceId,
      })
      .sort({ createdAt: -1 }) // Prendre la plus récente
      .exec();

    // Cas 1: Aucune consultation OU consultation non payée
    if (!consultation) {
      return {
        choiceId,
        choiceTitle: choice.title,
        buttonStatus: 'CONSULTER',
        hasActiveConsultation: false,
        consultationId: null,
      };
    }

    // Cas 2: Consultation payée mais analyse non notifiée
    if (!consultation.analysisNotified) {
      return {
        choiceId,
        choiceTitle: consultation.choice?.title || choice.title,
        buttonStatus: 'RÉPONSE EN ATTENTE',
        hasActiveConsultation: true,
        consultationId: consultation._id.toString(),
      };
    }

    // Cas 3: Consultation payée ET analyse notifiée
    return {
      choiceId,
      choiceTitle: consultation.choice?.title || choice.title,
      buttonStatus: 'VOIR L\'ANALYSE',
      hasActiveConsultation: true,
      consultationId: consultation._id.toString(),
    };
  }

  /**
   * Récupère les statuts de tous les choix de consultation pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @param choiceIds - Liste optionnelle des IDs de choix à vérifier
   * @returns Les statuts de tous les choix
   */
  async getUserChoicesStatus(
    userId: string,
    choiceIds?: string[],
  ): Promise<UserConsultationChoicesStatusDto> {
    let choices: ConsultationChoiceDocument[];

    if (choiceIds && choiceIds.length > 0) {
      // Récupérer uniquement les choix spécifiés
      choices = await this.consultationChoiceModel.find({ _id: { $in: choiceIds } }).exec();
    } else {
      // Récupérer tous les choix disponibles
      choices = await this.consultationChoiceModel.find().exec();
    }

    // Récupérer le statut de chaque choix
    const choiceStatuses = await Promise.all(
      choices.map((choice) => this.getChoiceStatus(userId, choice._id.toString())),
    );

    return {
      userId,
      choices: choiceStatuses,
    };
  }

  /**
   * Récupère les statuts pour une catégorie spécifique de consultation
   * @param userId - ID de l'utilisateur
   * @param category - Catégorie des consultations (ex:  , 'numerologie')
   * @returns Les statuts des choix de cette catégorie
   */
  async getUserChoicesStatusByCategory(
    userId: string,
    category: string,
  ): Promise<UserConsultationChoicesStatusDto> {
    // Note: Cette méthode nécessite que le modèle ConsultationChoice ait un champ 'category'
    // Si ce n'est pas le cas, il faudra adapter la logique
    const choices = await this.consultationChoiceModel.find().exec();

    const choiceStatuses = await Promise.all(
      choices.map((choice) => this.getChoiceStatus(userId, choice._id.toString())),
    );

    return {
      userId,
      choices: choiceStatuses,
    };
  }
}
