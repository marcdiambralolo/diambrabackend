import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

  private toPlainConsultation<T>(consultation: T): T {
    if (consultation && typeof (consultation as any).toObject === 'function') {
      return (consultation as any).toObject();
    }

    return consultation;
  }

  private serializeConsultationClient(consultation: Record<string, any>) {
    const populatedClient = consultation?.clientId && typeof consultation.clientId === 'object'
      ? consultation.clientId
      : null;
    const displayName = populatedClient?.username || populatedClient?.email || '';

    return {
      id: populatedClient?._id?.toString?.() || consultation?.clientId?.toString?.() || '',
      email: populatedClient?.email || '',
      username: populatedClient?.username || '',
      firstName: populatedClient?.firstName || '',
      lastName: populatedClient?.lastName || '',
      displayName,
    };
  }

  private getConsultationDisplayModel(consultation: Partial<Consultation> & Record<string, any>) {
    const normalizedStatus = " ";
    const effectiveIsPaid = Boolean(consultation?.paymentId);
    const statusLabel = 'Paiement requis';
    const statusTone: 'amber' | 'emerald' | 'rose' | 'sky' = 'amber';
    const helperText = "Cette consultation n'est pas encore prête";

    return {
      normalizedStatus,
      statusLabel,
      statusTone,
      helperText,
      effectiveIsPaid,
      requiresPayment: !effectiveIsPaid,
      isPending: true,
      isCompleted: true,
    };
  }

  serializeConsultationForFrontend(consultation: Partial<Consultation> & Record<string, any>) {
    const consultationObj = this.toPlainConsultation(consultation);
    const ui = this.getConsultationDisplayModel(consultationObj);
    const id = consultationObj?._id?.toString?.() || consultationObj?.id?.toString?.() || '';

    return {
      ...consultationObj,
      id,
      consultationId: consultationObj?.consultationId || id,
      idjeu: consultationObj?.idjeu ,
      normalizedStatus: ui.normalizedStatus,
      ui,
    };
  }

  serializeConsultationSummaryForFrontend(consultation: Partial<Consultation> & Record<string, any>) {
    const consultationObj = this.toPlainConsultation(consultation);
    const detailed = this.serializeConsultationForFrontend(consultationObj);
    const client = this.serializeConsultationClient(consultationObj);

    return {
      id: detailed.id,
      _id: consultationObj?._id?.toString?.() || detailed.id,
      consultationId: detailed.consultationId,
      normalizedStatus: detailed.normalizedStatus,
      idjeu: detailed.idjeu,
      combinaison: consultationObj?.combinaison || '',
      timeSpent: consultationObj?.timeSpent,
      createdAt: consultationObj?.createdAt || null,
      updatedAt: consultationObj?.updatedAt || null,
      paymentId: detailed.paymentId || null,
      client,
      clientId: client.id || consultationObj?.clientId,
      clientDisplayName: client.displayName,
      ui: detailed.ui,
    };
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const result = await this.consultationModel.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Créer une nouvelle consultation
   */
  async create(clientId: string, createConsultationDto: CreateConsultationDto) {
    const { idjeu, } = createConsultationDto;

    const consultation = new this.consultationModel({
      clientId,
      idjeu,
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
    const { page = 1, limit = 10, clientId, } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (clientId) filter.clientId = clientId;

    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .populate('clientId', 'username firstName lastName')
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
    const currentConsultation = await this.consultationModel.findById(id).exec();

    if (!currentConsultation) {
      throw new NotFoundException('Consultation not found');
    }
    const consultation = await this.consultationModel
      .findByIdAndUpdate(id, updateConsultationDto)
      .populate('clientId', 'username firstName lastName email')
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
      .populate('clientId', 'username firstName lastName email')
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

  async findByClient(userId: string, query: { page?: number; limit?: number }) {
    // Utilise l'enum pour le statut
    return this.findAll({ ...query, clientId: userId, });
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
}