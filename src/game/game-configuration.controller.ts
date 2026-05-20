// game-configuration.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Logger } from '@nestjs/common';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';
import { GameConfigurationService } from './game-configuration.service';
import { GameConfigurationDocument } from './schemas/game-configuration.schema';

@Controller('game-configurations')
export class GameConfigurationController {
    private readonly logger = new Logger(GameConfigurationController.name);

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

        // Vérifier si l'édition est expirée
        const now = new Date();
        const endDate = new Date(activeConfig.endgameDate);
        
        if (endDate < now && activeConfig.status === 'active') {
            // Mettre à jour le statut
            await this.service.endEdition(activeConfig._id.toString());
            activeConfig.status = 'ended';
            activeConfig.isActive = false;
            this.logger.log(`Configuration ${activeConfig._id} marquée comme terminée`);
        }

        return {
            id: activeConfig._id.toString(),
            isActive: activeConfig.isActive,
            status: activeConfig.status,
            startgameDate: activeConfig.startgameDate.toISOString(),
            endgameDate: activeConfig.endgameDate.toISOString(),
        };
    }

    // 🔥 Endpoint pour terminer manuellement une édition
    @Post(':id/end')
    async endEdition(@Param('id') id: string) {
        const config = await this.service.endEdition(id);
        return {
            success: true,
            message: 'Édition terminée avec succès',
            configuration: config
        };
    }

    // 🔥 Endpoint pour vérifier le statut d'une édition
    @Get(':id/status')
    async getStatus(@Param('id') id: string) {
        return this.service.getConfigStatus(id);
    }

    // 🔥 Endpoint pour déclencher manuellement la vérification des expirations
    @Post('check-expired')
    async checkExpired() {
        const result = await this.service.updateExpiredConfigurations();
        return {
            success: true,
            message: `${result.updated} édition(s) terminée(s)`,
            updated: result.updated
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