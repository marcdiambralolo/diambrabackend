import { IsString, IsOptional } from 'class-validator';

export class UpdateChoicePromptDto {
  @IsOptional()
  @IsString()
  prompt?: string;
}
