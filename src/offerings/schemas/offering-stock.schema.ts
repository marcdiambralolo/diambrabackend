import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OfferingStockDocument = OfferingStock & Document;

@Schema({ timestamps: true })
export class OfferingStock {
  @Prop({ required: true, type: 'objectId', ref: 'Offering', unique: true })
  offeringId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  quantity!: number; 
  
  @Prop()
  category?: string;
    remainingQuantity: any;
}

export const OfferingStockSchema = SchemaFactory.createForClass(OfferingStock);
