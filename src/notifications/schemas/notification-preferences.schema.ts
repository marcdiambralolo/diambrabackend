import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationPreferencesDocument = NotificationPreferences & Document;

@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  consultationReady!: boolean;

  @Prop({ default: true })
  newKnowledge!: boolean;

  @Prop({ default: true })
  systemUpdates!: boolean;

  @Prop({ default: false })
  promotions!: boolean;

  @Prop({ default: true })
  emailNotifications!: boolean;

  @Prop({ default: false })
  pushNotifications!: boolean;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferences);
