import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderChoiceDto {
  @IsString()
  choiceId!: string;

  @IsNumber()
  order!: number;
}

export class ReorderGradeChoicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderChoiceDto)
  choices!: ReorderChoiceDto[];
}
