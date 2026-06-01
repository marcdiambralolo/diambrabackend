/* eslint-disable */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConsultationDocument = Consultation & Document;

// Schéma pour les détails d'un match
@Schema({ _id: false })
export class MatchDetail {
  @Prop({ required: false })
  tpsglobal!: number;

  @Prop({ required: false, default: 0 })
  score!: number;

  @Prop({ required: false, default: 0 })
  trouves!: number;

  @Prop({ required: false, default: 0 })
  rates!: number;

  @Prop({ required: false, default: 0 })
  timeSpent!: number;

  @Prop({ required: false, default: false })
  isgameover!: boolean;

  @Prop({ required: false })
  niveau!: number;

  @Prop({ type: [String], default: [] })
  combinaisons!: string[];
}

// Schéma pour les statistiques Learning
@Schema({ _id: false })
export class LearningStats {
  @Prop({ required: false })
  totalTime!: string;

  @Prop({ required: false, default: 0 })
  averageScore!: number;

  @Prop({ required: false })
  completedAt!: string;

  @Prop({ required: false, default: 0 })
  totalMatches!: number;

  @Prop({ required: false, default: 0 })
  totalTrouves!: number;

  @Prop({ required: false, default: 0 })
  totalRates!: number;

  @Prop({ type: [MatchDetail], default: [] })
  matchesDetails!: MatchDetail[];
}

@Schema({ timestamps: true })
export class Consultation {
  // Informations client
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  clientId!: MongooseSchema.Types.ObjectId;

  // Référence au jeu/édition
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'GameConfiguration', required: true })
  idjeu!: MongooseSchema.Types.ObjectId;

  // Temps total passé
  @Prop({ required: false })
  timeSpent!: string;

  // Combinaison (pour les jeux de type nombre/lettre)
  @Prop({ required: false })
  combinaison!: string;

  // Paiement
  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId!: MongooseSchema.Types.ObjectId;

  // Localisation
  @Prop({ type: String, default: null })
  country!: string;

  // 🔥 NOUVEAUX CHAMPS POUR LEARNING
  
  // Statistiques Learning complètes
  @Prop({ type: LearningStats, default: null })
  learningStats!: LearningStats;

  // Score final (pour le classement)
  @Prop({ default: 0 })
  finalScore!: number;

  // Temps total en secondes (pour le classement)
  @Prop({ default: 0 })
  totalTimeSeconds!: number;

  // Nombre de matchs complétés
  @Prop({ default: 0 })
  matchesCompleted!: number;

  // Statut de la consultation
  @Prop({ 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'abandoned'],
    default: 'pending'
  })
  status!: string;

  // Date de début de partie (pour le calcul du temps)
  @Prop({ type: Date, default: null })
  gameStartDate!: Date;

  // Date de fin de partie
  @Prop({ type: Date, default: null })
  gameEndDate!: Date;

  // Niveau du jeu
  @Prop({ default: 0 })
  niveau!: number;

  // Type de jeu (0: Nombre, 1: Couleur, 2: Image, 3: Lettre, 4: Global)
  @Prop({ default: 0 })
  tpsglobal!: number;
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);

// Index pour optimiser les requêtes
ConsultationSchema.index({ clientId: 1, createdAt: -1 });
ConsultationSchema.index({ createdAt: -1 });
ConsultationSchema.index({ idjeu: 1, createdAt: -1 });
ConsultationSchema.index({ status: 1, createdAt: -1 });
ConsultationSchema.index({ finalScore: -1 }); // Pour le classement
ConsultationSchema.index({ totalTimeSeconds: 1 }); // Pour le classement par temps
ConsultationSchema.index({ clientId: 1, status: 1 }); // Pour les parties en cours d'un utilisateur