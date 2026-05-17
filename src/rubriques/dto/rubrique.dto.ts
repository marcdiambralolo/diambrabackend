import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConsultationOfferingDto {
  @IsString()
  offeringId!: string;

  @IsOptional()
  quantity?: number = 1;
}

class ConsultationChoiceDto {
  @IsOptional()
  @IsString()
  choiceId?: string;

  @IsOptional()
  @IsString()
  choiceTitle?: string;
  
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

  offering!: {
    alternatives: ConsultationOfferingDto[];
  };

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

  @IsArray()
  consultationChoices!: ConsultationChoiceDto[];
}