// game-configuration.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';
import { GameConfiguration, GameConfigurationDocument } from './schemas/game-configuration.schema';

@Injectable()
export class GameConfigurationService {
  private readonly logger = new Logger(GameConfigurationService.name);

  constructor(
    @InjectModel(GameConfiguration.name)
    private gameConfigModel: Model<GameConfigurationDocument>,
  ) { }

  async create(createDto: CreateGameConfigurationDto): Promise<GameConfigurationDocument> {
    if (createDto.isActive) {
      await this.gameConfigModel.updateMany(
        { isActive: true },
        { $set: { isActive: false, status: 'ended' } }
      );
    }

    const newConfig = new this.gameConfigModel({
      ...createDto,
      startgameDate: new Date(createDto.startgameDate),
      endgameDate: new Date(createDto.endgameDate),
    });

    return newConfig.save();
  }

  async findAll(): Promise<GameConfigurationDocument[]> {
    return this.gameConfigModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<GameConfigurationDocument> {
    const config = await this.gameConfigModel.findById(id).exec();
    if (!config) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }
    return config;
  }

  async update(id: string, updateDto: UpdateGameConfigurationDto): Promise<GameConfigurationDocument> {
    if (updateDto.isActive) {
      await this.gameConfigModel.updateMany(
        { _id: { $ne: id }, isActive: true },
        { $set: { isActive: false, status: 'ended' } }
      );
    }

    const updatedConfig = await this.gameConfigModel
      .findByIdAndUpdate(id, {
        ...updateDto,
        ...(updateDto.startgameDate && { startgameDate: new Date(updateDto.startgameDate) }),
        ...(updateDto.endgameDate && { endgameDate: new Date(updateDto.endgameDate) }),
        updatedAt: new Date(),
      }, { new: true })
      .exec();

    if (!updatedConfig) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }

    return updatedConfig;
  }

  async remove(id: string): Promise<GameConfigurationDocument> {
    const deletedConfig = await this.gameConfigModel.findByIdAndDelete(id).exec();
    if (!deletedConfig) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }
    return deletedConfig;
  }

  async getActiveConfig(): Promise<GameConfigurationDocument | null> {
    return this.gameConfigModel.findOne({ isActive: true, status: 'active' }).exec();
  }

  // 🔥 CRON JOB : Vérifie toutes les minutes si des éditions sont terminées
  @Cron(CronExpression.EVERY_MINUTE)
  async updateExpiredConfigurations() {
    const now = new Date();

    // Trouver les configurations actives dont la date de fin est dépassée
    const expiredConfigs = await this.gameConfigModel.find({
      isActive: true,
      status: 'active',
      endgameDate: { $lt: now }
    }).exec();

    for (const config of expiredConfigs) {
      this.logger.log(`Édition terminée automatiquement: ${config._id} (fin le ${config.endgameDate})`);

      await this.gameConfigModel.findByIdAndUpdate(config._id, {
        $set: {
          status: 'ended',
          isActive: false,
          updatedAt: new Date()
        }
      }).exec();
    }

    if (expiredConfigs.length > 0) {
      this.logger.log(`${expiredConfigs.length} édition(s) terminée(s) automatiquement`);
    }

    return { updated: expiredConfigs.length };
  }

  // 🔥 Méthode manuelle pour terminer une édition
  async endEdition(id: string): Promise<GameConfigurationDocument> {
    const config = await this.findOne(id);

    if (config.endgameDate > new Date()) {
      this.logger.warn(`Tentative de terminer une édition avant sa date de fin: ${id}`);
    }

    const updatedConfig = await this.gameConfigModel.findByIdAndUpdate(id, {
      $set: {
        status: 'ended',
        isActive: false,
        updatedAt: new Date()
      }
    }, { new: true }).exec();

    this.logger.log(`Édition terminée manuellement: ${id}`);
    return updatedConfig as GameConfigurationDocument;
  }

  // 🔥 Vérifier l'état actuel d'une configuration
  async getConfigStatus(id: string): Promise<{
    id: string;
    status: string;
    isActive: boolean;
    isExpired: boolean;
    timeRemaining: number | null;
  }> {
    const config = await this.findOne(id);
    const now = new Date();
    const endDate = new Date(config.endgameDate);
    const isExpired = endDate < now;
    const timeRemaining = isExpired ? null : endDate.getTime() - now.getTime();

    // Mettre à jour le statut si expiré
    if (isExpired && config.status === 'active') {
      await this.endEdition(id);
      config.status = 'ended';
      config.isActive = false;
    }

    return {
      id: config._id.toString(),
      status: config.status,
      isActive: config.isActive,
      isExpired,
      timeRemaining
    };
  }
}