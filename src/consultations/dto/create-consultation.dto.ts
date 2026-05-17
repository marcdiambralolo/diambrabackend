import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class CreateConsultationDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  formData?: {
    [key: string]: any;
  };

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  choiceId?: string;
}