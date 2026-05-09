import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ChoiceOrderDto {
  @IsString()
  choiceId!: string;

  @IsNumber()
  order!: number;
}

export class ReorderChoicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceOrderDto)
  choices!: ChoiceOrderDto[];
}
