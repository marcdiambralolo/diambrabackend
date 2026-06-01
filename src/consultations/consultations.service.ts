import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';
import { GameConfiguration, GameConfigurationDocument } from '@/game/schemas/game-configuration.schema';
import { EndedGameConsultationsResult, EndedLearningConsultationsResult, LearningStatisticsData, LearningWinnersData, StatisticsData } from '@/common/interfaces';
import { LearningConfiguration, LearningConfigurationDocument } from '@/learning/schemas/learning-configuration.schema';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(GameConfiguration.name)
    private gameConfigModel: Model<GameConfigurationDocument>,
     @InjectModel(LearningConfiguration.name)
    private learningConfigModel: Model<LearningConfigurationDocument>,
  ) { }

  private isPrivilegedConsultationRole(role: Role | undefined) {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }

  private resolveConsultationAccess(
    consultation: Pick<Consultation, 'clientId'>,
    user: Pick<UserDocument, '_id' | 'role'>,
  ) {
    const currentUserId = user._id.toString();
    const isPrivilegedRole = this.isPrivilegedConsultationRole(user.role);
    const isClientOwner = consultation.clientId?.toString() === currentUserId;

    return {
      currentUserId,
      isPrivilegedRole,
      isClientOwner,
      canAccess: isPrivilegedRole || isClientOwner,
    };
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const result = await this.consultationModel.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Récupérer les consultations d'un utilisateur par idjeu
   */
  async findByClientAndIdjeu2(
    clientId: string,
    idjeu: string,
    query: { page?: number; limit?: number }
  ): Promise<{
    consultations: ConsultationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 84600 } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      clientId: clientId,
      idjeu: idjeu
    };

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);

    return {
      consultations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Créer une nouvelle consultation
   */
  async create(clientId: string, createConsultationDto: CreateConsultationDto) {
   
    const { idjeu } = createConsultationDto;

    // Vérifier et convertir les IDs en ObjectId
    if (!Types.ObjectId.isValid(clientId)) {
        throw new Error(`Invalid clientId: ${clientId}`);
    }
    
    if (!idjeu || !Types.ObjectId.isValid(idjeu)) {
        throw new Error(`Invalid idjeu: ${idjeu}`);
    }

    const consultation = new this.consultationModel({
        clientId: new Types.ObjectId(clientId),  // Conversion explicite
        idjeu: new Types.ObjectId(idjeu),        // Conversion explicite
        isPaid: true,
        country: "Cote d'ivoire",
    });

    await consultation.save();

    await this.userModel.findByIdAndUpdate(
      clientId,
      {
        $inc: {
          totalConsultations: 1,
          consultationsCount: 1,
        },
      },
      { new: true }
    ).exec();

    const populatedConsultation = await consultation.populate(['clientId']);
    return {
      ...populatedConsultation.toObject(),
      id: populatedConsultation._id.toString(),
      consultationId: populatedConsultation._id.toString(),
    };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    clientId?: string;
  }) {
    const { page = 1, limit = 10000, clientId, } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (clientId) filter.clientId = clientId;

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);

    // Synchronisation FORCÉE du statut de la consultation avec l'analyse AVANT retour au frontend
    const normalizedConsultations = await Promise.all(
      consultations.map(async (consultation) => {
        // Synchronisation stricte : on force la mise à jour en base si besoin
        const updated = consultation;
        // On recharge l'objet si modifié pour garantir la cohérence
        if (updated && updated._id && updated.isModified && typeof updated.isModified === 'function' && updated.isModified()) {
          return this.consultationModel.findById(updated._id).exec();
        }
        return updated;
      }),
    );

    return {
      consultations: normalizedConsultations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer une consultation par ID
   */
  async findOne(id: string) {
    const consultation = await this.consultationModel.findById(id).exec();
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    return consultation;
  }

  async findOneForUser(
    id: string,
    user: Pick<UserDocument, '_id' | 'role'>,
  ) {
    const consultation = await this.findOne(id);
    const access = this.resolveConsultationAccess(consultation, user);

    if (!access.canAccess) {
      throw new ForbiddenException('You are not allowed to access this consultation');
    }

    return {
      consultation,
      access,
    };
  }

  /**
   * Mettre à jour une consultation
   */
  async update(id: string, updateConsultationDto: any) {
    console.log(updateConsultationDto);
    const currentConsultation = await this.consultationModel.findById(id).exec();

    if (!currentConsultation) {
      throw new NotFoundException('Consultation not found');
    }
    const consultation = await this.consultationModel
      .findByIdAndUpdate(id, updateConsultationDto)
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone')
      .populate('idjeu', 'startgameDate endgameDate status isActive')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const consultation = await this.consultationModel.findById(id).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Vérifier les permissions
    if (
      userRole !== Role.ADMIN &&
      userRole !== Role.SUPER_ADMIN &&
      consultation.clientId.toString() !== userId
    ) {
      throw new ForbiddenException('You can only delete your own consultations');
    }

    // Décrémenter les compteurs de consultations de l'utilisateur
    await this.userModel.findByIdAndUpdate(
      consultation.clientId,
      {
        $inc: {
          totalConsultations: -1,
          consultationsCount: 0,
        },
      },
      { new: true }
    ).exec();

    await this.consultationModel.findByIdAndDelete(id).exec();
  }

  /**
 * Récupérer les consultations par idjeu
 */
  async findByIdjeu(
    idjeu: string,
    query: { page?: number; limit?: number }
  ): Promise<{
    consultations: ConsultationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { idjeu: idjeu };

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);

    return {
      consultations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // consultations.service.ts
/**
 * Récupérer les consultations d'un utilisateur par idjeu avec les infos de l'édition
 */
async findByClientAndIdjeu(
  clientId: string,
  idjeu: string,
  query: { page?: number; limit?: number }
): Promise<{
  consultations: ConsultationDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  edition: GameConfigurationDocument | null; // 🔥 Ajout des infos de l'édition
}> {
  const { page = 1, limit = 84600 } = query;
  const skip = (page - 1) * limit;

  // 🔥 Récupérer les informations de l'édition
  const edition = await this.gameConfigModel.findById(idjeu).lean().exec();
  
  if (!edition) {
    throw new NotFoundException(`Edition with id ${idjeu} not found`);
  }

  const filter: any = {
    clientId: clientId,
    idjeu: idjeu
  };

  const [consultations, total] = await Promise.all([
    this.consultationModel
      .find(filter)
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone email country')
      .populate('idjeu', 'startgameDate endgameDate status isActive winningCombination')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean()
      .exec(),
    this.consultationModel.countDocuments(filter).exec(),
  ]);

  // Formater les consultations

  return {
    consultations: consultations as any,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    edition: edition as unknown as GameConfigurationDocument, // 🔥 Retourner l'édition
  };
}

  /**
   * Obtenir les statistiques des consultations
   */
  async getStatistics() {
    const [total, byStatus, byType, avgRating, totalRevenue] = await Promise.all([
      this.consultationModel.countDocuments().exec(),
      this.consultationModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.consultationModel.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      this.consultationModel.aggregate([
        { $match: { rating: { $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      this.consultationModel.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      avgRating: avgRating[0]?.avgRating || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }

  async findByClient2(userId: string, query: { page?: number; limit?: number }) {
    // Utilise l'enum pour le statut
    return this.findAll({ ...query, clientId: userId, });
  }

  // consultations.service.ts
// consultations.service.ts
// consultations.service.ts
async findByClient(
  userId: string, 
  query: { page?: number; limit?: number }
): Promise<{
  consultations: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  editions: any[];
}> {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const filter: any = { clientId: userId };

  const [consultationsDocs, total] = await Promise.all([
    this.consultationModel
      .find(filter)
      .select('_id combinaison timeSpent createdAt clientId idjeu')
      .populate('clientId', 'username firstName lastName phone email country')
      .populate('idjeu', 'startgameDate endgameDate status isActive winningCombination')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean() // On garde lean()
      .exec(),
    this.consultationModel.countDocuments(filter).exec(),
  ]);

  // 🔥 Solution magique : convertir en JSON et reparser
  const consultations = JSON.parse(JSON.stringify(consultationsDocs));

  // Le reste du code reste identique...
  const getObjectIdString = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    return String(id);
  };

  // Extraire les IDs uniques des éditions
  const editionIds = [...new Set(
    consultations
      .map((c: any )=> c.idjeu?._id)
      .filter(Boolean)
  )];

  // Récupérer les informations des éditions
  let editionsData: any[] = [];
  if (editionIds.length > 0) {
    const editionsDocs = await this.gameConfigModel
      .find({ _id: { $in: editionIds } })
      .select('_id startgameDate endgameDate status isActive winningCombination')
      .lean()
      .exec();
    
    editionsData = JSON.parse(JSON.stringify(editionsDocs));
  }

  // Créer un map des éditions par ID
  const editionsMap = new Map();
  editionsData.forEach(edition => {
    const editionId = getObjectIdString(edition._id);
    editionsMap.set(editionId, {
      id: editionId,
      startDate: edition.startgameDate,
      endDate: edition.endgameDate,
      status: edition.status,
      isActive: edition.isActive,
      winningCombination: edition.winningCombination || null,
    });
  });

  // Formater les consultations
  const formattedConsultations = consultations.map((consultation: any) => ({
    _id: getObjectIdString(consultation._id),
    combinaison: consultation.combinaison,
    timeSpent: consultation.timeSpent,
    createdAt: consultation.createdAt,
    clientId: consultation.clientId ? {
      _id: getObjectIdString(consultation.clientId._id),
      username: consultation.clientId.username || 'Anonyme',
      firstName: consultation.clientId.firstName || '',
      lastName: consultation.clientId.lastName || '',
      phone: consultation.clientId.phone || '',
      email: consultation.clientId.email || '',
      country: consultation.clientId.country || '',
    } : null,
    edition: consultation.idjeu?._id ? editionsMap.get(getObjectIdString(consultation.idjeu._id)) || null : null,
  }));

  return {
    consultations: formattedConsultations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    editions: Array.from(editionsMap.values()),
  };
}
  async findManyByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    const consultations = await this.consultationModel
      .find({ _id: { $in: ids } })
      .exec();

    return consultations;
  }

  // consultations.service.ts
  async getEndedGameConsultations(options: {
    page: number;
    limit: number;
  }): Promise<EndedGameConsultationsResult> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // 1. Trouver la dernière édition terminée
    const endedGameConfig = await this.gameConfigModel
      .findOne({ status: 'ended' })
      .sort({ updatedAt: -1, })
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
        winners: null,
        statistics: null,
      };
    }

    const winningCombination = endedGameConfig.winningCombination || "0123";
    const filter = { idjeu: endedGameConfig._id };

    // 2. Récupérer les consultations
    const [total, consultations, allConsultations] = await Promise.all([
      this.consultationModel.countDocuments(filter).exec(),

      // Consultations paginées
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate<{ clientId: any }>('clientId', 'username firstName lastName phone email country')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      winningCombination ? this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate<{ clientId: any }>('clientId', 'username firstName lastName phone email country')
        .lean()
        .exec() : Promise.resolve([])
    ]);

    // 3. Formater les consultations avec gestion correcte des ObjectId
    const formattedConsultations = consultations.map(consultation => {
      // Récupérer l'ID de consultation
      const consultationId = consultation._id
        ? typeof consultation._id === 'object' && 'toString' in consultation._id
          ? consultation._id.toString()
          : String(consultation._id)
        : '';

      // Récupérer les infos client
      const client = consultation.clientId;
      let formattedClient = null;

      if (client) {
        const clientId = client._id
          ? typeof client._id === 'object' && 'toString' in client._id
            ? client._id.toString()
            : String(client._id)
          : '';

        formattedClient = {
          _id: clientId,
          username: client.username || 'Anonyme',
          firstName: client.firstName || '',
          lastName: client.lastName || '',
          phone: client.phone || '',
          email: client.email || '',
          country: client.country || '',
        };
      }

      return {
        ...consultation,
        _id: consultationId,
        clientId: formattedClient,
        timeSpent: consultation.timeSpent ? `${consultation.timeSpent}s` : '0s',
      };
    });

    // 4. Calculer les gagnants et statistiques
    let winners = null;
    let statistics = null;

    const statsData = winningCombination && allConsultations.length > 0
      ? allConsultations
      : (winningCombination && consultations.length > 0 ? consultations : []);

    if (winningCombination && statsData.length > 0) {
      // Formater les données pour les stats
      const formattedStatsData = statsData.map(item => ({
        ...item,
        _id: item._id ? (typeof item._id === 'object' && 'toString' in item._id ? item._id.toString() : String(item._id)) : '',
        clientId: item.clientId ? {
          ...item.clientId,
          _id: item.clientId._id
            ? (typeof item.clientId._id === 'object' && 'toString' in item.clientId._id
              ? item.clientId._id.toString()
              : String(item.clientId._id))
            : ''
        } : null
      }));

      winners = this.calculateWinners(formattedStatsData, winningCombination);
      statistics = this.calculateStatistics(formattedStatsData, winningCombination, winners);
    }

    return {
      consultations: formattedConsultations,
      activeEdition: {
        id: endedGameConfig._id.toString(),
        startDate: endedGameConfig.startgameDate,
        endDate: endedGameConfig.endgameDate,
        status: endedGameConfig.status,
        isActive: endedGameConfig.isActive,
        winningCombination: winningCombination || null,
      },
      winners,
      statistics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

 

  async getEndedLearningConsultations(options: {
  page: number;
  limit: number;
}): Promise<EndedLearningConsultationsResult> {
  const { page, limit } = options;
  const skip = (page - 1) * limit;

  // 1. Trouver la dernière édition terminée
  const endedGameConfig = await this.learningConfigModel
    .findOne({ status: 'ended' })
    .sort({ updatedAt: -1 })
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
      winners: null,
      statistics: null,
    };
  }

  const winningCombination = endedGameConfig.winningCombination || null;
  const filter = { idjeu: endedGameConfig._id };

  // 2. Récupérer toutes les consultations pour l'édition
  const [total, consultations, allConsultations] = await Promise.all([
    this.consultationModel.countDocuments(filter).exec(),
    this.consultationModel
      .find(filter)
      .select('_id combinaison timeSpent createdAt clientId')
      .populate<{ clientId: any }>('clientId', 'username firstName lastName phone email country')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    this.consultationModel
      .find(filter)
      .select('_id combinaison timeSpent createdAt clientId')
      .populate<{ clientId: any }>('clientId', 'username firstName lastName phone email country')
      .lean()
      .exec()
  ]);

  // 3. Formater les consultations
  const formattedConsultations = consultations.map(consultation => this.formatConsultation(consultation));

  // 4. Calculer les gagnants et statistiques (basés sur le temps)
  let winners = null;
  let statistics = null;

  if (allConsultations.length > 0) {
    const formattedStatsData = allConsultations.map(item => this.formatConsultation(item));
    winners = this.calculateLearningWinners(formattedStatsData);
    statistics = this.calculateLearningStatistics(formattedStatsData, winners);
  }

  return {
    consultations: formattedConsultations,
    activeEdition: {
      id: endedGameConfig._id.toString(),
      startDate: endedGameConfig.startgameDate,
      endDate: endedGameConfig.endgameDate,
      status: endedGameConfig.status,
      isActive: endedGameConfig.isActive,
      winningCombination: winningCombination || null,
    },
    winners,
    statistics,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Formate une consultation
 */
private formatConsultation(consultation: any): any {
  const consultationId = this.getObjectIdString(consultation._id);
  const client = consultation.clientId;
  let formattedClient = null;

  if (client) {
    formattedClient = {
      _id: this.getObjectIdString(client._id),
      username: client.username || 'Anonyme',
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      phone: client.phone || '',
      email: client.email || '',
      country: client.country || '',
    };
  }

  return {
    ...consultation,
    _id: consultationId,
    clientId: formattedClient,
    timeSpent: consultation.timeSpent || 0,
  };
}

/**
 * Calcule les gagnants d'une édition Learning (basé sur le temps le plus petit)
 */
private calculateLearningWinners(consultations: any[]): LearningWinnersData {
  // Filtrer les consultations valides
  const validConsultations = consultations.filter(c => c.clientId && c.timeSpent > 0);
  
  // Grouper par client pour garder le meilleur temps de chaque joueur
  const bestTimesByUser = new Map<string, any>();
  
  validConsultations.forEach(consultation => {
    const clientId = this.getObjectIdString(consultation.clientId._id);
    const existing = bestTimesByUser.get(clientId);
    
    if (!existing || consultation.timeSpent < existing.timeSpent) {
      bestTimesByUser.set(clientId, {
        consultationId: this.getObjectIdString(consultation._id),
        clientId,
        username: consultation.clientId.username || 'Anonyme',
        firstName: consultation.clientId.firstName || '',
        lastName: consultation.clientId.lastName || '',
        phone: consultation.clientId.phone || '',
        email: consultation.clientId.email || '',
        country: consultation.clientId.country || '',
        timeSpent: consultation.timeSpent,
        combination: consultation.combinaison,
        createdAt: consultation.createdAt,
      });
    }
  });

  // Convertir en tableau et trier par temps (du plus petit au plus grand)
  const winners = Array.from(bestTimesByUser.values())
    .sort((a, b) => a.timeSpent - b.timeSpent)
    .map((winner, index) => ({
      ...winner,
      rank: index + 1,
    }));

  return {
    winners,
    totalParticipants: bestTimesByUser.size,
  };
}

/**
 * Calcule les statistiques complètes de l'édition Learning
 */
private calculateLearningStatistics(consultations: any[], winners: LearningWinnersData): LearningStatisticsData {
  const validConsultations = consultations.filter(c => c.clientId && c.timeSpent > 0);
  const times = validConsultations.map(c => c.timeSpent);
  
  // Top participants (ceux qui ont joué le plus)
  const clientParticipation = new Map<string, { username: string; count: number; bestTime: number }>();
  
  validConsultations.forEach(c => {
    const clientId = this.getObjectIdString(c.clientId._id);
    const username = c.clientId.username || 'Anonyme';
    const existing = clientParticipation.get(clientId);
    
    if (!existing) {
      clientParticipation.set(clientId, {
        username,
        count: 1,
        bestTime: c.timeSpent,
      });
    } else {
      existing.count++;
      if (c.timeSpent < existing.bestTime) {
        existing.bestTime = c.timeSpent;
      }
    }
  });

  const topParticipants = Array.from(clientParticipation.entries())
    .map(([clientId, data]) => ({
      clientId,
      username: data.username,
      participations: data.count,
      bestTime: data.bestTime,
    }))
    .sort((a, b) => b.participations - a.participations)
    .slice(0, 10);

  return {
    totalConsultations: consultations.length,
    totalParticipants: validConsultations.length,
    uniqueParticipants: clientParticipation.size,
    averageTimeSpent: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    fastestTime: times.length > 0 ? Math.min(...times) : 0,
    slowestTime: times.length > 0 ? Math.max(...times) : 0,
    timeDistribution: {
      under30s: times.filter(t => t < 30).length,
      under60s: times.filter(t => t >= 30 && t < 60).length,
      under120s: times.filter(t => t >= 60 && t < 120).length,
      over120s: times.filter(t => t >= 120).length,
    },
    topParticipants,
    winners,
  };
}

/**
 * Convertit un ObjectId en string
 */
private getObjectIdString(id: any): string {
  if (!id) return '';
  if (typeof id === 'object' && 'toString' in id) return id.toString();
  if (typeof id === 'string') return id;
  return String(id);
}

  /**
   * Calcule les gagnants d'une édition (version corrigée)
   */
  private calculateWinners(consultations: any[], winningCombination: string) {
    const exactWinners: any[] = [];
    const disorderedWinners: any[] = [];
    const exactSet = new Set<string>();
    const disorderedSet = new Set<string>();

    for (const consultation of consultations) {
      const combination = consultation.combinaison;
      const client = consultation.clientId;

      if (!combination || !client) continue;

      // Récupérer l'ID client de manière sécurisée
      let clientId = '';
      if (client._id) {
        if (typeof client._id === 'object' && 'toString' in client._id) {
          clientId = client._id.toString();
        } else if (typeof client._id === 'string') {
          clientId = client._id;
        } else {
          clientId = String(client._id);
        }
      } else if (typeof client === 'string') {
        clientId = client;
      } else {
        clientId = '';
      }

      const winnerData = {
        consultationId: consultation._id?.toString?.() || String(consultation._id),
        clientId: clientId,
        username: client.username || 'Anonyme',
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        phone: client.phone || '',
        email: client.email || '',
        combination,
        timeSpent: consultation.timeSpent || 0,
        createdAt: consultation.createdAt,
        country: client.country || '',
        rank: 0,
      };

      const isExact = this.isExactMatch(combination, winningCombination);
      const isDisordered = this.isDisorderedMatch(combination, winningCombination);

      // Éviter les doublons
      if (isExact && !exactSet.has(clientId)) {
        exactSet.add(clientId);
        exactWinners.push(winnerData);
      }

      if (isDisordered && !disorderedSet.has(clientId) && !exactSet.has(clientId)) {
        disorderedSet.add(clientId);
        disorderedWinners.push(winnerData);
      }
    }

    // Trier par temps
    const sortByTime = (a: any, b: any) => a.timeSpent - b.timeSpent;
    exactWinners.sort(sortByTime);
    disorderedWinners.sort(sortByTime);

    // Ajouter les rangs
    const addRanks = (winners: any[]) => {
      return winners.map((winner, index) => ({
        ...winner,
        rank: index + 1,
      }));
    };

    return {
      exact: addRanks(exactWinners),
      disordered: addRanks(disorderedWinners),
      totalExact: exactWinners.length,
      totalDisordered: disorderedWinners.length,
      totalWinners: exactWinners.length + disorderedWinners.length,
    };
  }

  /**
   * Calcule les statistiques complètes (version corrigée)
   */
  private calculateStatistics(consultations: any[], winningCombination: string, winners: any) {
    const validConsultations = consultations.filter(c => c.combinaison && c.clientId);
    const totalParticipants = validConsultations.length;

    if (totalParticipants === 0) {
      return this.getEmptyStatistics(winningCombination);
    }

    // Fréquence des chiffres
    const digitFrequency = new Map<number, number>();
    const allCombinations = validConsultations.map(c => c.combinaison);

    allCombinations.forEach((combination: string) => {
      if (combination && typeof combination === 'string') {
        combination.split('').forEach((digit: string) => {
          const num = parseInt(digit, 10);
          if (!isNaN(num)) {
            digitFrequency.set(num, (digitFrequency.get(num) || 0) + 1);
          }
        });
      }
    });

    // Temps de complétion
    const times = validConsultations
      .filter(c => c.timeSpent && typeof c.timeSpent === 'number' && c.timeSpent > 0)
      .map(c => c.timeSpent);

    const averageTime = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    const fastest = times.length > 0 ? Math.min(...times) : 0;
    const slowest = times.length > 0 ? Math.max(...times) : 0;

    const fastestConsultation = times.length > 0
      ? validConsultations.find(c => c.timeSpent === fastest)
      : null;

    const slowestConsultation = times.length > 0
      ? validConsultations.find(c => c.timeSpent === slowest)
      : null;

    // Distribution des temps
    const timeDistribution = {
      under30s: times.filter(t => t < 30).length,
      under60s: times.filter(t => t >= 30 && t < 60).length,
      under120s: times.filter(t => t >= 60 && t < 120).length,
      over120s: times.filter(t => t >= 120).length,
    };

    // Fréquence des combinaisons
    const combinationFrequency = new Map<string, number>();
    allCombinations.forEach(comb => {
      if (comb && typeof comb === 'string') {
        combinationFrequency.set(comb, (combinationFrequency.get(comb) || 0) + 1);
      }
    });

    const mostCommonCombination = Array.from(combinationFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([comb, count]) => ({
        combination: comb,
        count,
        percentage: (count / totalParticipants) * 100
      }));

    // Top participants
    const clientParticipation = new Map<string, { username: string; count: number }>();
    validConsultations.forEach(c => {
      const client = c.clientId;
      if (client) {
        let clientId = '';
        if (client._id) {
          if (typeof client._id === 'object' && 'toString' in client._id) {
            clientId = client._id.toString();
          } else if (typeof client._id === 'string') {
            clientId = client._id;
          } else {
            clientId = String(client._id);
          }
        }

        if (clientId) {
          const username = client.username || 'Anonyme';
          clientParticipation.set(clientId, {
            username,
            count: (clientParticipation.get(clientId)?.count || 0) + 1
          });
        }
      }
    });

    const topParticipants = Array.from(clientParticipation.entries())
      .map(([clientId, data]) => ({
        clientId,
        username: data.username,
        participations: data.count,
      }))
      .sort((a, b) => b.participations - a.participations)
      .slice(0, 10);

    // Calcul des pourcentages de fréquence des chiffres
    const totalDigitOccurrences = totalParticipants * 4;

    return {
      totalConsultations: consultations.length,
      totalParticipants,
      uniqueParticipants: clientParticipation.size,
      winningCombination,
      successRate: {
        exact: totalParticipants > 0 ? (winners.totalExact / totalParticipants) * 100 : 0,
        disordered: totalParticipants > 0 ? (winners.totalDisordered / totalParticipants) * 100 : 0,
        overall: totalParticipants > 0 ? (winners.totalWinners / totalParticipants) * 100 : 0,
      },
      digits: {
        frequency: Object.fromEntries(digitFrequency),
        mostFrequent: Array.from(digitFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([digit, count]) => ({
            digit,
            count,
            percentage: totalDigitOccurrences > 0 ? (count / totalDigitOccurrences) * 100 : 0
          })),
        leastFrequent: Array.from(digitFrequency.entries())
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([digit, count]) => ({
            digit,
            count,
            percentage: totalDigitOccurrences > 0 ? (count / totalDigitOccurrences) * 100 : 0
          })),
      },
      timeStats: {
        average: averageTime,
        fastest: {
          time: fastest,
          clientId: fastestConsultation?.clientId?._id?.toString?.() || null,
          username: fastestConsultation?.clientId?.username || null,
          combination: fastestConsultation?.combinaison || null,
        },
        slowest: {
          time: slowest,
          clientId: slowestConsultation?.clientId?._id?.toString?.() || null,
          username: slowestConsultation?.clientId?.username || null,
          combination: slowestConsultation?.combinaison || null,
        },
        distribution: timeDistribution,
      },
      combinations: {
        totalUnique: combinationFrequency.size,
        mostCommon: mostCommonCombination,
        diversity: totalParticipants > 0 ? (combinationFrequency.size / totalParticipants) * 100 : 0,
      },
      topParticipants,
      medals: {
        gold: winners.exact[0] || null,
        silver: winners.exact[1] || null,
        bronze: winners.exact[2] || null,
      },
    };
  }

  /**
   * Retourne des statistiques vides (quand aucun participant)
   */
  private getEmptyStatistics(winningCombination: string): StatisticsData {
    return {
      totalConsultations: 0,
      totalParticipants: 0,
      uniqueParticipants: 0,
      winningCombination,
      successRate: { exact: 0, disordered: 0, overall: 0 },
      digits: { frequency: {}, mostFrequent: [], leastFrequent: [] },
      timeStats: {
        average: 0,
        fastest: { time: 0, clientId: null, username: null, combination: null },
        slowest: { time: 0, clientId: null, username: null, combination: null },
        distribution: { under30s: 0, under60s: 0, under120s: 0, over120s: 0 },
      },
      combinations: { totalUnique: 0, mostCommon: [], diversity: 0 },
      topParticipants: [],
      medals: { gold: null, silver: null, bronze: null },
    };
  }

  /**
   * Version alternative avec agrégation MongoDB (plus performante)
   */
  async getEndedGameConsultationsAggregated(options: {
    page: number;
    limit: number;
  }): Promise<EndedGameConsultationsResult> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // 1. Trouver la dernière édition terminée
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
        winners: null,
        statistics: null,
      };
    }

    const editionId = endedGameConfig._id;
    const winningCombination = endedGameConfig.winningCombination;

    // 2. Pipeline d'agrégation pour les consultations paginées
    const [result] = await this.consultationModel.aggregate([
      // Filtrer par édition
      { $match: { idjeu: editionId } },

      // Pipeline pour le total
      {
        $facet: {
          // Total des consultations
          total: [{ $count: 'count' }],

          // Consultations paginées
          consultations: [
            // Lookup client
            {
              $lookup: {
                from: 'users',
                localField: 'clientId',
                foreignField: '_id',
                as: 'client'
              }
            },
            { $unwind: { path: '$client', preserveNullAndEmptyArrays: false } },

            // Projection
            {
              $project: {
                _id: { $toString: '$_id' },
                combinaison: 1,
                timeSpent: 1,
                createdAt: 1,
                clientId: {
                  _id: { $toString: '$client._id' },
                  username: { $ifNull: ['$client.username', 'Anonyme'] },
                  firstName: { $ifNull: ['$client.firstName', ''] },
                  lastName: { $ifNull: ['$client.lastName', ''] },
                  phone: { $ifNull: ['$client.phone', ''] },
                  email: { $ifNull: ['$client.email', ''] }
                }
              }
            },

            // Tri et pagination
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ],

          // Toutes les consultations pour les stats (seulement si nécessaire)
          allConsultations: winningCombination ? [
            {
              $lookup: {
                from: 'users',
                localField: 'clientId',
                foreignField: '_id',
                as: 'client'
              }
            },
            { $unwind: { path: '$client', preserveNullAndEmptyArrays: false } },
            {
              $project: {
                _id: { $toString: '$_id' },
                combinaison: 1,
                timeSpent: 1,
                createdAt: 1,
                clientId: {
                  _id: { $toString: '$client._id' },
                  username: { $ifNull: ['$client.username', 'Anonyme'] },
                  firstName: { $ifNull: ['$client.firstName', ''] },
                  lastName: { $ifNull: ['$client.lastName', ''] },
                  phone: { $ifNull: ['$client.phone', ''] },
                  email: { $ifNull: ['$client.email', ''] }
                }
              }
            }
          ] : [{ $match: { _id: null } }]
        }
      }
    ]);

    const total = result.total[0]?.count || 0;
    const consultations = result.consultations || [];
    const allConsultations = result.allConsultations || [];

    // 3. Calculer les stats
    let winners = null;
    let statistics = null;

    if (winningCombination && allConsultations.length > 0) {
      winners = this.calculateWinners(allConsultations, winningCombination);
      statistics = this.calculateStatistics(allConsultations, winningCombination, winners);
    } else if (winningCombination && consultations.length > 0) {
      winners = this.calculateWinners(consultations, winningCombination);
      statistics = this.calculateStatistics(consultations, winningCombination, winners);
    }

    // Formater timeSpent
    const formattedConsultations = consultations.map((c: any) => ({
      ...c,
      timeSpent: c.timeSpent ? `${c.timeSpent}s` : '0s',
    }));

    return {
      consultations: formattedConsultations,
      activeEdition: {
        id: endedGameConfig._id.toString(),
        startDate: endedGameConfig.startgameDate,
        endDate: endedGameConfig.endgameDate,
        status: endedGameConfig.status,
        isActive: endedGameConfig.isActive,
        winningCombination: winningCombination || null,
      },
      winners,
      statistics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Vérifie si deux combinaisons correspondent exactement
   */
  private isExactMatch(submitted: string, winning: string): boolean {
    return submitted === winning;
  }

  /**
   * Vérifie si deux combinaisons correspondent dans le désordre
   */
  private isDisorderedMatch(submitted: string, winning: string): boolean {
    if (submitted.length !== winning.length) return false;

    const submittedSorted = submitted.split('').sort().join('');
    const winningSorted = winning.split('').sort().join('');

    return submittedSorted === winningSorted;
  }
}