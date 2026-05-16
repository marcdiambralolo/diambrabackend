import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WalletTransactionDocument = WalletTransaction & Document;

@Schema({ timestamps: true })
export class OfferingItem {
  @Prop({ required: true, type: 'objectId', ref: 'Offering' })
  offeringId!: string; // _id de l'offrande

  @Prop({ required: false })
  quantity!: number;

  @Prop({ required: false })
  name!: string;

  @Prop({ required: false })
  unitPrice!: number;

  @Prop({ required: false })
  totalPrice!: number;
}

export const OfferingItemSchema = SchemaFactory.createForClass(OfferingItem);

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: false })
  userId!: string;

  @Prop({ required: false, unique: false, sparse: false })
  transactionId?: string;

  @Prop({ required: false })
  paymentToken?: string;

  @Prop({ required: false, enum: ['pending', 'completed', 'failed', 'cancelled'] })
  status?: string;

  @Prop({ required: false })
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