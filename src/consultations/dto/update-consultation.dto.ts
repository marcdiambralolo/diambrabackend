import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateConsultationDto } from './create-consultation.dto';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
  @IsString()
  @IsOptional()
  rubriqueId?: string;  
  
  @IsOptional()
  @IsString()
  result?: string;
}