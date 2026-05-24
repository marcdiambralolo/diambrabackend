// game-configuration.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateGameConfigurationDto } from './dto/create-game-configuration.dto';
import { UpdateGameConfigurationDto } from './dto/update-game-configuration.dto';
import { GameConfiguration, GameConfigurationDocument } from './schemas/game-configuration.schema';
import { Consultation, ConsultationDocument } from '@/consultations/schemas/consultation.schema';

// Constantes pour la génération de combinaisons
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SLOT_COUNT = 4;

  export interface Winner {
  consultationId: string;
  clientId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  combination: string;
  timeSpent: number;
  createdAt: Date;
  rank: number;
  reward?: number;
}

// types/game-stats.interface.ts
export interface WinningStats {
  winningCombination: string;
  totalParticipants: number;
  exactWinners: Winner[];
  disorderedWinners: Winner[];
  statistics: GameStatistics;
}

export interface Winner {
  consultationId: string;
  clientId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  combination: string;
  rank: number;
  reward?: number;
}

export interface GameStatistics {
  // Statistiques générales
  totalConsultations: number;
  uniqueParticipants: number;
  
  // Statistiques des combinaisons
  mostFrequentDigits: number[];
  leastFrequentDigits: number[];
  combinationFrequency: Map<string, number>;
  
  // Statistiques de temps
  averageTimeSpent: number;
  fastestCompletion: {
    time: number;
    clientId: string;
    username: string;
  } | null;
  slowestCompletion: {
    time: number;
    clientId: string;
    username: string;
  } | null;
  
  // Distribution
  timeDistribution: {
    under30s: number;
    under60s: number;
    under120s: number;
    over120s: number;
  };
  
  // Pourcentages
  exactMatchPercentage: number;
  disorderedMatchPercentage: number;
  
  // Top participants
  topParticipants: {
    clientId: string;
    username: string;
    participations: number;
  }[];
}

// utils/combination.utils.ts
export class CombinationUtils {
  /**
   * Vérifie si deux combinaisons correspondent dans l'ordre exact
   */
  static isExactMatch(submitted: string, winning: string): boolean {
    return submitted === winning;
  }

  /**
   * Vérifie si deux combinaisons correspondent dans le désordre (mêmes chiffres)
   */
  static isDisorderedMatch(submitted: string, winning: string): boolean {
    if (submitted.length !== winning.length) return false;
    
    const submittedSorted = submitted.split('').sort().join('');
    const winningSorted = winning.split('').sort().join('');
    
    return submittedSorted === winningSorted;
  }

  /**
   * Calcule la fréquence des chiffres dans une liste de combinaisons
   */
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

  /**
   * Trouve les chiffres les plus fréquents
   */
  static getMostFrequentDigits(frequency: Map<number, number>, count: number = 3): number[] {
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([digit]) => digit);
  }

  /**
   * Trouve les chiffres les moins fréquents
   */
  static getLeastFrequentDigits(frequency: Map<number, number>, count: number = 3): number[] {
    return Array.from(frequency.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count)
      .map(([digit]) => digit);
  }
}

@Injectable()
export class GameConfigurationService {
  private readonly logger = new Logger(GameConfigurationService.name);

  constructor(
    @InjectModel(GameConfiguration.name)
    private gameConfigModel: Model<GameConfigurationDocument>,
        @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
  ) { }

  /**
   * Génère une combinaison aléatoire unique de 4 chiffres
   */
  private generateRandomCombination(): string {
    const shuffled = [...DIGITS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, SLOT_COUNT).join('');
  }

