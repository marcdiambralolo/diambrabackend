// src/learning/dto/create-learning-configuration.dto.ts
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLearningConfigurationDto {
    @IsDateString()
    startgameDate!: string;

    @IsDateString()
    endgameDate!: string;

    @IsOptional()
    @IsString()
    sequence?: string;

    @IsOptional()
    @IsNumber()
    niveau?: number;

    @IsOptional()
    @IsString()
    numeromatch?: string;

    @IsOptional()
    @IsNumber()
    tpsglobal?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pieces?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsIn(['pending', 'active', 'ended', 'cancelled'])
    status?: string;
}