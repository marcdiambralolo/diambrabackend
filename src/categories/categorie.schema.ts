import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategorieDocument = Categorie & Document;

@Schema({ timestamps: true })
export class Categorie {
  @Prop({ required: true })
  nom!: string;

  @Prop({ required: false, default: '' })
  description!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Rubrique' }], default: [] })
  rubriques!: Types.ObjectId[];
}

export const CategorieSchema = SchemaFactory.createForClass(Categorie);