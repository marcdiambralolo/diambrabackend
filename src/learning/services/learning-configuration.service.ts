// src/learning/services/learning-configuration.service.ts
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { CreateLearningConfigurationDto } from '../dto/create-learning-configuration.dto';
import { UpdateLearningConfigurationDto } from '../dto/update-learning-configuration.dto';
import { LearningConfiguration, LearningConfigurationDocument } from '../schemas/learning-configuration.schema';
// src/learning/services/learning-configuration.service.ts
import { Winner, WinningStats } from '@/common/interfaces';
import { Consultation, ConsultationDocument } from '@/consultations/schemas/consultation.schema';

// Constantes pour la génération de combinaisons (pour learning)
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SLOT_COUNT = 3;

// ============================================================================
// UTILITAIRES DE COMBINAISON
// ============================================================================

export class CombinationUtils {
  static isExactMatch(submitted: string, winning: string): boolean {
    return submitted === winning;
  }

  static isDisorderedMatch(submitted: string, winning: string): boolean {
    if (submitted.length !== winning.length) return false;
    const submittedSorted = submitted.split('').sort().join('');
    const winningSorted = winning.split('').sort().join('');
    return submittedSorted === winningSorted;
  }

  static calculateDigitFrequency(combinations: string[]): Map<number, number> {
    const frequency = new Map<number, number>();
    combinations.forEach(combination => {
      combination.split('').forEach(digit => {
        const num = parseInt(digit);
        frequency.set(num, (frequency.get(num) || 0) + 1);
      });
    });
    return frequency;
  }

  static getMostFrequentDigits(frequency: Map<number, number>, count: number = 3): number[] {
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([digit]) => digit);
  }

  static getLeastFrequentDigits(frequency: Map<number, number>, count: number = 3): number[] {
    return Array.from(frequency.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count)
      .map(([digit]) => digit);
  }
}

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

@Injectable()
export class LearningConfigurationService {
    private readonly logger = new Logger(LearningConfigurationService.name);

    constructor(
    @InjectModel(LearningConfiguration.name)
    private learningConfigModel: Model<LearningConfigurationDocument>,
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
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
  // GÉNÉRATION DE COMBINAISON
  // ==========================================================================

  private generateRandomCombination(): string {
    const shuffled = [...DIGITS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, SLOT_COUNT).join('');
  }

  // ==========================================================================
  // GESTION DES ÉDITIONS
  // ==========================================================================

  private async finalizeEdition(id: string, reason: 'auto' | 'manual'): Promise<LearningConfigurationDocument> {
    const winningCombination = this.generateRandomCombination();

    const updateData = {
      status: 'ended',
      isActive: false,
      winningCombination,
      updatedAt: new Date()
    };

    const updatedConfig = await this.learningConfigModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedConfig) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }

    this.logger.log(
      `Édition Learning terminée (${reason}): ${id} | Combinaison gagnante: ${winningCombination}`
    );

    await this.distributeRewards(id, winningCombination);

