import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class GradeRequirementsDto {
  @IsNumber()
  @Min(0)
  consultations!: number;

  @IsNumber()
  @Min(0)
  rituels!: number;

  @IsNumber()
  @Min(0)
  livres!: number;
}

export class CreateGradeConfigDto {
  @IsString()
  @IsEnum([
    'NEOPHYTE', 'ASPIRANT', 'CONTEMPLATEUR', 'CONSCIENT', 'INTEGRATEUR',
    'TRANSMUTANT', 'ALIGNE', 'EVEILLE', 'SAGE', 'MAITRE_DE_SOI',
  ])
  grade!: string;

  @IsNumber()
  @Min(0)
  @Max(9)
  level!: number;

  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => GradeRequirementsDto)
  requirements!: GradeRequirementsDto;

  @IsString()
  @IsOptional()
  description?: string;
}
