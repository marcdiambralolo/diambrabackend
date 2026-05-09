import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserConsultationChoice, UserConsultationChoiceDocument } from './schemas/user-consultation-choice.schema';

@Injectable()
export class UserConsultationChoiceService {
  constructor(
    @InjectModel(UserConsultationChoice.name)
    private userConsultationChoiceModel: Model<UserConsultationChoiceDocument>,
  ) {}

  async recordChoicesForConsultation(userId: string, consultationId: string, choices: Array<{ title: string; choiceId?: string; frequence: string; participants: string }>) {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new Error(`userId invalide pour UserConsultationChoice: ${userId}`);
    }
    if (!consultationId || !Types.ObjectId.isValid(consultationId)) {
      throw new Error(`consultationId invalide pour UserConsultationChoice: ${consultationId}`);
    }
    const now = new Date();
    const docs = choices.map(choice => ({
      userId: new Types.ObjectId(userId),
      consultationId: new Types.ObjectId(consultationId),
      choiceTitle: choice.title,
      choiceId: choice.choiceId && Types.ObjectId.isValid(choice.choiceId) ? new Types.ObjectId(choice.choiceId) : undefined,
      frequence: choice.frequence,
      participants: choice.participants,
      createdAt: now,
    }));
    return this.userConsultationChoiceModel.insertMany(docs);
  }

  async getChoicesForUser(userId: string) {
    // return this.userConsultationChoiceModel.find({ userId }).populate('choiceId').exec();
        return this.userConsultationChoiceModel.find({ userId }).exec();

  }

    // Retourne la liste des choiceId déjà exécutés pour un utilisateur (optionnellement filtré par consultationId)
    async getExecutedChoiceIds(userId: string, consultationId?: string): Promise<string[]> {
      const filter: any = { userId };
      if (consultationId) filter.consultationId = consultationId;
      const docs = await this.userConsultationChoiceModel.find(filter, { choiceId: 1, _id: 0 }).exec();
      return docs.map(doc => doc.choiceId?.toString?.() ?? '');
    }
}
