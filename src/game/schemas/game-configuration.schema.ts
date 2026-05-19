import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameConfigurationDocument = GameConfiguration & Document;

@Schema({ timestamps: true })
export class GameConfiguration {
  @Prop({ required: true, unique: true })
  startgameDate!: Date;

  @Prop({ required: true, unique: true })
  endgameDate!: Date;

  @Prop({ default: false })
  isActive!: boolean;

  @Prop({ default: 0 })
  totalParticipations!: number;

  @Prop({ type: [Number], default: [] })
  winningCombination!: number[];

  @Prop({ default: 0 })
  prizePool!: number;

  @Prop({ default: 'pending', enum: ['pending', 'active', 'ended', 'cancelled'] })
  status!: string;
}

export const GameConfigurationSchema = SchemaFactory.createForClass(GameConfiguration);
