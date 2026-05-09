import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BookPurchaseDocument = BookPurchase & Document;

@Schema({ timestamps: true })
export class BookPurchase {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  userId!: MongooseSchema.Types.ObjectId; // Utilisateur ayant acheté (peut être null pour invités)

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Book', required: true })
  bookId!: MongooseSchema.Types.ObjectId; // Référence au livre

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', required: true })
  paymentId!: MongooseSchema.Types.ObjectId; // Référence au paiement

  @Prop({ required: true })
  bookIdentifier!: string; // ID string du livre (ex: 'secrets-ancestraux')

  @Prop({ required: true })
  bookTitle!: string;

  @Prop({ required: true })
  customerName!: string; // Nom du client

  @Prop({ required: true })
  customerPhone!: string; // Téléphone du client

  @Prop()
  customerEmail!: string; // Email (optionnel)

  @Prop({ required: true, unique: true })
  downloadToken!: string; // Token unique pour téléchargement sécurisé

  @Prop({ default: 0 })
  downloadCount!: number; // Nombre de fois téléchargé

  @Prop()
  lastDownloadAt!: Date; // Dernière date de téléchargement

  @Prop({ default: null })
  expiresAt!: Date; // Date d'expiration du lien (null = pas d'expiration)
}

export const BookPurchaseSchema = SchemaFactory.createForClass(BookPurchase);

// Index pour recherche rapide
BookPurchaseSchema.index({ userId: 1, bookId: 1 });
BookPurchaseSchema.index({ paymentId: 1 });
BookPurchaseSchema.index({ customerPhone: 1 });