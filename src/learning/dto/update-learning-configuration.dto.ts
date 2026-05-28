// src/learning/dto/update-learning-configuration.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateLearningConfigurationDto } from './create-learning-configuration.dto';

export class UpdateLearningConfigurationDto extends PartialType(CreateLearningConfigurationDto) {}