    return updatedConfig;
  }

  private async distributeRewards(editionId: string, winningCombination: string): Promise<void> {
    try {
      this.logger.log(`Distribution des récompenses pour l'édition Learning ${editionId} - Combinaison: ${winningCombination}`);
      // À implémenter selon votre logique métier
    } catch (error) {
      this.logger.error(`Erreur lors de la distribution des récompenses pour ${editionId}:`, error);
    }
  }

  // ==========================================================================
  // STATISTIQUES ET GAGNANTS
  // ==========================================================================

  async getEndedGameConsultationsWithStats(options: {
    page: number;
    limit: number;
  }): Promise<{
    consultations: any[];
    activeEdition: any;
    winningStats: WinningStats | null;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const endedGameConfig = await this.learningConfigModel
      .findOne({ status: 'ended' })
      .sort({ endgameDate: -1, updatedAt: -1 })
      .lean()
      .exec();

    if (!endedGameConfig) {
      return {
        consultations: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        activeEdition: null,
        winningStats: null,
      };
    }

    const winningCombination = endedGameConfig.winningCombination;

    if (!winningCombination) {
      this.logger.warn(`L'édition Learning ${endedGameConfig._id} est terminée mais n'a pas de combinaison gagnante`);
    }

    const allConsultations = await this.consultationModel
      .find({ idjeu: endedGameConfig._id })
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone email')
      .lean()
      .exec();

    const winningStats = winningCombination
      ? this.calculateWinningStats(allConsultations, winningCombination)
      : null;

    const filter = { idjeu: endedGameConfig._id };
    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone email')
        .populate('idjeu', 'startgameDate endgameDate status isActive winningCombination')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);

    return {
      consultations,
      activeEdition: {
        id: endedGameConfig._id.toString(),
        startDate: endedGameConfig.startgameDate,
        endDate: endedGameConfig.endgameDate,
        status: endedGameConfig.status,
        isActive: endedGameConfig.isActive,
        winningCombination: endedGameConfig.winningCombination,
      },
      winningStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private calculateWinningStats(consultations: any[], winningCombination: string): WinningStats {
    const exactWinners: Winner[] = [];
    const disorderedWinners: Winner[] = [];
    const allCombinations: string[] = [];
    const clientParticipation = new Map<string, number>();
    const combinationFrequency = new Map<string, number>();

    consultations.forEach(consultation => {
      const combination = consultation.combinaison;
      const client = consultation.clientId;
      if (!combination || !client) return;

      allCombinations.push(combination);
      const clientId = client._id.toString();
      clientParticipation.set(clientId, (clientParticipation.get(clientId) || 0) + 1);
      combinationFrequency.set(combination, (combinationFrequency.get(combination) || 0) + 1);

      const winner: Winner = {
        consultationId: consultation._id.toString(),
        clientId: clientId,
        username: client.username || 'N/A',
        firstName: client.firstName || 'N/A',
        lastName: client.lastName || 'N/A',
        phone: client.phone || 'N/A',
        combination: combination,
        timeSpent: consultation.timeSpent || 0,
        createdAt: consultation.createdAt,
        rank: 0,
      };

      if (CombinationUtils.isExactMatch(combination, winningCombination)) {
        exactWinners.push(winner);
      }
      if (CombinationUtils.isDisorderedMatch(combination, winningCombination)) {
        disorderedWinners.push(winner);
      }
    });

    const sortByTime = (a: Winner, b: Winner) => a.timeSpent - b.timeSpent;
    exactWinners.sort(sortByTime);
    disorderedWinners.sort(sortByTime);
    exactWinners.forEach((winner, index) => { winner.rank = index + 1; });
    disorderedWinners.forEach((winner, index) => { winner.rank = index + 1; });

    const digitFrequency = CombinationUtils.calculateDigitFrequency(allCombinations);
    const times = consultations.filter(c => c.timeSpent && c.timeSpent > 0).map(c => c.timeSpent);
    const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const fastest = times.length > 0 ? Math.min(...times) : 0;
    const slowest = times.length > 0 ? Math.max(...times) : 0;

    const fastestConsultation = times.length > 0 ? consultations.find(c => c.timeSpent === fastest) : null;
    const slowestConsultation = times.length > 0 ? consultations.find(c => c.timeSpent === slowest) : null;

    const timeDistribution = {
      under30s: times.filter(t => t < 30).length,
      under60s: times.filter(t => t >= 30 && t < 60).length,
      under120s: times.filter(t => t >= 60 && t < 120).length,
      over120s: times.filter(t => t >= 120).length,
    };

    const totalParticipants = consultations.length;
    const exactMatchCount = exactWinners.length;
    const disorderedMatchCount = disorderedWinners.length;

    const topParticipants = Array.from(clientParticipation.entries())
      .map(([clientId, participations]) => {
        const client = consultations.find(c => c.clientId?._id.toString() === clientId)?.clientId;
        return { clientId, username: client?.username || 'N/A', participations };
      })
      .sort((a, b) => b.participations - a.participations)
      .slice(0, 10);

    return {
      winningCombination,
      totalParticipants,
      exactWinners,
      disorderedWinners,
      statistics: {
        totalConsultations: consultations.length,
        uniqueParticipants: clientParticipation.size,
        mostFrequentDigits: CombinationUtils.getMostFrequentDigits(digitFrequency),
        leastFrequentDigits: CombinationUtils.getLeastFrequentDigits(digitFrequency),
        combinationFrequency,
        averageTimeSpent: averageTime,
        fastestCompletion: fastestConsultation ? {
          time: fastest,
          clientId: fastestConsultation.clientId?._id || '',
          username: fastestConsultation.clientId?.username || 'N/A',
        } : null,
        slowestCompletion: slowestConsultation ? {
          time: slowest,
          clientId: slowestConsultation.clientId?._id || '',
          username: slowestConsultation.clientId?.username || 'N/A',
        } : null,
        timeDistribution,
        exactMatchPercentage: totalParticipants > 0 ? (exactMatchCount / totalParticipants) * 100 : 0,
        disorderedMatchPercentage: totalParticipants > 0 ? (disorderedMatchCount / totalParticipants) * 100 : 0,
        topParticipants,
      },
    };
  }

  // ==========================================================================
  // CRUD
  // ==========================================================================

  async create2(createDto: CreateLearningConfigurationDto): Promise<LearningConfigurationDocument> {
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

  async findAll2(): Promise<LearningConfigurationDocument[]> {
    return this.learningConfigModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne2(id: string): Promise<LearningConfigurationDocument> {
    const config = await this.learningConfigModel.findById(id).exec();
    if (!config) {
      throw new NotFoundException(`Learning configuration with id ${id} not found`);
    }
    return config;
  }

  async update2(id: string, updateDto: UpdateLearningConfigurationDto): Promise<LearningConfigurationDocument> {
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
      throw new NotFoundException(`Learning configuration with id ${id} not found`);
    }

    return updatedConfig;
  }

  async remove2(id: string): Promise<LearningConfigurationDocument> {
    const deletedConfig = await this.learningConfigModel.findByIdAndDelete(id).exec();
    if (!deletedConfig) {
      throw new NotFoundException(`Learning configuration with id ${id} not found`);
    }
    return deletedConfig;
  }

  async getActiveConfig2(): Promise<LearningConfigurationDocument | null> {
    return this.learningConfigModel.findOne({ isActive: true, status: 'active' }).exec();
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
      await this.finalizeEdition(config._id.toString(), 'auto');
      updatedCount++;
    }

    if (updatedCount > 0) {
      this.logger.log(`${updatedCount} édition(s) Learning terminée(s) automatiquement avec combinaison gagnante`);
    }

    return { updated: updatedCount };
  }

  async endEdition2(id: string): Promise<LearningConfigurationDocument> {
    const config = await this.findOne(id);

    if (config.status === 'ended') {
      throw new ConflictException(`L'édition Learning ${id} est déjà terminée`);
    }

    if (config.endgameDate > new Date()) {
      this.logger.warn(`Tentative de terminer une édition Learning avant sa date de fin: ${id}`);
    }

    return this.finalizeEdition(id, 'manual');
  }

  async findLastEnded2(): Promise<LearningConfigurationDocument | null> {
    return this.learningConfigModel
      .findOne({ status: 'ended' })
      .sort({ endgameDate: -1, updatedAt: -1 })
      .exec();
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

  async getConfigStatus2(id: string): Promise<{
    id: string;
    status: string;
    isActive: boolean;
    isExpired: boolean;
    timeRemaining: number | null;
    winningCombination: string | null;
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
        winningCombination: updatedConfig.winningCombination || null
      };
    }

    return {
      id: config._id.toString(),
      status: config.status,
      isActive: config.isActive,
      isExpired,
      timeRemaining,
      winningCombination: config.winningCombination || null
    };
  }

  async getWinningCombination(id: string): Promise<string | null> {
    const config = await this.findOne(id);
    if (config.status !== 'ended') {
      this.logger.warn(`Tentative de récupération de la combinaison gagnante pour une édition Learning non terminée: ${id}`);
      return null;
    }
    return config.winningCombination || null;
  }

  async isWinningCombination(id: string, combination: string): Promise<boolean> {
    const winningCombination = await this.getWinningCombination(id);
    return winningCombination === combination;
  }

  async regenerateWinningCombination(id: string): Promise<LearningConfigurationDocument> {
    const config = await this.findOne(id);

    if (config.status !== 'ended') {
      throw new Error(`Impossible de régénérer la combinaison: l'édition Learning ${id} n'est pas terminée`);
    }

    const newCombination = this.generateRandomCombination();

    const updatedConfig = await this.learningConfigModel
      .findByIdAndUpdate(id, {
        $set: {
          winningCombination: newCombination,
          updatedAt: new Date()
        }
      }, { new: true })
      .exec();

    this.logger.log(`Combinaison régénérée pour l'édition Learning ${id}: ${newCombination}`);

    return updatedConfig as LearningConfigurationDocument;
  }


}