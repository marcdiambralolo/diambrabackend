/* eslint-disable */
// Ajout d'un champ virtuel pour le statut du bouton "Consulter"
import { Offering } from '@/offerings/schemas/offering.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ConsultationStatus, ConsultationType } from '../../common/enums/consultation-status.enum';

@Schema({ _id: false })
export class ConsultationChoice {
  @Prop({ type: Object, required: true })
  offering: {
    alternatives: [
      {
        category: String,
        offeringId: String,
        quantity: Number,
        _id: String,
      },
    ];
  };

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  prompt?: string;

  @Prop({ required: true })
  frequence: string;

  @Prop({ required: true })
  participants: string;

  @Prop({ required: true })
  _id: string;
}


export type ConsultationChoiceDocument = ConsultationChoice & Document;
export type ConsultationDocument = Consultation & Document;

@Schema({ _id: false })
export class OfferingAlternative {
  @Prop({ required: true })
  offeringId: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  // Champs enrichis depuis l'entité Offering
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

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class RequiredOffering {
  @Prop({ required: true, enum: ['animal', 'vegetal', 'boisson'] })
  type: string; // animal, vegetal, boisson

  @Prop({ type: [OfferingAlternative], required: true })
  alternatives: OfferingAlternative[];

  @Prop({ required: true })
  selectedAlternative: string; // 'animal', 'vegetal' ou 'boisson'
}

/**
 * Sous-schéma pour les détails des offrandes requises enrichies
 */
@Schema({ _id: false })
export class RequiredOfferingDetail {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true })

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

@Schema({ timestamps: true })
export class ConsultationMessage {
  @Prop({ required: true, enum: ['client', 'medium'] })
  from: 'client' | 'medium';

  @Prop({ required: true })
  text: string;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;

  @Prop({ type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' })
  status?: 'sent' | 'delivered' | 'read';
}

/**
 * Schéma MongoDB pour les consultations
 */
@Schema({ timestamps: true })
export class Consultation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  consultantId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service' })
  serviceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ConsultationType })
  type: ConsultationType;

  @Prop({ type: String, enum: ConsultationStatus, default: ConsultationStatus.PENDING })
  status: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  prompt: string;


  @Prop({ type: Object, default: {} })
  formData: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    timeOfBirth?: string;
    countryOfBirth?: string;
    cityOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    country?: string;
    question?: string;
    username?: string;
    tierce?: string;
    _id?: string;
    role?: string;
    customPermissions?: any[];
    isActive?: boolean;
    emailVerified?: boolean;
    preferences?: any;
    specialties?: any[];
    rating?: number;
    totalConsultations?: number;
    credits?: number;
    createdAt?: Date;
    updatedAt?: Date;
    __v?: number;
    lastLogin?: Date;
    dateNaissance?: Date;
    genre?: string;
    heureNaissance?: string;
    nom?: string;
    paysNaissance?: string;
    prenoms?: string;
    villeNaissance?: string;
    premium?: boolean;
    carteDuCiel?: any;
    [key: string]: any;
  };

  @Prop({ type: ConsultationChoice, default: null })
  choice?: ConsultationChoice;

  /**
   * Données tierce personne (pour AVEC_TIERS)
   */
  @Prop({ type: Object, required: false, default: null })
  tierce?: {
    nom?: string;
    prenoms?: string;
    dateNaissance?: string;
    villeNaissance?: string;
    heureNaissance?: string;
    [key: string]: any;
  };


  /**
    * Données tierces personnes (pour AVEC_TIERS multiple)
    */
  @Prop({ type: [Object], required: false, default: [] })
  tierces?: Array<{
    nom?: string;
    prenoms?: string;
    dateNaissance?: string;
    villeNaissance?: string;
    heureNaissance?: string;
    paysNaissance?: string;
    genre?: string;
    gender?: string;
    [key: string]: any;
  }>;



  @Prop({ type: RequiredOffering, required: false, default: null })
  requiredOffering?: RequiredOffering;

  @Prop({ type: [OfferingAlternative], required: false, default: [] })
  alternatives?: Offering[];

  @Prop({ type: [RequiredOfferingDetail], default: [] })
  requiredOfferingsDetails: RequiredOfferingDetail[];

  @Prop({ default: null })
  result: string; // Résultat de la consultation (texte long)

  @Prop({
    type: Object,
    default: null,
  })

  @Prop({ default: null })
  scheduledDate: Date; // Date programmée pour la consultation

  @Prop({ default: null })
  completedDate: Date; // Date de complétion

  @Prop({ default: 0 })
  price: number; // Prix en euros

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, min: 0, max: 5, default: null })
  rating: number; // Note du client (0-5)

  @Prop({ default: null })
  review: string; // Avis du client


  @Prop({ default: null })
  pdfFile?: string; // URL du fichier PDF associé à la consultation

  @Prop({ type: [String], default: [] })
  attachments: string[]; // URLs des fichiers joints

  @Prop({ type: [ConsultationMessage], default: [] })
  messages: ConsultationMessage[];

  @Prop({ default: null })
  notes: string;

  @Prop({ required: true, default: null })
  choiceId: string;
  // Notes privées du consultant

  /**
   * Référence à la rubrique associée à la consultation (obligatoire)
   */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Rubrique', required: true })
  rubriqueId: MongooseSchema.Types.ObjectId;

  /**
   * Indique si l'analyse a déjà été notifiée au client
   */
  @Prop({ type: Boolean, default: false })
  analysisNotified: boolean;

  /**
   * Pays depuis lequel la consultation a été créée (détecté via IP ou formData)
   */
  @Prop({ type: String, default: null })
  country: string;
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);

// Champ virtuel consultButtonStatus
ConsultationSchema.virtual('consultButtonStatus').get(function (this: any) {
  if (this.analysisNotified || this.status === 'COMPLETED') {
    return 'VOIR_L_ANALYSE';
  } else if (this.status === 'PENDING' || this.status === 'ASSIGNED') {
    return 'REPONSE_EN_ATTENTE';
  } else {
    return 'CONSULTER';
  }
  return 'CONSULTER';
});

// Indexes
ConsultationSchema.index({ clientId: 1, createdAt: -1 });
ConsultationSchema.index({ consultantId: 1, status: 1 });
ConsultationSchema.index({ status: 1 });
ConsultationSchema.index({ type: 1 });
// Performance indexes for getConsultations
ConsultationSchema.index({ createdAt: -1 });
ConsultationSchema.index({ title: 'text', description: 'text' });
ConsultationSchema.index({ 'formData.nom': 1, 'formData.prenoms': 1 });