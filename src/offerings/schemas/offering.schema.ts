import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Offering extends Document {
  // MongoDB will auto-generate _id
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  priceUSD!: number;

  @Prop({ required: true, enum: ['animal', 'vegetal', 'beverage'] })
  category!: string;

  @Prop({ required: true })
  description!: string;
}

export const OfferingSchema = SchemaFactory.createForClass(Offering);
