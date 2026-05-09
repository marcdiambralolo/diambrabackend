import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class PractitionerReview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  author: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Consultation', required: true })
  consultationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  comment: string;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export type PractitionerReviewDocument = PractitionerReview & Document;
export const PractitionerReviewSchema = SchemaFactory.createForClass(PractitionerReview);
