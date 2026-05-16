import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserConsultationChoiceDocument = UserConsultationChoice & Document;

@Schema({ timestamps: true })
export class UserConsultationChoice {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Consultation', required: true })
  consultationId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  choiceTitle!: string; 

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ConsultationChoice', required: true })
  choiceId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  createdAt!: Date;
}

export const UserConsultationChoiceSchema = SchemaFactory.createForClass(UserConsultationChoice);
