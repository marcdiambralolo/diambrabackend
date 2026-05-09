import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class MoneyfusionCallbackDto {
  @ApiProperty({
    description: 'Token de paiement MoneyFusion',
    example: 'abcd1234efgh5678',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Données de paiement retournées par MoneyFusion',
    example: {
      montant: 200,
      numeroSend: '+33612345678',
      nomclient: 'Jean Dupont',
      reference: 'REF123456',
    },
  })
  @IsObject()
  @IsOptional()
  paymentData?: {
    montant: number;
    numeroSend: string;
    nomclient: string;
    reference?: string;
    date_paiement?: string;
  };
}