  /**
   * Termine une édition et lui assigne une combinaison gagnante aléatoire
   */
  private async finalizeEdition(id: string, reason: 'auto' | 'manual'): Promise<GameConfigurationDocument> {
    const winningCombination = this.generateRandomCombination();
    
    const updateData = {
      status: 'ended',
      isActive: false,
      winningCombination,
      updatedAt: new Date()
    };

    const updatedConfig = await this.gameConfigModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedConfig) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }

    this.logger.log(
      `Édition terminée (${reason}): ${id} | Combinaison gagnante: ${winningCombination}`
    );

    // TODO: Déclencher les récompenses pour les gagnants
    await this.distributeRewards(id, winningCombination);

    return updatedConfig;
  }

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

    // Trouver l'édition terminée la plus récente
    const endedGameConfig = await this.gameConfigModel
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
      this.logger.warn(`L'édition ${endedGameConfig._id} est terminée mais n'a pas de combinaison gagnante`);
    }

    // Récupérer toutes les consultations de cette édition (pour les stats)
    const allConsultations = await this.consultationModel
      .find({ idjeu: endedGameConfig._id })
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone email')
      .lean()
      .exec();

    // Calculer les statistiques et les gagnants
    const winningStats = winningCombination 
      ? this.calculateWinningStats(allConsultations, winningCombination)
      : null;

    // Récupérer les consultations paginées
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

  /**
   * Calcule toutes les statistiques et désigne les gagnants
   */
  private calculateWinningStats(consultations: any[], winningCombination: string): WinningStats {
    // Séparer les gagnants
    const exactWinners: Winner[] = [];
    const disorderedWinners: Winner[] = [];
    const allCombinations: string[] = [];
    
    // Maps pour les statistiques
    const clientParticipation = new Map<string, number>();
    const combinationFrequency = new Map<string, number>();
    
    // Traitement des consultations
    consultations.forEach(consultation => {
      const combination = consultation.combinaison;
      const client = consultation.clientId;
      
      if (!combination || !client) return;
      
      allCombinations.push(combination);
      
      // Compter les participations par client
      const clientId = client._id.toString();
      clientParticipation.set(clientId, (clientParticipation.get(clientId) || 0) + 1);
      
      // Compter la fréquence des combinaisons
      combinationFrequency.set(combination, (combinationFrequency.get(combination) || 0) + 1);
      
      // Vérifier les correspondances
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
      
      // Correspondance exacte (ordre parfait)
      if (CombinationUtils.isExactMatch(combination, winningCombination)) {
        exactWinners.push(winner);
      }
      
      // Correspondance dans le désordre (mêmes chiffres)
      if (CombinationUtils.isDisorderedMatch(combination, winningCombination)) {
        disorderedWinners.push(winner);
      }
    });
    
    // Trier les gagnants par temps (les plus rapides d'abord)
    const sortByTime = (a: Winner, b: Winner) => a.timeSpent - b.timeSpent;
    exactWinners.sort(sortByTime);
    disorderedWinners.sort(sortByTime);
    
    // Assigner les rangs
    exactWinners.forEach((winner, index) => { winner.rank = index + 1; });
    disorderedWinners.forEach((winner, index) => { winner.rank = index + 1; });
    
    // Calculer les fréquences des chiffres
    const digitFrequency = CombinationUtils.calculateDigitFrequency(allCombinations);
    
    // Statistiques de temps
    const times = consultations
      .filter(c => c.timeSpent && c.timeSpent > 0)
      .map(c => c.timeSpent);
    
    const averageTime = times.length > 0 
      ? times.reduce((a, b) => a + b, 0) / times.length 
      : 0;
    
    const fastest = times.length > 0
      ? {
          time: Math.min(...times),
          clientId: consultations.find(c => c.timeSpent === Math.min(...times))?.clientId?._id || '',
          username: consultations.find(c => c.timeSpent === Math.min(...times))?.clientId?.username || 'N/A',
        }
      : null;
    
    const slowest = times.length > 0
      ? {
          time: Math.max(...times),
          clientId: consultations.find(c => c.timeSpent === Math.max(...times))?.clientId?._id || '',
          username: consultations.find(c => c.timeSpent === Math.max(...times))?.clientId?.username || 'N/A',
        }
      : null;
    
    // Distribution des temps
    const timeDistribution = {
      under30s: times.filter(t => t < 30).length,
      under60s: times.filter(t => t >= 30 && t < 60).length,
      under120s: times.filter(t => t >= 60 && t < 120).length,
      over120s: times.filter(t => t >= 120).length,
    };
    
    // Pourcentages de correspondance
    const totalParticipants = consultations.length;
    const exactMatchCount = exactWinners.length;
    const disorderedMatchCount = disorderedWinners.length;
    
    // Top participants
    const topParticipants = Array.from(clientParticipation.entries())
      .map(([clientId, participations]) => {
        const client = consultations.find(c => c.clientId?._id.toString() === clientId)?.clientId;
        return {
          clientId,
          username: client?.username || 'N/A',
          participations,
        };
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
        fastestCompletion: fastest,
        slowestCompletion: slowest,
        timeDistribution,
        exactMatchPercentage: totalParticipants > 0 ? (exactMatchCount / totalParticipants) * 100 : 0,
        disorderedMatchPercentage: totalParticipants > 0 ? (disorderedMatchCount / totalParticipants) * 100 : 0,
        topParticipants,
      },
    };
  }

  

  async getWinnersByEdition(editionId: string, options?: {
  type?: 'exact' | 'disordered' | 'both';
  sortBy?: 'time' | 'date';
  limit?: number;
}): Promise<{
  exactWinners: Winner[];
  disorderedWinners: Winner[];
}> {
  const edition = await this.findOne(editionId);
  
  if (edition.status !== 'ended') {
    throw new Error(`L'édition ${editionId} n'est pas encore terminée`);
  }
  
  if (!edition.winningCombination) {
    throw new Error(`L'édition ${editionId} n'a pas de combinaison gagnante`);
  }
  
  const consultations: any[] = await this.consultationModel
    .find({ idjeu: editionId })
    .select('_id combinaison timeSpent createdAt clientId')
    .populate<{ clientId: any }>('clientId', 'username firstName lastName phone email')
    .lean()
    .exec();
  
  const exactWinners: Winner[] = [];
  const disorderedWinners: Winner[] = [];
  
  consultations.forEach(consultation => {
    const combination = consultation.combinaison;
    const client = consultation.clientId;
    
    if (!combination || !client) return;
    
    // Accès sécurisé aux propriétés du client
    const clientId = client._id?.toString() || client._id;
    const username = client.username || client.email?.split('@')[0] || 'Anonyme';
    const firstName = client.firstName || '';
    const lastName = client.lastName || '';
    const phone = client.phone || '';
    const email = client.email || '';
    
    const winner: Winner = {
      consultationId: consultation._id.toString(),
      clientId: clientId.toString(),
      username,
      firstName,
      lastName,
      phone,
      email,
      combination,
       timeSpent: consultation.timeSpent || 0,
       createdAt: consultation.createdAt as any as Date || new Date(),
      rank: 0,
    };
    
    // Correspondance exacte (ordre parfait)
    if (CombinationUtils.isExactMatch(combination, edition.winningCombination)) {
      exactWinners.push(winner);
    }
    
    // Correspondance dans le désordre (mêmes chiffres)
    if (CombinationUtils.isDisorderedMatch(combination, edition.winningCombination)) {
      disorderedWinners.push(winner);
    }
  });
  
  // Filtrer selon le type demandé
  let finalExactWinners = exactWinners;
  let finalDisorderedWinners = disorderedWinners;
  
  if (options?.type === 'exact') {
    finalDisorderedWinners = [];
  } else if (options?.type === 'disordered') {
    finalExactWinners = [];
  }
  
  // Trier selon le critère
  const sortBy = options?.sortBy || 'time';
  const sortFn = sortBy === 'time' 
    ? (a: Winner, b: Winner) => a.timeSpent - b.timeSpent
    : (a: Winner, b: Winner) => b.createdAt.getTime() - a.createdAt.getTime();
  
  finalExactWinners.sort(sortFn);
  finalDisorderedWinners.sort(sortFn);
  
  // Assigner les rangs
  finalExactWinners.forEach((winner, index) => { winner.rank = index + 1; });
  finalDisorderedWinners.forEach((winner, index) => { winner.rank = index + 1; });
  
  // Limiter le nombre si demandé
  if (options?.limit) {
    return {
      exactWinners: finalExactWinners.slice(0, options.limit),
      disorderedWinners: finalDisorderedWinners.slice(0, options.limit),
    };
  }
  
  return { 
    exactWinners: finalExactWinners, 
    disorderedWinners: finalDisorderedWinners 
  };
}

