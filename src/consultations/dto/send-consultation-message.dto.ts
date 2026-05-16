import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendConsultationMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;
}