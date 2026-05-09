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
  offering: {
    alternatives: Array<{
      category: string;
      offeringId: string;
      quantity: number;
      _id: string;
    }>;
  };

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  frequence: string;

  @IsString()
  participants: string;

  @IsString()
  _id: string;
}

export class OfferingAlternativeDto {
  @IsString()
  offeringId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class RequiredOfferingDto {
  @IsString()
  type: 'animal' | 'vegetal' | 'boisson';

  @IsArray()
  alternatives: OfferingAlternativeDto[];

  @IsString()
  selectedAlternative: 'animal' | 'vegetal' | 'boisson';
}

export class RequiredOfferingDetailDto {
  @IsString()
  _id: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()

  @IsString()
  category: string;

  @IsNumber()
  @Min(1)
  quantity: number;
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
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    timeOfBirth?: string;
    countryOfBirth?: string;
    cityOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    country?: string;
    question?: string;
    username?: string;
    _id?: string;
    role?: string;
    customPermissions?: any[];
    isActive?: boolean;
    emailVerified?: boolean;
    preferences?: any;
    specialties?: any[];
    rating?: number;
    totalConsultations?: number;
    credits?: number;
    createdAt?: Date;
    updatedAt?: Date;
    __v?: number;
    lastLogin?: Date;
    dateNaissance?: Date;
    genre?: string;
    heureNaissance?: string;
    nom?: string;
    paysNaissance?: string;
    prenoms?: string;
    villeNaissance?: string;
    premium?: boolean;
    carteDuCiel?: any;
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
  alternatives?: OfferingAlternativeDto[];

  @IsArray()
  @IsOptional()
  requiredOfferingsDetails?: RequiredOfferingDetailDto[];

  @IsObject()
  @IsOptional()
  tierce?: any;

  @IsObject()
  @IsOptional()
  tierces?: any;

  @IsOptional()
  analysisNotified?: boolean;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  pdfFile?: string; // URL du fichier PDF associé à la consultation

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
   @IsString()
  choiceId?: string;
}