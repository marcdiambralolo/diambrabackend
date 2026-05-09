import { IsObject, IsEnum, IsOptional, IsString } from 'class-validator';

export enum AnalysisStatus {
  COMPLETED = 'completed',
  ERROR = 'error',
}

export class SaveAnalysisDto {
  @IsObject()
  analysis: any;

  @IsEnum(AnalysisStatus)
  status: AnalysisStatus;

  @IsOptional()
  consultationId?: string;

  @IsOptional()
  @IsString()
  choiceId?: string;

  @IsOptional()
  texte?: string;

  @IsOptional()
  clientId?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  completedDate?: Date;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  prompt?: string;

  @IsOptional()
  dateGeneration?: Date;
}