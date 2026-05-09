import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConsultationChoiceDocument = ConsultationChoice & Document;

@Schema({ timestamps: true })
export class ConsultationChoice {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  frequence: string;

  @Prop({ required: true })
  participants: string;

  @Prop({ required: false })
  prompt?: string;

  @Prop({ type: Object, required: true })
  offering: any;

  /**
   * Chemin du fichier PDF associé (optionnel)
   */
  @Prop({ required: false })
  pdfFile?: string;
}

export const ConsultationChoiceSchema = SchemaFactory.createForClass(ConsultationChoice);