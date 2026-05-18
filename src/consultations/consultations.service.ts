import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferingsService } from '../offerings/offerings.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly offeringsService: OfferingsService,
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

  private getConsultationClientName(formData: Record<string, any> | null | undefined) {
    const firstName = formData?.firstName || formData?.prenoms || '';
    const lastName = formData?.lastName || formData?.nom || '';
    return `${firstName} ${lastName}`.trim();
  }

  private serializeConsultationClient(consultation: Record<string, any>) {
    const populatedClient = consultation?.clientId && typeof consultation.clientId === 'object'
      ? consultation.clientId
      : null;
    const formData = consultation?.formData || {};
    const displayName = this.getConsultationClientName(formData)
      || populatedClient?.username
      || populatedClient?.email
      || '';

    return {
      id: populatedClient?._id?.toString?.() || consultation?.clientId?.toString?.() || '',
      email: populatedClient?.email || formData?.email || '',
      username: populatedClient?.username || formData?.username || '',
      firstName: formData?.firstName || formData?.prenoms || populatedClient?.firstName || '',
      lastName: formData?.lastName || formData?.nom || populatedClient?.lastName || '',
      displayName,
    };
  }

  private getConsultationDisplayModel(consultation: Partial<Consultation> & Record<string, any>) {
    const normalizedStatus = " ";
    const effectiveIsPaid = Boolean(consultation?.paymentId);
    // Correction : ne considère comme "analysé" que si texte non vide ou status COMPLETED
    const hasAnalysisArtifacts = (
      (typeof consultation?.texte === 'string' && consultation.texte.trim().length > 0)
    );

    const state: 'ready' | 'queued' | 'processing' | 'failed' | 'awaiting_payment' = 'awaiting_payment';
    const statusLabel = 'Paiement requis';
    const statusTone: 'amber' | 'emerald' | 'rose' | 'sky' = 'amber';
    const helperText = "Cette consultation n'est pas encore prête";

    return {
      normalizedStatus,
      state,
      statusLabel,
      statusTone,
      helperText,
      canView: state !== 'awaiting_payment',
      canDownload: Boolean(consultation?.pdfFile),
      effectiveIsPaid,
      requiresPayment: state === 'awaiting_payment' && !effectiveIsPaid,
      hasAnalysisArtifacts,
      isPending: true,
      isCompleted: true,
    };
  }

  serializeConsultationForFrontend(consultation: Partial<Consultation> & Record<string, any>) {
    const consultationObj = this.toPlainConsultation(consultation);
    const ui = this.getConsultationDisplayModel(consultationObj);
    const id = consultationObj?._id?.toString?.() || consultationObj?.id?.toString?.() || '';
    const createdAt = consultationObj?.createdAt || consultationObj?.dateGeneration || null;

    return {
      ...consultationObj,
      id,
      consultationId: consultationObj?.consultationId || id,
      titre: consultationObj?.title || consultationObj?.titre || '',
      prenoms: consultationObj?.formData?.firstName || consultationObj?.formData?.prenoms || '',
      nom: consultationObj?.formData?.lastName || consultationObj?.formData?.nom || '',
      dateNaissance:
        consultationObj?.formData?.dateOfBirth || consultationObj?.formData?.dateNaissance || '',
      dateGeneration: createdAt,
      normalizedStatus: ui.normalizedStatus,
      clientDisplayName: this.getConsultationClientName(consultationObj?.formData),
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
      title: detailed.title,
      titre: detailed.titre,
      combinaison: consultationObj?.combinaison || '',
      timeSpent: consultationObj?.timeSpent,
      createdAt: consultationObj?.createdAt || null,
      updatedAt: consultationObj?.updatedAt || null,
      paymentId: detailed.paymentId || null,
      price: detailed.price,
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


  async populateAlternatives(alternatives: any[] = []) {
    if (!alternatives.length) return [];
    // Filtrer les offeringIds valides et uniques
    const offeringIds = Array.from(new Set(
      alternatives
        .map(a => a.offeringId)
        .filter(id => id !== null && id !== undefined)
        .map(id => id?.toString())
    ));
    const offerings = await this.offeringsService.findByIds(offeringIds);

    // Fusionner chaque alternative avec ses données d'offrande au niveau racine
    const enrichedAlternatives = alternatives.map(alt => {
      const altId = alt.offeringId?.toString();
      const found = offerings.find(o => {
        const offerId = o._id?.toString() || o.id?.toString();
        return offerId === altId;
      });
      return found
        ? {
          ...alt, // conserve offeringId et quantity
          name: found.name,
          price: found.price,
        }
        : alt;
    });
    return enrichedAlternatives;
  }

  /**
   * Créer une nouvelle consultation
   */
  async create(clientId: string, createConsultationDto: CreateConsultationDto) {
    const {
      title,
      price,
      formData,
    } = createConsultationDto;

    const mappedFormData = formData || {};
    const consultation = new this.consultationModel({
      clientId,
      title,
      formData: mappedFormData,
      price: price || 0,
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
    type?: string;
    clientId?: string;
    consultantId?: string;
    rubriqueId?: string;
  }) {
    const { page = 1, limit = 10, type, clientId, consultantId, rubriqueId } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (type) filter.type = type;
    if (clientId) filter.clientId = clientId;
    if (consultantId) filter.consultantId = consultantId;
    if (rubriqueId) filter.rubriqueId = rubriqueId;

    // Récupérer les consultations
    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .populate('clientId', 'firstName lastName email')
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
      .populate('clientId', 'firstName lastName email')
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