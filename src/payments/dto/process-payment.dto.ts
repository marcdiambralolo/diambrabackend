import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Token MoneyFusion du paiement à traiter',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Payload de paiement normalisé côté frontend',
    type: Object,
  })
  @IsObject()
  paymentData: Record<string, unknown>;
}