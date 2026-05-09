import { IsString } from 'class-validator';

export class VerifyDownloadDto {
  @IsString()
  token: string; // Token de téléchargement
}
