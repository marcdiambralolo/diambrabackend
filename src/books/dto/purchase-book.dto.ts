import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PurchaseBookOfferingDto {
  @IsString()
  offeringId!: string;

  @IsString()
  category!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;
}
