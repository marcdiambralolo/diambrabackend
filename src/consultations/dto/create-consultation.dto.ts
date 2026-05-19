import {
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';

export class CreateConsultationDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;
}