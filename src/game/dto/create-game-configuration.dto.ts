import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGameConfigurationDto {
  @IsDateString()
  startgameDate!: Date;

  @IsDateString()
  endgameDate!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  totalParticipations?: number;

  @IsOptional()
  @IsArray()
  winningCombination?: number[];

  @IsOptional()
  @IsNumber()
  prizePool?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['pending', 'active', 'ended', 'cancelled'])
  status?: string;
}
