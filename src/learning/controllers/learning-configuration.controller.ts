// src/learning/controllers/learning-configuration.controller.ts
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Logger,
    UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateLearningConfigurationDto } from '../dto/create-learning-configuration.dto';
import { UpdateLearningConfigurationDto } from '../dto/update-learning-configuration.dto';
import { LearningConfigurationService } from '../services/learning-configuration.service';
import { LearningConfigurationDocument } from '../schemas/learning-configuration.schema';

@ApiTags('Learning Configurations')
@Controller('learning-configurations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LearningConfigurationController {
    private readonly logger = new Logger(LearningConfigurationController.name);

    constructor(private readonly configService: LearningConfigurationService) { }

    // ============================================================================
    // ROUTES ADMIN
    // ============================================================================

    @Post()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Créer une configuration d\'apprentissage' })
    @ApiResponse({ status: 201, description: 'Configuration créée avec succès' })
    async create(@Body() createDto: CreateLearningConfigurationDto) {
        const config = await this.configService.create(createDto);
        return {
            success: true,
            message: 'Configuration créée avec succès',
            data: config,
        };
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Récupérer toutes les configurations' })
    async findAll() {
        const configurations = await this.configService.findAll();
        return {
            success: true,
            data: configurations,
            count: configurations.length,
        };
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Mettre à jour une configuration' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateLearningConfigurationDto) {
        const config = await this.configService.update(id, updateDto);
        return {
            success: true,
            message: 'Configuration mise à jour avec succès',
            data: config,
        };
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Supprimer une configuration' })
    async remove(@Param('id') id: string) {
        await this.configService.remove(id);
        return {
            success: true,
            message: 'Configuration supprimée avec succès',
        };
    }

    // ============================================================================
    // ROUTES PUBLIQUES / ACCÈS COMMUN
    // ============================================================================

    @Get('active')
    @ApiOperation({ summary: 'Récupérer la configuration active' })
    async getActive() {
        const config = await this.configService.getActiveConfig();
        return {
            success: true,
            data: config,
        };
    }

    @Get('current-config')
    @ApiOperation({ summary: 'Récupérer la configuration courante (active ou par défaut)' })
    async getCurrentConfig() {
        const configs = await this.configService.findAll();
        const activeConfig = configs.find((c: LearningConfigurationDocument) => c.isActive && c.status === 'active');

        if (!activeConfig) {
            return null;
        }

        // Vérifier si l'édition est expirée
        const now = new Date();
        const endDate = new Date(activeConfig.endgameDate);

        if (endDate < now && activeConfig.status === 'active') {
            await this.configService.endEdition(activeConfig._id.toString());
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
            createdAt: activeConfig.createdAt?.toISOString(),
            updatedAt: activeConfig.updatedAt?.toISOString(),
            duration: this.calculateDuration(
                activeConfig.startgameDate,
                activeConfig.endgameDate
            ),
            numeromatch: activeConfig.numeromatch,
            niveau: activeConfig.niveau,
        };
    }

    @Get('last-ended')
    @ApiOperation({ summary: 'Récupérer la dernière édition terminée' })
    async getLastEnded() {
        const config = await this.configService.findLastEnded();

        if (!config) {
            return {
                success: true,
                hasEndedEdition: false,
                message: 'Aucune édition terminée trouvée',
                configuration: null,
            };
        }

        return {
            success: true,
            hasEndedEdition: true,
            configuration: {
                id: config._id.toString(),
                isActive: config.isActive,
                status: config.status,
                startgameDate: config.startgameDate.toISOString(),
                endgameDate: config.endgameDate.toISOString(),
                createdAt: config.createdAt?.toISOString(),
                updatedAt: config.updatedAt?.toISOString(),
            },
        };
    }

    @Get('last-ended/summary')
    @ApiOperation({ summary: 'Récupérer un résumé de la dernière édition terminée' })
    async getLastEndedSummary() {
        const config = await this.configService.findLastEnded();

        if (!config) {
            return {
                success: true,
                hasEndedEdition: false,
                summary: null,
            };
        }

        return {
            success: true,
            hasEndedEdition: true,
            summary: {
                id: config._id.toString(),
                status: config.status,
                startDate: config.startgameDate.toISOString(),
                endDate: config.endgameDate.toISOString(),
                duration: this.calculateDuration(config.startgameDate, config.endgameDate),
            },
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une configuration par ID' })
    async findOne(@Param('id') id: string) {
        const config = await this.configService.findOne(id);
        return {
            success: true,
            data: config,
        };
    }

    @Get(':id/status')
    @ApiOperation({ summary: 'Vérifier le statut d\'une configuration' })
    async getStatus(@Param('id') id: string) {
        const status = await this.configService.getConfigStatus(id);
        return {
            success: true,
            ...status,
        };
    }

    // ============================================================================
    // ROUTES D'ADMINISTRATION (Terminaison, Vérification)
    // ============================================================================

    @Post(':id/end')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Terminer une édition manuellement' })
    async endEdition(@Param('id') id: string) {
        const config = await this.configService.endEdition(id);
        return {
            success: true,
            message: 'Édition terminée avec succès',
            data: config,
        };
    }

    @Post('check-expired')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Vérifier et terminer les éditions expirées' })
    async checkExpired() {
        const result = await this.configService.updateExpiredConfigurations();
        return {
            success: true,
            message: `${result.updated} édition(s) terminée(s)`,
            updated: result.updated,
        };
    }

    // ============================================================================
    // UTILITAIRES PRIVÉS
    // ============================================================================

    private calculateDuration(startDate: Date, endDate: Date): string {
        const diffInDays = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }
}