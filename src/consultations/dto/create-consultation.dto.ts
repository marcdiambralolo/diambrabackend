import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ConsultationType } from '../../common/enums/consultation-status.enum';

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
  description!: string;

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
  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  rubriqueId?: string; // ObjectId de la rubrique, obligatoire

  @IsOptional()
  visible?: boolean;

  @IsEnum(ConsultationType)
  @IsOptional()
  type?: ConsultationType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

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