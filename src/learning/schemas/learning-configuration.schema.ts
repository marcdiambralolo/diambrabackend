import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LearningConfigurationDocument = LearningConfiguration & Document;

@Schema({ timestamps: true })
export class LearningConfiguration {
    @Prop({ required: true })
    startgameDate!: Date;

    @Prop({ required: true })
    endgameDate!: Date;

    @Prop({ required: true })
    proclamationDate!: Date;

    @Prop({ required: false })
    sequence!: string;

    @Prop({ required: false })
    niveau!: number;

    @Prop({ required: true })
    numeromatch!: string;

    @Prop({ required: false })
    tpsglobal!: number;

    @Prop({ required: false })
    pieces!: string[];

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

export const LearningConfigurationSchema = SchemaFactory.createForClass(LearningConfiguration);

// Index composés pour les performances
LearningConfigurationSchema.index({ isActive: 1, status: 1 });
LearningConfigurationSchema.index({ status: 1, endgameDate: -1 });
LearningConfigurationSchema.index({ numeromatch: 1 });