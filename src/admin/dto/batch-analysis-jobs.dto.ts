import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId, IsString } from 'class-validator';

export class BatchAnalysisJobsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  consultationIds!: string[];
}

export class BatchAnalysisStatusesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  consultationIds!: string[];
}