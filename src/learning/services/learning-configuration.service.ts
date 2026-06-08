import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { CreateLearningConfigurationDto } from '../dto/create-learning-configuration.dto';
import { UpdateLearningConfigurationDto } from '../dto/update-learning-configuration.dto';
import { LearningConfiguration, LearningConfigurationDocument } from '../schemas/learning-configuration.schema';

@Injectable()
export class LearningConfigurationService {
  private readonly logger = new Logger(LearningConfigurationService.name);

  constructor(
    @InjectModel(LearningConfiguration.name)
    private learningConfigModel: Model<LearningConfigurationDocument>,
  ) { }

  /**
   * Créer une nouvelle configuration
   */
  async create(createDto: CreateLearningConfigurationDto): Promise<LearningConfigurationDocument> {
    // Désactiver les autres configurations actives si celle-ci est active
    if (createDto.isActive) {
      await this.learningConfigModel.updateMany(
        { isActive: true },
        { $set: { isActive: false, status: 'ended' } }
      );
    }

    const newConfig = new this.learningConfigModel({
      ...createDto,
      startgameDate: new Date(createDto.startgameDate),
      endgameDate: new Date(createDto.endgameDate),
    });

    return newConfig.save();
  }

  /**
   * Récupérer toutes les configurations
   */
  async findAll(): Promise<LearningConfigurationDocument[]> {
    return this.learningConfigModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Récupérer une configuration par ID
   */
  async findOne(id: string): Promise<LearningConfigurationDocument> {
    const config = await this.learningConfigModel.findById(id).exec();
    if (!config) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }
    return config;
  }

  /**
   * Récupérer par numéro de match
   */
  async findByNumeromatch(numeromatch: string): Promise<LearningConfigurationDocument | null> {
    return this.learningConfigModel.findOne({ numeromatch }).exec();
  }

  /**
   * Récupérer la configuration active
   */
  async getActiveConfig(): Promise<LearningConfigurationDocument | null> {
    return this.learningConfigModel.findOne({ isActive: true, status: 'active' }).exec();
  }

  /**
   * Mettre à jour une configuration
   */
  async update(id: string, updateDto: UpdateLearningConfigurationDto): Promise<LearningConfigurationDocument> {
    if (updateDto.isActive) {
      await this.learningConfigModel.updateMany(
        { _id: { $ne: id }, isActive: true },
        { $set: { isActive: false, status: 'ended' } }
      );
    }

    const updatedConfig = await this.learningConfigModel
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

  /**
   * Supprimer une configuration
   */
  async remove(id: string): Promise<LearningConfigurationDocument> {
    const deletedConfig = await this.learningConfigModel.findByIdAndDelete(id).exec();
    if (!deletedConfig) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }
    return deletedConfig;
  }

  /**
   * Terminer une édition manuellement
   */
  async endEdition(id: string): Promise<LearningConfigurationDocument> {
    const config = await this.findOne(id);

    if (config.status === 'ended') {
      throw new ConflictException(`L'édition ${id} est déjà terminée`);
    }

    const updatedConfig = await this.learningConfigModel
      .findByIdAndUpdate(id, {
        $set: {
          status: 'ended',
          isActive: false,
          updatedAt: new Date()
        }
      }, { new: true })
      .exec();

    this.logger.log(`Édition terminée manuellement: ${id}`);
    return updatedConfig as LearningConfigurationDocument;
  }

  /**
   * CRON JOB : Vérifie toutes les minutes si des éditions sont terminées
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateExpiredConfigurations() {
    const now = new Date();

    const expiredConfigs = await this.learningConfigModel.find({
      isActive: true,
      status: 'active',
      endgameDate: { $lt: now }
    }).exec();

    let updatedCount = 0;

    for (const config of expiredConfigs) {
      this.logger.log(`Édition terminée automatiquement: ${config._id} (fin le ${config.endgameDate})`);
      await this.endEdition(config._id.toString());
      updatedCount++;
    }

    if (updatedCount > 0) {
      this.logger.log(`${updatedCount} édition(s) terminée(s) automatiquement`);
    }

    return { updated: updatedCount };
  }

  /**
   * Récupérer la dernière édition terminée
   */
  async findLastEnded(): Promise<LearningConfigurationDocument | null> {
    return this.learningConfigModel
      .findOne({ status: 'ended' })
      .sort({ endgameDate: -1, updatedAt: -1 })
      .exec();
  }

  /**
   * Vérifier le statut d'une configuration
   */
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

    if (isExpired && config.status === 'active') {
      await this.endEdition(id);
      const updatedConfig = await this.findOne(id);
      return {
        id: updatedConfig._id.toString(),
        status: updatedConfig.status,
        isActive: updatedConfig.isActive,
        isExpired,
        timeRemaining: null,
      };
    }

    return {
      id: config._id.toString(),
      status: config.status,
      isActive: config.isActive,
      isExpired,
      timeRemaining,
    };
  }

  // ==========================================================================
  // GESTION DES ÉDITIONS
  // ==========================================================================

  private async finalizeEdition(id: string): Promise<LearningConfigurationDocument> {
    const updateData = {
      status: 'ended',
      isActive: false,
      updatedAt: new Date()
    };

    const updatedConfig = await this.learningConfigModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedConfig) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }

    return updatedConfig;
  }

  // ==========================================================================
  // CRON JOB ET GESTION DES EXPIRATIONS
  // ==========================================================================

  @Cron(CronExpression.EVERY_MINUTE)
  async updateExpiredConfigurations2() {
    const now = new Date();

    const expiredConfigs = await this.learningConfigModel.find({
      isActive: true,
      status: 'active',
      endgameDate: { $lt: now }
    }).exec();

    let updatedCount = 0;

    for (const config of expiredConfigs) {
      this.logger.log(`Édition Learning terminée automatiquement: ${config._id} (fin le ${config.endgameDate})`);
      await this.finalizeEdition(config._id.toString());
      updatedCount++;
    }

    if (updatedCount > 0) {
      this.logger.log(`${updatedCount} édition(s) Learning terminée(s) automatiquement avec combinaison gagnante`);
    }

    return { updated: updatedCount };
  } 

  async findAllEnded(limit: number = 5): Promise<LearningConfigurationDocument[]> {
    return this.learningConfigModel
      .find({ status: 'ended' })
      .sort({ endgameDate: -1 })
      .limit(limit)
      .exec();
  }

  async isEditionEnded(id: string): Promise<boolean> {
    const config = await this.findOne(id);
    return config.status === 'ended' || new Date(config.endgameDate) < new Date();
  } 
}