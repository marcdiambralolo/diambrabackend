import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumeOfferingDto {
  @IsString()
  offeringId: string;

  @IsNotEmpty()
  quantity: number;
}

export class ConsumeOfferingsDto {
  @IsString()
  @IsNotEmpty()
  consultationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumeOfferingDto)
  offerings: ConsumeOfferingDto[];
}
