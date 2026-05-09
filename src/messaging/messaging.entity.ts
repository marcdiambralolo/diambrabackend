import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  from!: string;  

  @Prop({ required: true })
  to!: string;  

  @Prop({ required: true })
  text!: string;

  @Prop({ default: 'sent' })
  status!: 'sent' | 'delivered' | 'read';
}

export const MessageSchema = SchemaFactory.createForClass(Message);
