import { PartialType } from '@nestjs/mapped-types';
import { CreateGameConfigurationDto } from './create-game-configuration.dto';

export class UpdateGameConfigurationDto extends PartialType(CreateGameConfigurationDto) {}
