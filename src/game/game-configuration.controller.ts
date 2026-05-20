import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';
import { GameConfigurationService } from './game-configuration.service';
import { GameConfigurationDocument } from './schemas/game-configuration.schema';

@Controller('game-configurations')
export class GameConfigurationController {
    constructor(private readonly service: GameConfigurationService) { }

    @Get('current-config')
    async getCurrentConfig() {
        const configs = await this.service.findAll();
        const activeConfig = configs.find((c: GameConfigurationDocument) => c.isActive && c.status === 'active');
        if (!activeConfig) {
            const today = new Date();
            const nextMonth = new Date(today);
            today.setMonth(today.getMonth() - 2);
            nextMonth.setMonth(today.getMonth() - 1);

            return {
                id: '',
                isActive: false,
                status: 'pending',
                startgameDate: today.toISOString(),
                endgameDate: nextMonth.toISOString(),
            };
        }

        return {
            id: activeConfig._id.toString(),
            isActive: activeConfig.isActive,
            status: activeConfig.status,
            startgameDate: activeConfig.startgameDate.toISOString(),
            endgameDate: activeConfig.endgameDate.toISOString(),
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

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateGameConfigurationDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}