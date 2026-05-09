import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class SimpleMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  fromUserId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  toUserId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  text!: string;

  @Prop({ required: false })
  subject?: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  phone?: string;
}

export type SimpleMessageDocument = SimpleMessage & Document;
export const SimpleMessageSchema = SchemaFactory.createForClass(SimpleMessage);
