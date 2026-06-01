import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';

export class MatchDetailDto {
  @IsOptional()
  @IsNumber()
  tpsglobal?: number;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  trouves?: number;

  @IsOptional()
  @IsNumber()
  rates?: number;

  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  @IsOptional()
  @IsBoolean()
  isgameover?: boolean;

  @IsOptional()
  @IsNumber()
  niveau?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  combinaisons?: string[];
}

// DTO pour les statistiques Learning
export class LearningStatsDto {
  @IsOptional()
  @IsString()
  totalTime?: string;

  @IsOptional()
  @IsNumber()
  averageScore?: number;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @IsNumber()
  totalMatches?: number;

  @IsOptional()
  @IsNumber()
  totalTrouves?: number;

  @IsOptional()
  @IsNumber()
  totalRates?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchDetailDto)
  matchesDetails?: MatchDetailDto[];
}

export class CreateConsultationDto {
 @IsString()
  @MaxLength(200)
  idjeu!: string; 
}