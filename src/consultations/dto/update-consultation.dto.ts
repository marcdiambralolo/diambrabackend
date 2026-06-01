import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsDate, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateConsultationDto, MatchDetailDto } from './create-consultation.dto';
import { Type } from 'class-transformer';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
  @IsOptional()
  @IsString()
  timeSpent?: string;
  
  @IsOptional()
  @IsString()
  combinaison?: string;

  // 🔥 Nouveaux champs pour la mise à jour Learning
  @IsOptional()
  @IsNumber()
  finalScore?: number;

  @IsOptional()
  @IsNumber()
  totalTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  matchesCompleted?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchDetailDto)
  matchesDetails?: MatchDetailDto[];

  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed', 'abandoned'])
  status?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  gameStartDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  gameEndDate?: Date;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}