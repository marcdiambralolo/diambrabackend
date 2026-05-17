import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferingsService } from '../offerings/offerings.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
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
    const effectiveIsPaid =
      consultation?.isPaid === true || Boolean(consultation?.paymentId);
    // Correction : ne considère comme "analysé" que si texte non vide ou status COMPLETED
    const hasAnalysisArtifacts = (
      (typeof consultation?.texte === 'string' && consultation.texte.trim().length > 0)
    );

    let state: 'ready' | 'queued' | 'processing' | 'failed' | 'awaiting_payment' = 'awaiting_payment';
    let statusLabel = 'Paiement requis';
    let statusTone: 'amber' | 'emerald' | 'rose' | 'sky' = 'amber';
    let helperText = "Cette consultation n'est pas encore prête a etre ouverte.";

    if (
      effectiveIsPaid
    ) {
      state = 'queued';
      statusLabel = "En file d'attente";
      statusTone = 'amber';
      helperText = 'Le job est en attente de prise en charge par le worker.';
    }


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
      isPending: state === 'queued',
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
      choiceId: consultationObj?.choiceId || null,
      normalizedStatus: detailed.normalizedStatus,
      title: detailed.title,
      titre: detailed.titre,
      createdAt: consultationObj?.createdAt || null,
      updatedAt: consultationObj?.updatedAt || null,
      completedDate: detailed.completedDate || null,
      dateGeneration: detailed.dateGeneration || null,
      isPaid: detailed.isPaid,
      paymentId: detailed.paymentId || null,
      price: detailed.price,
      client,
      clientId: client.id || consultationObj?.clientId,
      clientDisplayName: client.displayName,
      ui: detailed.ui,
    };
  }

  private serializeConsultationMessage(message: any, fallbackIdPrefix: string) {
    return {
      id: message?._id?.toString?.() || `${fallbackIdPrefix}-${Date.now()}`,
      from: message?.from || 'medium',
      text: message?.text || '',
      ts: new Date(message?.sentAt || message?.createdAt || Date.now()).getTime(),
      status: message?.status || 'sent',
    };
  }

  private buildConsultationThreadPayload(
    consultation: ConsultationDocument & { createdAt?: Date; updatedAt?: Date },
    accessRole: 'client' | 'consultant',
  ) {
    const messages = (consultation.messages || []).map((message: any) =>
      this.serializeConsultationMessage(message, consultation._id.toString()),
    );

    return {
      consultationId: consultation._id.toString(),
      accessRole,
      title: consultation.title,
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt,
      completedDate: consultation.completedDate,
      result: consultation.result,
      messages,
      unread: {
        client: messages.filter((message) => message.from === 'medium' && message.status !== 'read').length,
        consultant: messages.filter((message) => message.from === 'client' && message.status !== 'read').length,
      },
      lastMessage: messages.length ? messages[messages.length - 1] : null,
    };
  }

  private async markMessagesAsRead(
    consultation: ConsultationDocument,
    senderToMark: 'client' | 'medium',
  ) {
    let hasChanges = false;

    const nextMessages = (consultation.messages || []).map((message: any) => {
      if (message?.from !== senderToMark || message?.status === 'read') {
        return message;
      }

      hasChanges = true;
      return {
        ...message.toObject?.(),
        _id: message._id,
        from: message.from,
        text: message.text,
        sentAt: message.sentAt,
        status: 'read',
      };
    });

    if (!hasChanges) {
      return consultation;
    }

    consultation.messages = nextMessages as any;
    await consultation.save();
    return consultation;
  }





  /**
   * Supprimer plusieurs consultations selon un filtre
   */
  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const result = await this.consultationModel.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  // Nouveau constructeur avec injection unique (et modificateurs identiques)


  /**
   * Récupère les alternatives enrichies avec les données d'offrande
   */
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
    // Adaptation du payload frontend
    const {
      title,
      price,
      formData,
      status,
      choice,
      requiredOffering,
      requiredOfferingsDetails,
      choiceId: dtoChoiceId
    } = createConsultationDto;

    // Mapping du formData (incluant carteDuCiel, missionDeVie, etc.)
    const mappedFormData = formData || {};

    // Déterminer le pays (priorité: paramètre country, puis DTO, puis formData)

    // S'assurer que choiceId est bien présent
    let choiceId = dtoChoiceId;
    if ((!choiceId || choiceId === null) && choice && typeof choice === 'object' && '_id' in choice && choice._id) {
      choiceId = choice._id;
    }

    // Création de la consultation
    const consultation = new this.consultationModel({
      clientId,
      title,
      formData: mappedFormData,
      status: status,
      price: price || 0,
      isPaid: true,
      requiredOffering: requiredOffering || null,
      requiredOfferingsDetails: requiredOfferingsDetails || [],
      choice: choice || null,
      choiceId: choiceId,
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

    const populatedConsultation = await consultation.populate(['clientId', 'serviceId']);
    return {
      ...populatedConsultation.toObject(),
      id: populatedConsultation._id.toString(),
      consultationId: populatedConsultation._id.toString(),
    };
  }

  /**
   * Créer une consultation personnelle
   */
  async createPersonalConsultation(data: any) {
    // Si une offrande obligatoire est fournie, valider sa structure
    if (data.requiredOffering) {
      const { requiredOffering } = data;
      if (!['animal', 'vegetal', 'boisson'].includes(requiredOffering.selectedAlternative)) {
        throw new Error('L’alternative choisie doit être animal, vegetal ou boisson.');
      }
      if (!requiredOffering.alternatives || requiredOffering.alternatives.length !== 3) {
        throw new Error('Il doit y avoir exactement trois alternatives (animal, vegetal, boisson).');
      }
      if (!requiredOffering.alternatives.find((a: any) => a.offeringId && a.quantity)) {
        throw new Error('Chaque alternative doit avoir un offeringId et une quantité.');
      }
    }

    const consultation = new this.consultationModel({
      ...data,
      type: 'personal',
      createdAt: new Date(),
    });
    await consultation.save();

    // Retourner avec l'ID explicitement dans la réponse
    return {
      ...consultation.toObject(),
      id: consultation._id.toString(),
      consultationId: consultation._id.toString(),
    };
  }

  /**
   * Récupérer toutes les consultations avec pagination et filtres
   */

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
  async update(id: string, updateConsultationDto: UpdateConsultationDto) {
    const currentConsultation = await this.consultationModel.findById(id).exec();

    if (!currentConsultation) {
      throw new NotFoundException('Consultation not found');
    }



    const consultation = await this.consultationModel
      .findByIdAndUpdate(id, updateConsultationDto, { new: true })
      .populate('clientId', 'firstName lastName email')
      .populate('serviceId', 'name description price')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  /**
   * Attribuer une consultation à un consultant
   */
  async assignToConsultant(consultationId: string, consultantId: string) {
    const consultation = await this.consultationModel
      .findByIdAndUpdate(
        consultationId,
        {
          consultantId
        },
        { new: true },
      )
      .populate('clientId', 'firstName lastName email')
      .populate('consultantId', 'firstName lastName email')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Créer une notification pour le consultant
    try {
      await this.notificationsService.createConsultationAssignedNotification(
        consultantId,
        consultationId,
        consultation.title,
      );
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }

    return consultation;
  }

  /**
   * Supprimer une consultation
   */
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

  /**
   * Récupérer les consultations d'un client
   */
  async findByClient(userId: string, query: { page?: number; limit?: number }) {
    // Utilise l'enum pour le statut
    return this.findAll({ ...query, clientId: userId, });
  }

  /**
   * Récupérer les consultations d'un consultant
   */
  async findByConsultant(consultantId: string, query: { page?: number; limit?: number }) {
    return this.findAll({ ...query, consultantId });
  }

  async findManyByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    const consultations = await this.consultationModel
      .find({ _id: { $in: ids } })
      .exec();

    return Promise.all(
      consultations.map(async (consultation) => {

        return consultation;
      }),
    );
  }

  async addConsultantMessage(
    consultationId: string,
    user: Pick<UserDocument, '_id' | 'role'>,
    dto: SendConsultationMessageDto,
  ) {
    return this.sendConsultationMessageForUser(consultationId, user, dto);
  }

  async sendConsultationMessageForUser(
    consultationId: string,
    user: Pick<UserDocument, '_id' | 'role'>,
    dto: SendConsultationMessageDto,
  ) {
    const consultation = await this.consultationModel.findById(consultationId).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    const access = this.resolveConsultationAccess(consultation, user);
    if (!access.canAccess) {
      throw new ForbiddenException('You are not allowed to send messages for this consultation');
    }

    const message = {
      from: access.isClientOwner ? 'client' as const : 'medium' as const,
      text: dto.text.trim(),
      sentAt: new Date(),
      status: 'sent' as const,
    };

    consultation.messages = [...(consultation.messages || []), message as any];
    await consultation.save();

    const savedMessage = consultation.messages[consultation.messages.length - 1] as any;

    return {
      success: true,
      consultationId: consultation._id.toString(),
      message: this.serializeConsultationMessage(savedMessage, consultation._id.toString()),
    };
  }

  async getConsultationThreadForConsultant(
    consultationId: string,
    user: Pick<UserDocument, '_id' | 'role'>,
  ) {
    return this.getConsultationThreadForUser(consultationId, user);
  }

  async getConsultationThreadForUser(
    consultationId: string,
    user: Pick<UserDocument, '_id' | 'role'>,
  ) {
    const { consultation, access } = await this.findOneForUser(consultationId, user);

    const accessRole = access.isClientOwner ? 'client' : 'consultant';
    await this.markMessagesAsRead(consultation, access.isClientOwner ? 'medium' : 'client');

    return this.buildConsultationThreadPayload(
      consultation as ConsultationDocument & { createdAt?: Date; updatedAt?: Date },
      accessRole,
    );
  }

  async getClientThreadByConsultant(
    clientUser: Pick<UserDocument, '_id'>,
    consultantId: string,
  ) {
    const consultation = await this.consultationModel
      .findOne({
        clientId: clientUser._id,
        consultantId,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!consultation) {
      // Retourner un objet vide si aucune conversation n'existe
      return {
        consultationId: null,
        consultantId,
        title: null,
        description: null,
        status: null,
        createdAt: null,
        updatedAt: null,
        completedDate: null,
        formData: null,
        result: null,
        messages: [],
      };
    }

    await this.markMessagesAsRead(consultation, 'medium');

    const consultationRecord = consultation as ConsultationDocument & {
      createdAt?: Date;
      updatedAt?: Date;
    };

    return {
      consultationId: consultation._id.toString(),
      consultantId,
      title: consultation.title,
      createdAt: consultationRecord.createdAt,
      updatedAt: consultationRecord.updatedAt,
      completedDate: consultation.completedDate,
      formData: consultation.formData,
      result: consultation.result,
      messages: (consultation.messages || []).map((message: any) =>
        this.serializeConsultationMessage(message, consultation._id.toString()),
      ),
    };
  }

  async addClientMessageByConsultant(
    consultantId: string,
    user: Pick<UserDocument, '_id'>,
    dto: SendConsultationMessageDto,
  ) {
    let consultation = await this.consultationModel
      .findOne({
        clientId: user._id,
        consultantId,
      })
      .sort({ createdAt: -1 })
      .exec();

    const message = {
      from: 'client' as const,
      text: dto.text.trim(),
      sentAt: new Date(),
      status: 'sent' as const,
    };

    if (!consultation) {
      // Créer une nouvelle consultation si aucune n'existe
      consultation = new this.consultationModel({
        clientId: user._id,
        consultantId,
        title: 'Consultation',
        description: '',
        status: 'PENDING',
        messages: [message],
        formData: {},
      });
      await consultation.save();
    } else {
      consultation.messages = [...(consultation.messages || []), message as any];
      await consultation.save();
    }

    const savedMessage = consultation.messages[consultation.messages.length - 1] as any;

    return {
      consultationId: consultation._id.toString(),
      message: this.serializeConsultationMessage(savedMessage, consultation._id.toString()),
    };
  }


}