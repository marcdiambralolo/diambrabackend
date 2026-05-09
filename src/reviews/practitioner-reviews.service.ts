import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PractitionerReview, PractitionerReviewDocument } from './schemas/practitioner-review.schema';

@Injectable()
export class PractitionerReviewsService {
  constructor(
    @InjectModel(PractitionerReview.name)
    private readonly reviewModel: Model<PractitionerReviewDocument>,
  ) {}

  async create(data: Partial<PractitionerReview>): Promise<PractitionerReview> {
    const created = new this.reviewModel(data);
    return created.save();
  }

  async findByConsultation(consultationId: string) {
    return this.reviewModel.find({ consultationId }).sort({ createdAt: -1 }).exec();
  }

  async findByUser(userId: string) {
    return this.reviewModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }
}
