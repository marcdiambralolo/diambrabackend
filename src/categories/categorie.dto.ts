import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  nom: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  rubriques?: string[];  
}

export class UpdateCategorieDto {
  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  rubriques?: string[];
}