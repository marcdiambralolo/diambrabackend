import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class ConsultationChoiceDto {
  @IsObject()
  offering!: {
    alternative: {
      category: string;
      offeringId: string;
      quantity: number;
      _id: string;
    };
  };

  @IsString()
  title!: string;

  @IsString()
  _id!: string;
}

export class OfferingAlternativeDto {
  @IsString()
  offeringId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class RequiredOfferingDto {
  @IsOptional()
  alternative!: OfferingAlternativeDto;
}

export class RequiredOfferingDetailDto {
  @IsString()
  _id!: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  category!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateConsultationDto {
  @IsOptional()
  visible?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  formData?: {
    username?: string;
    [key: string]: any;
  };

  @IsOptional()
  @Type(() => ConsultationChoiceDto)
  choice?: ConsultationChoiceDto;

  @IsDateString()
  @IsOptional()
  scheduledDate?: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsObject()
  @IsOptional()
  requiredOffering?: RequiredOfferingDto;

  @IsArray()
  @Type(() => OfferingAlternativeDto)
  @IsOptional()
  alternative?: OfferingAlternativeDto;

  @IsArray()
  @IsOptional()
  requiredOfferingsDetails?: RequiredOfferingDetailDto[];

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