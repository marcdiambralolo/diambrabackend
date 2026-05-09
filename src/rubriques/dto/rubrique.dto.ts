import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConsultationOfferingDto {
  @IsString()
  category!: 'animal' | 'vegetal' | 'beverage';

  @IsString()
  offeringId!: string;

  @IsOptional()
  quantity?: number = 1;
}

 

class ConsultationChoiceDto {
  @IsOptional()
  @IsString()
  gradeId?: string;
  
  @IsOptional()
  order?: number;


  @IsOptional()
  @IsString()
  choiceId?: string;

  @IsOptional()
  @IsString()
  choiceTitle?: string;

  @IsOptional()
  @IsString()
  buttonStatus?: string;

  @IsOptional()
  hasActiveConsultation?: boolean;

  @IsOptional()
  @IsString()
  consultationId?: string | null;

  @IsOptional()
  consultationCount?: number;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  frequence?: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE';

  @IsString()
  @IsOptional()
  participants?: 'SOLO' | 'AVEC_TIERS' | 'GROUPE' | 'POUR_TIERS';

  offering!: {
    alternatives: ConsultationOfferingDto[];
  };
  @IsString()
  @IsOptional()
  prompt?: string;
  @IsString()
  @IsOptional()
  pdfFile?: string;
}

export class RubriqueDto {

  @IsOptional()
  @IsString()
  categorie: string = 'GENERAL';

  @IsOptional()
  @IsString()
  categorieId?: string;

  @IsString()
  titre!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  typeconsultation?: string;

  @IsString()
  @IsOptional()
  pdfFile?: string;
  @IsArray()
  consultationChoices!: ConsultationChoiceDto[];
}