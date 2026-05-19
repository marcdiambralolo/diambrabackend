import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateGameConfigurationDto {
  @IsDateString()
  startgameDate!: Date;

  @IsDateString()
  endgameDate!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['pending', 'active', 'ended', 'cancelled'])
  status?: string;
}
