import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

export class GradeRequirementsDto {
  @IsOptional()
  consultations?: number;

  @IsOptional()
  rituels?: number;

  @IsOptional()
  livres?: number;
}

export class UpdateGradeConfigDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => GradeRequirementsDto)
  @IsOptional()
  requirements?: GradeRequirementsDto;
}