// Version alternative avec typage correct
async getWinnersByEditionTyped(editionId: string, options?: {
  type?: 'exact' | 'disordered' | 'both';
  sortBy?: 'time' | 'date';
  limit?: number;
}): Promise<{
  exactWinners: Winner[];
  disorderedWinners: Winner[];
}> {
  const edition = await this.findOne(editionId);
  
  if (edition.status !== 'ended') {
    throw new Error(`L'édition ${editionId} n'est pas encore terminée`);
  }
  
  if (!edition.winningCombination) {
    throw new Error(`L'édition ${editionId} n'a pas de combinaison gagnante`);
  }
  
  // Interface pour le document peuplé
  interface PopulatedConsultation {
    _id: any;
    combinaison: string;
    timeSpent: number;
    createdAt: Date;
    clientId: {
      _id: any;
      username?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
    };
  }
  
  const consultations = await this.consultationModel
    .find({ idjeu: editionId })
    .select('_id combinaison timeSpent createdAt clientId')
    .populate('clientId', 'username firstName lastName phone email')
    .lean()
    .exec() as unknown as PopulatedConsultation[];
  
  const exactWinners: Winner[] = [];
  const disorderedWinners: Winner[] = [];
  
  for (const consultation of consultations) {
    const combination = consultation.combinaison;
    const client = consultation.clientId;
    
    if (!combination || !client) continue;
    
    const winner: Winner = {
      consultationId: consultation._id.toString(),
      clientId: client._id.toString(),
      username: client.username || 'Anonyme',
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      phone: client.phone || '',
      email: client.email || '',
      combination,
      timeSpent: consultation.timeSpent || 0,
      createdAt: consultation.createdAt,
      rank: 0,
    };
    
    const isExact = CombinationUtils.isExactMatch(combination, edition.winningCombination);
    const isDisordered = CombinationUtils.isDisorderedMatch(combination, edition.winningCombination);
    
    if (isExact) {
      exactWinners.push(winner);
    }
    
    if (isDisordered && !isExact) { // Éviter les doublons si exact match aussi
      disorderedWinners.push(winner);
    }
  }
  
  // Application des filtres et tris
  let exactResults = exactWinners;
  let disorderedResults = disorderedWinners;
  
  switch (options?.type) {
    case 'exact':
      disorderedResults = [];
      break;
    case 'disordered':
      exactResults = [];
      break;
    default: // 'both' ou undefined
      break;
  }
  
  const sortBy = options?.sortBy || 'time';
  const sortFn = sortBy === 'time'
    ? (a: Winner, b: Winner) => a.timeSpent - b.timeSpent
    : (a: Winner, b: Winner) => b.createdAt.getTime() - a.createdAt.getTime();
  
  exactResults.sort(sortFn);
  disorderedResults.sort(sortFn);
  
  // Attribution des rangs après tri
  exactResults.forEach((winner, idx) => { winner.rank = idx + 1; });
  disorderedResults.forEach((winner, idx) => { winner.rank = idx + 1; });
  
  // Application de la limite
  if (options?.limit) {
    exactResults = exactResults.slice(0, options.limit);
    disorderedResults = disorderedResults.slice(0, options.limit);
  }
  
  return {
    exactWinners: exactResults,
    disorderedWinners: disorderedResults,
  };
}

