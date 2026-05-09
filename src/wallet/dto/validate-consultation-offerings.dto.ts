import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ConsumeOfferingDto } from './consume-offerings.dto';

export class ValidateConsultationOfferingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumeOfferingDto)
  offerings: ConsumeOfferingDto[];
}