import { Offering } from '@/rubriques/rubrique.schema';
import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsOptional()
  bookId?: string;

  /** Objet offrandes associée à l'achat du livre */
  @IsOptional()
  offering?: Offering;

  @IsString()
  title!: string;

  @IsString()
  subtitle!: string;

  @IsString()
  @MinLength(50, { message: 'La description doit contenir au moins 50 caractères' })
  description!: string;

  @IsString()
  @IsOptional()
  author?: string;

  // En multipart, price arrive comme string, on le parsera dans le controller
  price!: number | string;

  // En multipart, pages arrive comme string
  pages!: number | string;

  // En multipart, pageCount peut être utilisé à la place de pages
  @IsOptional()
  pageCount?: number | string;

  @IsString()
  category!: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  pdfFileName?: string;

  // En multipart, isActive arrive comme string "true"/"false"
  @IsOptional()
  isActive?: boolean | string;
}

export class UpdateBookDto {
  @IsString()
  @IsOptional()
  title?: string;

  /** Objet offrandes associée à l'achat du livre */
  @IsOptional()
  offering?: Offering;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  pages?: number | string;

  @IsOptional()
  pageCount?: number | string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  pdfFileName?: string;

  @IsOptional()
  isActive?: boolean | string;

  @IsOptional()
  isAvailable?: boolean | string;
}