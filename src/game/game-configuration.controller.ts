import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { GameConfigurationService } from './game-configuration.service';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';

@Controller('game-configurations')
export class GameConfigurationController {
  constructor(private readonly service: GameConfigurationService) {}

  @Post()
  create(@Body() dto: CreateGameConfigurationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameConfigurationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
