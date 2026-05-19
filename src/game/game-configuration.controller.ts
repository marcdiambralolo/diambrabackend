import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';
import { GameConfigurationService } from './game-configuration.service';

@Controller('game-configurations')
export class GameConfigurationController {
    constructor(private readonly service: GameConfigurationService) { }

    @Get('current-config')
    async getCurrentConfig() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const configs = await this.service.findAll();

        const activeConfig = configs.find(c =>
            c.isActive && c.status === 'active'
        );

        if (!activeConfig) {
            return {
                isActive: true,
                status: 'active',
                startgameDate: today.toISOString(),
                endgameDate: new Date(today.setHours(23, 59, 59, 999)).toISOString(),
            };
        }

        const endDate = new Date(activeConfig.endgameDate);
        endDate.setHours(23, 59, 59, 999);

        return {
            isActive: activeConfig.isActive,
            status: activeConfig.status,
            startgameDate: activeConfig.startgameDate.toISOString(),
            endgameDate: endDate.toISOString(),
        };
    }

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

    // Dans game.controller.ts - Ajoutez cette méthode
    @Get('current-config2')
    async getCurrentConfig2() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const config = await this.service.findAll();
        const result = config[0];
        if (!result) {
            return {
                startDate: today.toISOString(),
                endDate: today.toISOString(),
            };
        }
        console.log(result);
        return {
            result,
        };
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
