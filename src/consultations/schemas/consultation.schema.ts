/* eslint-disable */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConsultationDocument = Consultation & Document;

@Schema({ timestamps: true })
export class Consultation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  clientId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ type: Object, default: {} })
  formData!: {
    [key: string]: any;
  };

  @Prop({ default: 0 })
  price!: number; // Prix en euros

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, default: null })
  country!: string;
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);

ConsultationSchema.index({ clientId: 1, createdAt: -1 });
ConsultationSchema.index({ createdAt: -1 });