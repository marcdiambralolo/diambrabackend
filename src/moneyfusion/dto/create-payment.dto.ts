import { Type } from 'class-transformer';
import { IsNumber, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleDto {
  @ApiProperty({ example: 1, description: 'Nombre de sacs' })
  @IsNumber()
  sac?: number;

  @ApiProperty({ example: 2, description: 'Nombre de chaussures' })
  @IsNumber()
  chaussure?: number;
}

export class PersonalInfoDto {
  @ApiPropertyOptional({ example: 42, description: 'ID utilisateur' })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ example: 99, description: 'ID commande' })
  @IsNumber()
  @IsOptional()
  orderId?: number;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 100, description: 'Montant total du paiement' })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({ type: [ArticleDto], description: 'Liste des articles à payer' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleDto)
  article: ArticleDto[];

  @ApiProperty({ example: '0600000000', description: 'Numéro du client à débiter' })
  @IsString()
  numeroSend: string;

  @ApiProperty({ example: 'Jean Dupont', description: 'Nom du client' })
  @IsString()
  nomclient: string;

  @ApiPropertyOptional({
    type: [PersonalInfoDto],
    description: 'Informations personnelles additionnelles',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalInfoDto)
  @IsOptional()
  personal_Info?: PersonalInfoDto[];

  @ApiPropertyOptional({
    example: 'https://votre-site.com/retour',
    description: 'URL de retour après paiement',
  })
  @IsString()
  @IsOptional()
  return_url?: string;

  @ApiPropertyOptional({
    example: 'https://votre-backend.com/moneyfusion/webhook',
    description: 'URL du webhook pour notifications MoneyFusion',
  })
  @IsString()
  @IsOptional()
  webhook_url?: string;
}