// Version avec agrégation MongoDB (plus performante pour grands volumes)
async getWinnersByEditionAggregate(editionId: string, options?: {
  type?: 'exact' | 'disordered' | 'both';
  sortBy?: 'time' | 'date';
  limit?: number;
}) {
  const edition = await this.findOne(editionId);
  
  if (edition.status !== 'ended') {
    throw new Error(`L'édition ${editionId} n'est pas encore terminée`);
  }
  
  if (!edition.winningCombination) {
    throw new Error(`L'édition ${editionId} n'a pas de combinaison gagnante`);
  }
  
  const pipeline: any[] = [
    // Filtrer par édition
    { $match: { idjeu: edition._id } },
    
    // Joindre avec la collection clients
    {
      $lookup: {
        from: 'users', // Nom de votre collection utilisateur
        localField: 'clientId',
        foreignField: '_id',
        as: 'client'
      }
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: false } },
    
    // Projeter les champs nécessaires
    {
      $project: {
        consultationId: { $toString: '$_id' },
        combinaison: 1,
        timeSpent: 1,
        createdAt: 1,
        clientId: { $toString: '$client._id' },
        username: { $ifNull: ['$client.username', 'Anonyme'] },
        firstName: { $ifNull: ['$client.firstName', ''] },
        lastName: { $ifNull: ['$client.lastName', ''] },
        phone: { $ifNull: ['$client.phone', ''] },
        email: { $ifNull: ['$client.email', ''] }
      }
    },
    
    // Ajouter les champs de correspondance
    {
      $addFields: {
        isExactMatch: {
          $eq: ['$combinaison', edition.winningCombination]
        },
        isDisorderedMatch: {
          $eq: [
            { $reduce: {
                input: { $split: ['$combinaison', ''] },
                initialValue: '',
                in: { $concat: ['$$value', '$$this'] }
            }},
            edition.winningCombination
          ]
        }
      }
    }
  ];
  
  // Filtrer selon le type
  if (options?.type === 'exact') {
    pipeline.push({ $match: { isExactMatch: true } });
  } else if (options?.type === 'disordered') {
    pipeline.push({ $match: { isDisorderedMatch: true, isExactMatch: false } });
  } else {
    pipeline.push({ $match: { $or: [{ isExactMatch: true }, { isDisorderedMatch: true }] } });
  }
  
  // Tri
  const sortField = options?.sortBy === 'date' ? 'createdAt' : 'timeSpent';
  const sortOrder = options?.sortBy === 'date' ? -1 : 1;
  pipeline.push({ $sort: { [sortField]: sortOrder } });
  
  // Ajouter le rang
  pipeline.push({
    $group: {
      _id: null,
      winners: { $push: '$$ROOT' }
    }
  });
  
  pipeline.push({
    $unwind: {
      path: '$winners',
      includeArrayIndex: 'rank'
    }
  });
  
  pipeline.push({
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          '$winners',
          { rank: { $add: ['$rank', 1] } }
        ]
      }
    }
  });
  
  // Limite
  if (options?.limit) {
    pipeline.push({ $limit: options.limit });
  }
  
  const results = await this.consultationModel.aggregate(pipeline).exec();
  
  // Séparer les gagnants
  const exactWinners = results
    .filter(r => r.isExactMatch)
    .map(r => ({
      consultationId: r.consultationId,
      clientId: r.clientId,
      username: r.username,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      combination: r.combinaison,
      timeSpent: r.timeSpent,
      createdAt: r.createdAt,
      rank: r.rank
    }));
  
  const disorderedWinners = results
    .filter(r => !r.isExactMatch && r.isDisorderedMatch)
    .map(r => ({
      consultationId: r.consultationId,
      clientId: r.clientId,
      username: r.username,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      combination: r.combinaison,
      timeSpent: r.timeSpent,
      createdAt: r.createdAt,
      rank: r.rank
    }));
  
  return { exactWinners, disorderedWinners };
}

  /**
   * Exporte les résultats complets d'une édition (CSV/JSON)
   */
  // async exportEditionResults(editionId: string): Promise<{
  //   edition: any;
  //   winners: {
  //     exact: Winner[];
  //     disordered: Winner[];
  //   };
  //   statistics: GameStatistics;
  //   allParticipants: any[];
  // }> {
  //   const edition = await this.findOne(editionId);
  //   const winningStats = await this.getEndedGameConsultationsWithStats({
  //     page: 1,
  //     limit: 999999,
  //   });
    
  //   return {
  //     edition: {
  //       id: edition._id,
  //       startDate: edition.startgameDate,
  //       endDate: edition.endgameDate,
  //       winningCombination: edition.winningCombination,
  //       status: edition.status,
  //     },
  //     winners: {
  //       exact: winningStats.winningStats?.exactWinners || [],
  //       disordered: winningStats.winningStats?.disorderedWinners || [],
  //     },
  //     statistics: winningStats.winningStats?.statistics!,
  //     allParticipants: winningStats.consultations,
  //   };
  // }

  /**
   * Distribue les récompenses aux gagnants (à implémenter)
   */
  private async distributeRewards(editionId: string, winningCombination: string): Promise<void> {
    try {
      // Récupérer toutes les consultations pour cette édition
      // Filtrer celles dont la combinaison correspond
      // Distribuer les récompenses
      this.logger.log(`Distribution des récompenses pour l'édition ${editionId} - Combinaison: ${winningCombination}`);
      
      // À implémenter selon votre logique métier
      // await this.rewardService.distributeForEdition(editionId, winningCombination);
    } catch (error) {
      this.logger.error(`Erreur lors de la distribution des récompenses pour ${editionId}:`, error);
    }
  }

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

  /**
   * CRON JOB : Vérifie toutes les minutes si des éditions sont terminées
   * et leur assigne une combinaison gagnante aléatoire
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateExpiredConfigurations() {
    const now = new Date();

    // Trouver les configurations actives dont la date de fin est dépassée
    const expiredConfigs = await this.gameConfigModel.find({
      isActive: true,
      status: 'active',
      endgameDate: { $lt: now }
    }).exec();

    let updatedCount = 0;

    for (const config of expiredConfigs) {
      this.logger.log(
        `Édition terminée automatiquement: ${config._id} (fin le ${config.endgameDate})`
      );

      await this.finalizeEdition(config._id.toString(), 'auto');
      updatedCount++;
    }

    if (updatedCount > 0) {
      this.logger.log(`${updatedCount} édition(s) terminée(s) automatiquement avec combinaison gagnante`);
    }

    return { updated: updatedCount };
  }

  /**
   * Méthode manuelle pour terminer une édition
   */
  async endEdition(id: string): Promise<GameConfigurationDocument> {
    const config = await this.findOne(id);

    if (config.endgameDate > new Date()) {
      this.logger.warn(`Tentative de terminer une édition avant sa date de fin: ${id}`);
    }

    if (config.status === 'ended') {
      this.logger.warn(`L'édition ${id} est déjà terminée`);
      return config;
    }

    return this.finalizeEdition(id, 'manual');
  }

  /**
   * Trouver la dernière édition terminée
   */
  async findLastEnded(): Promise<GameConfigurationDocument | null> {
    return this.gameConfigModel
      .findOne({ status: 'ended' })
      .sort({ endgameDate: -1, updatedAt: -1 })
      .exec();
  }

  /**
   * Trouver toutes les éditions terminées
   */
  async findAllEnded(limit: number = 5): Promise<GameConfigurationDocument[]> {
    return this.gameConfigModel
      .find({ status: 'ended' })
      .sort({ endgameDate: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Vérifier si une édition est terminée
   */
  async isEditionEnded(id: string): Promise<boolean> {
    const config = await this.findOne(id);
    return config.status === 'ended' || new Date(config.endgameDate) < new Date();
  }

  /**
   * Vérifier l'état actuel d'une configuration
   */
  async getConfigStatus(id: string): Promise<{
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

    // Mettre à jour le statut si expiré
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

  /**
   * Récupérer la combinaison gagnante d'une édition terminée
   */
  async getWinningCombination(id: string): Promise<string | null> {
    const config = await this.findOne(id);
    
    if (config.status !== 'ended') {
      this.logger.warn(`Tentative de récupération de la combinaison gagnante pour une édition non terminée: ${id}`);
      return null;
    }
    
    return config.winningCombination || null;
  }

  /**
   * Vérifier si une combinaison est gagnante pour une édition
   */
  async isWinningCombination(id: string, combination: string): Promise<boolean> {
    const winningCombination = await this.getWinningCombination(id);
    
    if (!winningCombination) {
      return false;
    }
    
    return winningCombination === combination;
  }

  /**
   * Forcer la régénération d'une combinaison gagnante (utile pour le debugging)
   */
  async regenerateWinningCombination(id: string): Promise<GameConfigurationDocument> {
    const config = await this.findOne(id);
    
    if (config.status !== 'ended') {
      throw new Error(`Impossible de régénérer la combinaison: l'édition ${id} n'est pas terminée`);
    }
    
    const newCombination = this.generateRandomCombination();
    
    const updatedConfig = await this.gameConfigModel
      .findByIdAndUpdate(id, { 
        $set: { 
          winningCombination: newCombination,
          updatedAt: new Date()
        } 
      }, { new: true })
      .exec();
      
    this.logger.log(`Combinaison régénérée pour l'édition ${id}: ${newCombination}`);
    
    return updatedConfig as GameConfigurationDocument;
  }
}