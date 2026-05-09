
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserGradeProgress, UserGradeProgressDocument } from './schemas/user-grade-progress.schema';

@Injectable()
export class UserGradeProgressService {
    constructor(
        @InjectModel(UserGradeProgress.name)
        private userGradeProgressModel: Model<UserGradeProgressDocument>,    
    ) { }

    async createOrUpdate(userId: string, gradeId: string, data: Partial<UserGradeProgress>): Promise<UserGradeProgress> {
        return this.userGradeProgressModel.findOneAndUpdate(
            { userId, gradeId },
            { $set: data },
            { upsert: true, new: true },
        ).exec();
    }

    async incrementField(userId: string, gradeId: string, field: keyof UserGradeProgress, amount = 1): Promise<UserGradeProgress> {
        return this.userGradeProgressModel.findOneAndUpdate(
            { userId, gradeId },
            { $inc: { [field]: amount } },
            { upsert: true, new: true },
        ).exec();
    }


    async getByUser(userId: string, populate = false) {
         const query = this.userGradeProgressModel.find({ userId }).sort({ gradeEntryDate: 1 });
         if (populate) {
            query.populate('gradeId');
        }
         return query.exec();
    }

     

    async getCurrent(userId: string) {
        return this.userGradeProgressModel.findOne({ userId }).sort({ gradeEntryDate: -1 }).exec();
    }
}
