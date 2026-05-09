import { OfferingSchema, OfferingAlternative, OfferingAlternativeSchema } from '@/rubriques/rubrique.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookDocument = Book & Document;

@Schema({ _id: false })
export class Offering {
  @Prop({ type: [OfferingAlternativeSchema], required: true, default: [] })
  alternatives!: OfferingAlternative[];
}

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: false, default: function () { return this._id.toString(); } })
  bookId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: false })
  subtitle!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, default: 1 })
  pages!: number;

  @Prop({ required: false })
  category!: string;

  @Prop({ type: String, default: '' })
  author!: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating!: number;

  @Prop({ type: String, default: null })
  coverImage!: string; // URL de la couverture

  @Prop({ required: false })
  pdfFileName!: string; // Nom du fichier PDF dans /public/books/pdf/

  @Prop({ type: OfferingSchema, required: true })
  offering!: Offering;

  // @Prop({ type: Object, default: null })
  achat: any;

  @Prop({ default: true })
  isAvailable!: boolean; // Disponible à la vente

  @Prop({ default: true })
  isActive!: boolean; // Actif / Inactif

  @Prop({ default: 0 })
  downloadCount!: number; // Nombre de téléchargements

  @Prop({ default: 0 })
  purchaseCount!: number; // Nombre d'achats

  @Prop({ type: Date })
  createdAt?: Date;
  @Prop({ type: Date })
  updatedAt?: Date;
  deletedAt: any;
  __v: any;
}

export const BookSchema = SchemaFactory.createForClass(Book);

// Index pour recherche rapide
BookSchema.index({ category: 1 });
BookSchema.index({ isAvailable: 1 });