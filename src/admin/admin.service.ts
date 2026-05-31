import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Role } from '../common/enums/role.enum';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WalletTransaction, WalletTransactionDocument } from '../wallet/schemas/wallet-transaction.schema';
import { GameConfiguration, GameConfigurationDocument } from '@/game/schemas/game-configuration.schema';
import { LearningConfiguration, LearningConfigurationDocument } from '@/learning/schemas/learning-configuration.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(WalletTransaction.name) private walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(GameConfiguration.name)
    private gameConfigModel: Model<GameConfigurationDocument>,
    @InjectModel(LearningConfiguration.name)
    private learningConfigModel: Model<LearningConfigurationDocument>,
    private readonly configService: ConfigService,
  ) { }

  private startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async createUser(createUserDto: any): Promise<Omit<User, 'password'>> {
    const { username, password, gender, phone, phoneNumber, ...rest } = createUserDto;
    const email = `${username}@diambra.net`;

    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    let mappedGender = gender;
    if (gender === 'Homme') mappedGender = 'male';
    else mappedGender = 'female';

    const finalPhone = phone || phoneNumber;
    const plainPassword = password || Math.random().toString(36).slice(-8);
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    const user = new this.userModel({
      ...rest,
      username,
      gender: mappedGender,
      phoneNumber: finalPhone,
      email,
      password: hashedPassword,
    });

    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();
    console.log('userWithoutPassword', _);

    return userWithoutPassword;
  }

  async getStats() {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Users
    const totalUsers = await this.userModel.countDocuments().exec();
    const activeUsers = await this.userModel.countDocuments({ isActive: true }).exec();
    const newUsers = await this.userModel
      .countDocuments({ createdAt: { $gte: todayStart } })
      .exec();
    const inactiveUsers = await this.userModel.countDocuments({ isActive: false }).exec();

    // Consultations
    const totalConsultations = await this.consultationModel.countDocuments().exec();
    const pendingConsultations = await this.consultationModel
      .countDocuments()
      .exec();
    const completedConsultations = await this.consultationModel
      .countDocuments()
      .exec();

    // Consultation revenue (sum of price for completed consultations)
    const revenueAgg = await this.consultationModel
      .aggregate([
        { $group: { _id: null, total: { $sum: '$price' } } },
      ])
      .exec();
    const consultationsRevenue = (revenueAgg[0] && revenueAgg[0].total) || 0;

    // Payments
    const totalPayments = await this.paymentModel.countDocuments().exec();
    const pendingPayments = await this.paymentModel
      .countDocuments({ status: PaymentStatus.PENDING })
      .exec();
    const completedPayments = await this.paymentModel
      .countDocuments({ status: PaymentStatus.COMPLETED })
      .exec();
    const failedPayments = await this.paymentModel
      .countDocuments({ status: PaymentStatus.FAILED })
      .exec();

    // Activity today
    const todayUsers = newUsers;
    const todayConsultations = await this.consultationModel
      .countDocuments({ createdAt: { $gte: todayStart } })
      .exec();

    const todayPaymentsAgg = await this.paymentModel
      .aggregate([
        { $match: { status: PaymentStatus.COMPLETED, paidAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();
    const todayRevenue = (todayPaymentsAgg[0] && todayPaymentsAgg[0].total) || 0;

    // Growth (compare consultations today vs yesterday)
    const yesterdayConsultations = await this.consultationModel
      .countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } })
      .exec();
    let growth = 0;
    if (yesterdayConsultations > 0) {
      growth = ((todayConsultations - yesterdayConsultations) / yesterdayConsultations) * 100;
      growth = Math.round(growth * 10) / 10; // 1 decimal
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        inactive: inactiveUsers,
      },
      consultations: {
        total: totalConsultations,
        pending: pendingConsultations,
        completed: completedConsultations,
        revenue: consultationsRevenue,
      },
      payments: {
        total: totalPayments,
        pending: pendingPayments,
        completed: completedPayments,
        failed: failedPayments,
      },
      activity: {
        todayUsers,
        todayConsultations,
        todayRevenue,
        growth,
      },
    };
  }

  async getOfferingSalesStats(options?: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = options || {};

    const match: any = { status: 'completed' };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const last7Start = new Date(todayStart);
    last7Start.setDate(last7Start.getDate() - 6); // today + 6 jours précédents

    const last30Start = new Date(todayStart);
    last30Start.setDate(last30Start.getDate() - 29); // today + 29 jours précédents

    const [facet] = await this.walletTransactionModel.aggregate([
      { $match: match },
      {
        $facet: {
          overview: [
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
                transactions: { $addToSet: '$_id' },
              },
            },
            {
              $project: {
                _id: 0,
                revenue: 1,
                quantitySold: 1,
                transactionsCount: { $size: '$transactions' },
              },
            },
          ],
          byOffering: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.offeringId',
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
                name: { $first: '$items.name' },
                category: { $first: '$items.category' },
                illustrationUrl: { $first: '$items.illustrationUrl' },
                avgUnitPrice: { $avg: '$items.unitPrice' },
              },
            },
            { $sort: { revenue: -1 } },
            {
              $project: {
                _id: 0,
                offeringId: '$_id',
                name: 1,
                category: 1,
                illustrationUrl: 1,
                revenue: 1,
                quantitySold: 1,
                avgUnitPrice: { $round: ['$avgUnitPrice', 2] },
              },
            },
          ],
          byCategory: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.category',
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            {
              $project: {
                _id: 0,
                category: '$_id',
                revenue: 1,
                quantitySold: 1,
              },
            },
          ],
          today: [
            { $match: { createdAt: { $gte: todayStart } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $project: { _id: 0, revenue: 1, quantitySold: 1 } },
          ],
          last7: [
            { $match: { createdAt: { $gte: last7Start } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $project: { _id: 0, revenue: 1, quantitySold: 1 } },
          ],
          last30: [
            { $match: { createdAt: { $gte: last30Start } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $project: { _id: 0, revenue: 1, quantitySold: 1 } },
          ],
        },
      },
    ]).exec();

    const overview = (facet?.overview && facet.overview[0]) || {
      revenue: 0,
      quantitySold: 0,
      transactionsCount: 0,
    };

    return {
      overview,
      byOffering: facet?.byOffering || [],
      byCategory: facet?.byCategory || [],
      periods: {
        today: (facet?.today && facet.today[0]) || { revenue: 0, quantitySold: 0 },
        last7: (facet?.last7 && facet.last7[0]) || { revenue: 0, quantitySold: 0 },
        last30: (facet?.last30 && facet.last30[0]) || { revenue: 0, quantitySold: 0 },
      },
      filters: { startDate, endDate },
    };
  }

  async getUsers(options: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status = 'all', role = 'all', page = 1, limit = 10 } = options || {};

    const filter: any = {};

    if (search && search.trim().length > 0) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [
        { firstName: re },
        { lastName: re },
        { email: re },
        { username: re },
        { phone: re },
      ];
    }

    if (status && status !== 'all') {
      if (status === 'active') filter.isActive = true;
      else filter.isActive = false; // treat inactive/suspended as not active
    }

    if (role && role !== 'all') {
      const roleUpper = role.toUpperCase();
      if (Object.values(Role).includes(roleUpper as Role)) {
        filter.role = roleUpper;
      } else if (role === 'admin') {
        filter.role = Role.ADMIN;
      } else if (role === 'user') {
        filter.role = Role.USER;
      }
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [total, docs] = await Promise.all([
      this.userModel.countDocuments(filter).exec(),
      this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    ]);

    const users = docs.map((u: any) => {
      // Retirer uniquement le mot de passe, tout le reste est retourné
      const { password, ...userData } = u;
      console.log(password);
      return userData;
    });

    return { users, total };
  }

  // admin.service.ts
  async getConsultationsOfEndedEditions(options: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // Trouver les GameConfiguration avec status 'ended'
    const endedGameConfigs = await this.gameConfigModel
      .find({ status: 'ended' })
      .select('_id startgameDate endgameDate status')
      .lean()
      .exec();

    const endedGameConfigIds = endedGameConfigs.map(gc => gc._id);

    if (endedGameConfigIds.length === 0) {
      return {
        consultations: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        editions: endedGameConfigs,
      };
    }

    // Trouver les consultations liées à ces éditions terminées
    const filter = {
      idjeu: { $in: endedGameConfigIds }
    };

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);



    return {
      consultations: consultations,
      editions: endedGameConfigs.map(edition => ({
        id: edition._id.toString(),
        startDate: edition.startgameDate,
        endDate: edition.endgameDate,
        status: edition.status,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // admin.service.ts
  async getActiveGameConsultations(options: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // Trouver l'édition active (une seule)
    const activeGameConfig = await this.gameConfigModel
      .findOne({ status: 'active', isActive: true })
      .select('_id startgameDate endgameDate status isActive')
      .lean()
      .exec();

    if (!activeGameConfig) {
      return {
        consultations: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        activeEdition: null,
      };
    }

    // Récupérer les consultations liées à cette édition active
    const filter = { idjeu: activeGameConfig._id };

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);



    return {
      consultations: consultations,
      activeEdition: {
        id: activeGameConfig._id.toString(),
        startDate: activeGameConfig.startgameDate,
        endDate: activeGameConfig.endgameDate,
        status: activeGameConfig.status,
        isActive: activeGameConfig.isActive,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getActiveLearningConsultations(options: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // Trouver l'édition active (une seule)
    const activeGameConfig = await this.learningConfigModel
      .findOne({ status: 'active', isActive: true })
      .select('_id startgameDate endgameDate status isActive')
      .lean()
      .exec();

    console.log(activeGameConfig);

    if (!activeGameConfig) {
      return {
        consultations: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        activeEdition: null,
      };
    }

    // Récupérer les consultations liées à cette édition active
    const filter = { idjeu: activeGameConfig._id };

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .select('_id combinaison timeSpent createdAt clientId')
        .populate<{ clientId: any }>('clientId', 'username firstName lastName phone email country')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);



    return {
      consultations: consultations,
      activeEdition: {
        id: activeGameConfig._id.toString(),
        startDate: activeGameConfig.startgameDate,
        endDate: activeGameConfig.endgameDate,
        status: activeGameConfig.status,
        isActive: activeGameConfig.isActive,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }


  async getLastEndedGameStats2() {
    // Trouver la dernière édition terminée
    const lastEndedGameConfig = await this.gameConfigModel
      .findOne({ status: 'ended' })
      .sort({ endgameDate: -1, updatedAt: -1 })
      .select('_id startgameDate endgameDate status isActive')
      .lean()
      .exec();

    if (!lastEndedGameConfig) {
      return {
        hasEndedEdition: false,
        message: 'Aucune édition terminée trouvée',
      };
    }

    // Récupérer toutes les consultations de cette édition
    const consultations = await this.consultationModel
      .find({ idjeu: lastEndedGameConfig._id })
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone')
      .populate('idjeu', 'startgameDate endgameDate status isActive')
      .lean()
      .exec();

    const completedConsultations = consultations;
    const totalPlayers = consultations.length;
    const completedPlayers = completedConsultations.length;
    const completionRate = totalPlayers > 0 ? (completedPlayers / totalPlayers) * 100 : 0;

    // Calculer la durée de l'édition
    const startDate = new Date(lastEndedGameConfig.startgameDate);
    const endDate = new Date(lastEndedGameConfig.endgameDate);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      consultations,
      hasEndedEdition: true,
      edition: {
        id: lastEndedGameConfig._id.toString(),
        startDate: lastEndedGameConfig.startgameDate,
        endDate: lastEndedGameConfig.endgameDate,
        durationDays,
        status: lastEndedGameConfig.status,
      },
      stats: {
        totalPlayers,
        completedPlayers,
        completionRate: Math.round(completionRate * 10) / 10,
        inProgressPlayers: totalPlayers - completedPlayers,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getLastEndedGameStats() {

    const lastEndedGameConfig = await this.gameConfigModel
      .findOne({ status: 'ended' })
      .sort({ updatedAt: -1, })
      .select('_id startgameDate endgameDate status isActive updatedAt createdAt')
      .exec();

    if (!lastEndedGameConfig) {
      return {
        hasEndedEdition: false,
        message: 'Aucune édition terminée trouvée',
        editions: [],
        latestEdition: null,
        consultations: [],
        stats: {
          totalPlayers: 0,
          completedPlayers: 0,
          completionRate: 0,
          inProgressPlayers: 0,
        },
      };
    }

    const consultations = await this.consultationModel
      .find({ idjeu: lastEndedGameConfig._id })
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone  country')
      .populate('idjeu', 'startgameDate endgameDate status isActive')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Filtrer les consultations terminées (avec combinaison)
    const completedConsultations = consultations;
    const totalPlayers = consultations.length;
    const completedPlayers = completedConsultations.length;
    const completionRate = totalPlayers > 0 ? (completedPlayers / totalPlayers) * 100 : 0;

    const startDate = new Date(lastEndedGameConfig.startgameDate);
    const endDate = new Date(lastEndedGameConfig.endgameDate);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasEndedEdition: true,
      latestEdition: {
        id: lastEndedGameConfig._id.toString(),
        startDate: lastEndedGameConfig.startgameDate,
        endDate: lastEndedGameConfig.endgameDate,
        durationDays,
        status: lastEndedGameConfig.status,
        isActive: lastEndedGameConfig.isActive,
        updatedAt: lastEndedGameConfig.updatedAt,
        createdAt: lastEndedGameConfig.createdAt,
      },
      consultations,
      stats: {
        totalPlayers,
        completedPlayers,
        completionRate: Math.round(completionRate * 10) / 10,
        inProgressPlayers: totalPlayers - completedPlayers,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getLastEndedLearningStats() {

    const lastEndedGameConfig = await this.learningConfigModel
      .findOne({ status: 'ended' })
      .sort({ updatedAt: -1, })
      .select('_id startgameDate endgameDate status isActive updatedAt createdAt')
      .exec();

    if (!lastEndedGameConfig) {
      return {
        hasEndedEdition: false,
        message: 'Aucune édition terminée trouvée',
        editions: [],
        latestEdition: null,
        consultations: [],
        stats: {
          totalPlayers: 0,
          completedPlayers: 0,
          completionRate: 0,
          inProgressPlayers: 0,
        },
      };
    }

    const consultations = await this.consultationModel
      .find({ idjeu: lastEndedGameConfig._id })
      .select('_id combinaison timeSpent createdAt clientId')
      .populate('clientId', 'username firstName lastName phone  country')
      .populate('idjeu', 'startgameDate endgameDate status isActive')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Filtrer les consultations terminées (avec combinaison)
    const completedConsultations = consultations;
    const totalPlayers = consultations.length;
    const completedPlayers = completedConsultations.length;
    const completionRate = totalPlayers > 0 ? (completedPlayers / totalPlayers) * 100 : 0;

    const startDate = new Date(lastEndedGameConfig.startgameDate);
    const endDate = new Date(lastEndedGameConfig.endgameDate);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasEndedEdition: true,
      latestEdition: {
        id: lastEndedGameConfig._id.toString(),
        startDate: lastEndedGameConfig.startgameDate,
        endDate: lastEndedGameConfig.endgameDate,
        durationDays,
        status: lastEndedGameConfig.status,
        isActive: lastEndedGameConfig.isActive,
        updatedAt: lastEndedGameConfig.updatedAt,
        createdAt: lastEndedGameConfig.createdAt,
      },
      consultations,
      stats: {
        totalPlayers,
        completedPlayers,
        completionRate: Math.round(completionRate * 10) / 10,
        inProgressPlayers: totalPlayers - completedPlayers,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getConsultations(options: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'combinaison' | 'timeSpent';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    const skip = Math.max(0, (page - 1) * limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [total, docs] = await Promise.all([
      this.consultationModel.countDocuments().lean().exec(),
      this.consultationModel
        .find()
        .select('_id combinaison timeSpent createdAt clientId')
        .populate('clientId', 'username firstName lastName phone')
        .populate('idjeu', 'startgameDate endgameDate status isActive')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec()
    ]);

    const consultations = docs.map((c: any) => ({
      ...c,
      id: c._id.toString(),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      consultations,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async getPayments(options: {
    search?: string;
    status?: string;
    method?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status = 'all', method = 'all', page = 1, limit = 18 } = options || {};

    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status.toUpperCase();
    }

    if (method && method !== 'all') {
      filter.method = method.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      const re = new RegExp(search.trim(), 'i');
      // search by transactionId, metadata fields, or referenced user/phone later
      filter.$or = [{ transactionId: re }, { 'metadata.reference': re }];
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [total, docs] = await Promise.all([
      this.paymentModel.countDocuments(filter).exec(),
      this.paymentModel
        .find(filter)
        .populate('userId', 'firstName lastName phone email')
        .populate({ path: 'consultationId', select: 'formData' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const payments = docs.map((p: any) => {
      // customer info: prefer populated user, fallback to consultation.formData
      let customerName = '';
      let customerPhone = '';
      if (p.userId) {
        customerName = `${p.userId.firstName || ''} ${p.userId.lastName || ''}`.trim();
        customerPhone = p.userId.phone || '';
      }
      if ((!customerName || !customerPhone) && p.consultationId && p.consultationId.formData) {
        const fd = p.consultationId.formData;
        if (!customerName) customerName = `${fd.firstName || ''} ${fd.lastName || ''}`.trim();
        if (!customerPhone) customerPhone = fd.telephone || fd.phone || '';
      }

      const reference =
        p.transactionId || p.metadata?.reference || (p._id ? p._id.toString() : undefined);

      return {
        id: p._id.toString(),
        reference,
        amount: p.amount || 0,
        status: (p.status || '').toLowerCase(),
        method: (p.method || '').toLowerCase(),
        customerName: customerName || 'Client',
        customerPhone: customerPhone || '',
        createdAt: p.createdAt,
        completedAt: p.paidAt || p.refundedAt || null,
      };
    });

    return { payments, total };
  }

  async getUserById(id: string) {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return { message: `Utilisateur avec l'ID ${id} supprimé.` };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return user;
  }
}