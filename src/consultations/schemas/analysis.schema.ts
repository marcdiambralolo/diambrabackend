import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'analyses', timestamps: true })
export class Analysis extends Document {
    @Prop({ required: true })
    consultationId: string;

    @Prop({ required: true, type: String })
    texte: string;

    @Prop({ required: false })
    clientId?: string;

    @Prop({ required: false })
    choiceId?: string;

    @Prop({ required: false })
    type?: string;

    @Prop({ required: false })
    status?: string;

    @Prop({ required: false })
    title?: string;

    @Prop({ required: false })
    completedDate?: Date;

    @Prop({ required: false, type: Object })
    metadata?: any;

    @Prop({ required: false })
    prompt?: string;

    @Prop({ required: false })
    dateGeneration?: Date;

    @Prop({ type: String, required: false })
    jobId?: string;

    @Prop({ type: Number, required: false, default: 0 })
    attempts?: number;

    @Prop({ type: String, required: false, default: null })
    errorMessage?: string | null;

    @Prop({ type: Date, required: false, default: null })
    startedAt?: Date | null;

    @Prop({ type: Date, required: false, default: null })
    finishedAt?: Date | null;

    /**
 * Indique si l'analyse a déjà été notifiée au client
 */
    @Prop({ type: Boolean, default: false })
    analysisNotified: boolean;
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis);
AnalysisSchema.set('toJSON', { virtuals: true });
AnalysisSchema.set('toObject', { virtuals: true });
AnalysisSchema.index({ consultationId: 1 });