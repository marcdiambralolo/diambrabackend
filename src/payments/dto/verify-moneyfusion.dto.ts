import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyMoneyfusionDto {
  @ApiProperty({
    description: 'Token de paiement MoneyFusion à vérifier',
    example: 'abcd1234efgh5678',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
