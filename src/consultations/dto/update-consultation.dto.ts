import { PartialType } from '@nestjs/mapped-types';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { CreateConsultationDto } from './create-consultation.dto';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
  @IsString()
  @IsOptional()
  rubriqueId?: string; // Permet de modifier la rubrique liée

  @IsOptional()
  analysisNotified?: boolean;

  @IsOptional()
  tierce?: any;

  @IsOptional()
  tierces?: any;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}