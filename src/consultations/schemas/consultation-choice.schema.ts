import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConsultationChoiceDocument = ConsultationChoice & Document;

@Schema({ timestamps: true })
export class ConsultationChoice {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;
  
  @Prop({ type: Object, required: true })
  offering: any;
}

export const ConsultationChoiceSchema = SchemaFactory.createForClass(ConsultationChoice);