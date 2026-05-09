import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OfferingItemDto {
  @IsString()
  offeringId: string;  

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  totalPrice?: number;
}


export class CreateWalletTransactionDto {
  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  paymentToken?: string;

  @IsEnum(['pending', 'completed', 'failed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';

  @IsNumber()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferingItemDto)
  items: OfferingItemDto[];

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  type?: 'purchase' | 'consumption' | 'refund';

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  completedAt?: Date;
}