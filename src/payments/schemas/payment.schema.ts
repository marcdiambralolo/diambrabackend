import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { PaymentStatus, PaymentMethod } from '../../common/enums/payment-status.enum';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Consultation', required: false })
  consultationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'EUR' })
  currency: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ default: null })
  transactionId: string; // ID de la transaction externe (Stripe, PayPal, etc.)

  @Prop({ default: null })
  moneyFusionToken: string; // Token MoneyFusion (idempotence)

  @Prop({ type: Object, default: {} })
  metadata: {
    stripePaymentIntentId?: string;
    paypalOrderId?: string;
    [key: string]: any;
  };

  @Prop({ default: null })
  paidAt: Date;

  @Prop({ default: null })
  refundedAt: Date;

  @Prop({ default: 0 })
  refundAmount: number;

  @Prop({ default: null })
  errorMessage: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ consultationId: 1 });
PaymentSchema.index({ status: 1 });
