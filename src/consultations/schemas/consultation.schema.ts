/* eslint-disable */
import { Offering } from '@/offerings/schemas/offering.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ConsultationStatus, ConsultationType } from '../../common/enums/consultation-status.enum';

@Schema({ _id: false })
export class ConsultationChoice {
  @Prop({ type: Object, required: true })
  offering!: {
    alternative:
    {
      category: String,
      offeringId: String,
      quantity: Number,
      _id: String,
    };
  };

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  _id!: string;
}

export type ConsultationChoiceDocument = ConsultationChoice & Document;
export type ConsultationDocument = Consultation & Document;

@Schema({ _id: false })
export class OfferingAlternative {
  @Prop({ required: true })
  offeringId!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop()
  name?: string;

  @Prop({ type: Boolean, required: false, default: true })
  visible?: boolean;

  @Prop()
  price?: number;

  @Prop()
  priceUSD?: number;

  @Prop()
  category?: string; 

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class RequiredOffering {
  @Prop({ type: OfferingAlternative, required: true })
  alternative!: OfferingAlternative;
}

@Schema({ _id: false })
export class RequiredOfferingDetail {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;
}

@Schema({ timestamps: true })
export class ConsultationMessage {
  @Prop({ required: true, enum: ['client', 'medium'] })
  from!: 'client' | 'medium';

  @Prop({ required: true })
  text!: string;

  @Prop({ type: Date, default: Date.now })
  sentAt!: Date;

  @Prop({ type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' })
  status?: 'sent' | 'delivered' | 'read';
}

/**
 * Schéma MongoDB pour les consultations
 */
@Schema({ timestamps: true })
export class Consultation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  clientId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service' })
  serviceId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ConsultationType })
  type!: ConsultationType;

  @Prop({ type: String, enum: ConsultationStatus, default: ConsultationStatus.PENDING })
  status!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: Object, default: {} })
  formData!: {
    username?: string;
    [key: string]: any;
  };

  @Prop({ type: ConsultationChoice, default: null })
  choice?: ConsultationChoice;

  @Prop({ type: RequiredOffering, required: false, default: null })
  requiredOffering?: RequiredOffering;

  @Prop({ type: [RequiredOfferingDetail], default: [] })
  requiredOfferingsDetails!: RequiredOfferingDetail[];

  @Prop({ default: null })
  result!: string; // Résultat de la consultation (texte long)

  @Prop({
    type: Object,
    default: null,
  })

  @Prop({ default: null })
  completedDate!: Date; // Date de complétion

  @Prop({ default: 0 })
  price!: number; // Prix en euros

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: [ConsultationMessage], default: [] })
  messages!: ConsultationMessage[];

  @Prop({ default: null })
  notes!: string;

  @Prop({ required: true, default: null })
  choiceId!: string; 

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Rubrique', required: true })
  rubriqueId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, default: null })
  country!: string;
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);

 

// Indexes
ConsultationSchema.index({ clientId: 1, createdAt: -1 });
ConsultationSchema.index({ status: 1 });
ConsultationSchema.index({ type: 1 });
// Performance indexes for getConsultations
ConsultationSchema.index({ createdAt: -1 });
ConsultationSchema.index({ title: 'text', description: 'text' });
ConsultationSchema.index({ 'formData.nom': 1, 'formData.prenoms': 1 });