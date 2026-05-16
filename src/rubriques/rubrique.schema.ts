import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RubriqueDocument = Rubrique & Document;

@Schema({ _id: false })
export class OfferingAlternative {
  @Prop({ type: 'ObjectId', auto: true })
  _id?: string;

  @Prop({ type: String, required: true })
  offeringId!: string;

  @Prop({ type: Number, required: true, default: 1 })
  quantity!: number;

  @Prop({ type: String, required: false })
  name?: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  image?: string;

  @Prop({ type: String, required: false })
  price?: string;

  @Prop({ type: String, required: false })
  priceUSD?: string;

  @Prop({ type: String, required: false })
  unit?: string;

  @Prop({ type: String, required: false })
  unitPrice?: string;

  @Prop({ type: String, required: false })
  unitQuantity?: string;

  @Prop({ type: String, required: false })
  unitTotal?: string;

  @Prop({ type: String, required: false })
  total?: string;

  @Prop({ type: String, required: false })
  totalPrice?: string;

  @Prop({ type: String, required: false })
  totalQuantity?: string;

  @Prop({ type: String, required: false })
  totalUnit?: string;

  @Prop({ type: String, required: false })
  totalUnitPrice?: string;

  @Prop({ type: String, required: false })
  totalUnitQuantity?: string;

  @Prop({ type: String, required: false })
  totalUnitTotal?: string;

}

export const OfferingAlternativeSchema = SchemaFactory.createForClass(OfferingAlternative);

@Schema({ _id: false })
export class Offering {
  @Prop({ type: [OfferingAlternativeSchema], required: true, default: [] })
  alternatives!: OfferingAlternative[];
}

export const OfferingSchema = SchemaFactory.createForClass(Offering);

@Schema()
export class ConsultationChoice {
  @Prop({ type: 'ObjectId', auto: true })
  _id?: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: OfferingSchema, required: true })
  offering!: Offering;
}

export const ConsultationChoiceSchema = SchemaFactory.createForClass(ConsultationChoice);

@Schema({ timestamps: true })
export class Rubrique {
  @Prop({ type: 'ObjectId', ref: 'Categorie', required: false })
  categorieId?: string;

  @Prop({ required: true })
  titre!: string;

  @Prop({ required: true })
  description!: string; 

  @Prop({ type: [ConsultationChoiceSchema], default: [] })
  consultationChoices!: ConsultationChoice[];
}

export const RubriqueSchema = SchemaFactory.createForClass(Rubrique);