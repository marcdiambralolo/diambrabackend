import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class GradeRequirements {
  @Prop({ type: Number, required: true })
  consultations!: number;

  @Prop({ type: Number, required: true })
  rituels!: number;

  @Prop({ type: Number, required: true })
  livres!: number;
}

export const GradeRequirementsSchema = SchemaFactory.createForClass(
  GradeRequirements,
);


@Schema({ timestamps: true })
export class GradeConfig {
  @Prop({ type: Number, default: null })
  maxConsultations!: number | null;
  @Prop({ type: Number, default: null })
  minConsultations!: number | null;
  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
  @Prop({ type: Number, default: 0 })
  order!: number;
  @Prop({ type: String, default: null })
  slug!: string | null;
  @Prop({ type: [Object], default: [] })
  consultationChoices!: any[];
  @Prop({
    type: String,
    enum: [
      'NEOPHYTE',
      'ASPIRANT',
      'CONTEMPLATEUR',
      'CONSCIENT',
      'INTEGRATEUR',
      'TRANSMUTANT',
      'ALIGNE',
      'EVEILLE',
      'SAGE',
      'MAITRE_DE_SOI',
    ],
    required: true,
    unique: true,
  })
  grade!: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 9,
    unique: true,
  })
  level!: number;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({ type: GradeRequirementsSchema, required: true })
  requirements!: GradeRequirements;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GradeConfigSchema = SchemaFactory.createForClass(GradeConfig);