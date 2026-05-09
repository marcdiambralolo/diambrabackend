import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

/**
 * Types de notifications disponibles
 */
export enum NotificationType {
  CONSULTATION_RESULT = 'CONSULTATION_RESULT', // Résultat de consultation disponible
  NEW_KNOWLEDGE = 'NEW_KNOWLEDGE', // Nouvelle connaissance partagée
  CONSULTATION_ASSIGNED = 'CONSULTATION_ASSIGNED', // Consultation attribuée (pour consultant)
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED', // Paiement confirmé
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT', // Annonce système
}

/**
 * Schéma MongoDB pour les notifications
 */
@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: MongooseSchema.Types.ObjectId; // Utilisateur destinataire

  @Prop({ type: String, enum: NotificationType, required: true })
  type!: NotificationType;

  @Prop({ required: true })
  title!: string; // Titre de la notification

  @Prop({ required: true })
  message!: string; // Message descriptif

  @Prop({ default: false })
  isRead!: boolean; // Lu ou non lu

  @Prop({ type: Object, default: {} })
  metadata!: {
    consultationId?: string;
    knowledgeId?: string;
    paymentId?: string;
    url?: string; // URL de redirection
    [key: string]: any;
  };

  @Prop()
  readAt?: Date; // Date de lecture

  @Prop()
  expiresAt?: Date; // Date d'expiration (optionnel)
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes pour optimiser les requêtes
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index pour auto-suppression
