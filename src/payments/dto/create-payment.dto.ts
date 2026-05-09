import { IsString, IsEnum, IsNumber, Min, IsOptional, IsObject } from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-status.enum';

export class CreatePaymentDto {
  @IsString()
  consultationId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
