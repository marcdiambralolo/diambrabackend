// game-configuration.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameConfigurationDocument = GameConfiguration & Document;

@Schema({ timestamps: true })
export class GameConfiguration {
    @Prop({ required: true })
    startgameDate!: Date;

    @Prop({ required: true })
    endgameDate!: Date;

    @Prop({ default: false, index: true })
    isActive!: boolean;

    @Prop({
        default: 'pending',
        enum: ['pending', 'active', 'ended', 'cancelled'],
        index: true
    })
    status!: string;

    @Prop({ default: Date.now })
    createdAt?: Date;

    @Prop({ default: Date.now })
    updatedAt?: Date;
}

export const GameConfigurationSchema = SchemaFactory.createForClass(GameConfiguration);

// Ajout d'index composé pour les performances
GameConfigurationSchema.index({ isActive: 1, status: 1 });