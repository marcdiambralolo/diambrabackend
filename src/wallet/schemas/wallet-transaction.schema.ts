import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WalletTransactionDocument = WalletTransaction & Document;

@Schema({ timestamps: true })
export class OfferingItem {
  @Prop({ required: true, type: 'objectId', ref: 'Offering' })
  offeringId!: string; // _id de l'offrande

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  name!: string;


  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  unitPrice!: number;

  @Prop({ required: true })
  totalPrice!: number;
}

export const OfferingItemSchema = SchemaFactory.createForClass(OfferingItem);

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: false, unique: false, sparse: true })
  transactionId?: string;

  @Prop({ required: false })
  paymentToken?: string;

  @Prop({ required: false, enum: ['pending', 'completed', 'failed', 'cancelled'] })
  status?: string;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ type: [OfferingItemSchema], default: [] })
  items!: OfferingItem[];

  @Prop({ required: false })
  paymentMethod?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: 'objectId', ref: 'Consultation', required: false })
  consultationId?: string;

  @Prop({ required: false, enum: ['purchase', 'consumption', 'refund'] })
  type?: string;

  @Prop()
  completedAt?: Date;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
