import { ForbiddenException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationStatus, ConsultationType } from '../common/enums/consultation-status.enum';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferingsService } from '../offerings/offerings.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { SendConsultationMessageDto } from './dto/send-consultation-message.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';
import { Analysis } from './schemas/analysis.schema';
import { UserConsultationChoiceService } from './user-consultation-choice.service';
import { AnalysisDbService } from './analysis-db.service';
import { AnalysisQueueService } from './analysis-queue.service';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly offeringsService: OfferingsService,
    private readonly userConsultationChoiceService: UserConsultationChoiceService,
    @Inject(forwardRef(() => AnalysisQueueService))
    private readonly analysisQueueService: AnalysisQueueService,
    private readonly analysisDbService: AnalysisDbService,
  ) {}
  private isPrivilegedConsultationRole(role: Role | undefined) {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }

  private resolveConsultationAccess(
    consultation: Pick<Consultation, 'clientId' | 'consultantId'>,
    user: Pick<UserDocument, '_id' | 'role'>,
  ) {
    const currentUserId = user._id.toString();
    const isPrivilegedRole = this.isPrivilegedConsultationRole(user.role);
    const isAssignedConsultant = consultation.consultantId?.toString() === currentUserId;
    const isClientOwner = consultation.clientId?.toString() === currentUserId;

    return {
      currentUserId,
      isPrivilegedRole,
      isAssignedConsultant,
      isClientOwner,
      canAccess: isPrivilegedRole || isAssignedConsultant || isClientOwner,
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

  private getNormalizedConsultationStatus(consultation: Partial<Consultation> & { statut?: string }) {
    const rawStatus = String(consultation?.status || consultation?.statut || '').toUpperCase();

    if (this.isFreeCinqEtoilesConsultation(consultation) && rawStatus === 'AWAITING_PAYMENT') {
      return ConsultationStatus.PENDING;
    }

    return rawStatus;
  }

  private getConsultationDisplayModel(consultation: Partial<Consultation> & Record<string, any>) {
    const normalizedStatus = this.getNormalizedConsultationStatus(consultation);
    const isFreeConsultation = this.isFreeCinqEtoilesConsultation(consultation);
    const effectiveIsPaid =
      isFreeConsultation || consultation?.isPaid === true || Boolean(consultation?.paymentId);
    // Correction : ne considère comme "analysé" que si texte non vide ou status COMPLETED
    const hasAnalysisArtifacts = (
      (typeof consultation?.texte === 'string' && consultation.texte.trim().length > 0) ||
      consultation?.status === ConsultationStatus.COMPLETED
    );

    let state: 'ready' | 'queued' | 'processing' | 'failed' | 'awaiting_payment' = 'awaiting_payment';
    let statusLabel = 'Paiement requis';
    let statusTone: 'amber' | 'emerald' | 'rose' | 'sky' = 'amber';
    let helperText = "Cette consultation n'est pas encore prête a etre ouverte.";

    if (hasAnalysisArtifacts || normalizedStatus === ConsultationStatus.COMPLETED) {
      state = 'ready';
      statusLabel = 'Analyse prete';
      statusTone = 'emerald';
      helperText = "Ouvre l'analyse ou telecharge le PDF si disponible.";
    } else if (normalizedStatus === 'PROCESSING' || normalizedStatus === 'GENERATING') {
      state = 'processing';
      statusLabel = 'Generation en cours';
      statusTone = 'sky';
      helperText = "Le worker traite encore cette analyse.";
    } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'ERROR') {
      state = 'failed';
      statusLabel = 'Generation echouee';
      statusTone = 'rose';
      helperText = "Ouvre la consultation pour voir l'etat ou relancer le traitement.";
    } else if (
      (normalizedStatus === ConsultationStatus.PENDING || normalizedStatus === 'ASSIGNED') &&
      effectiveIsPaid
    ) {
      state = 'queued';
      statusLabel = "En file d'attente";
      statusTone = 'amber';
      helperText = 'Le job est en attente de prise en charge par le worker.';
    }

    let consultButtonStatus: 'CONSULTER' | 'REPONSE_EN_ATTENTE' | 'VOIR_L_ANALYSE' = 'CONSULTER';
    if (hasAnalysisArtifacts || normalizedStatus === ConsultationStatus.COMPLETED) {
      consultButtonStatus = 'VOIR_L_ANALYSE';
    } else if (state === 'queued' || state === 'processing' || normalizedStatus === 'ASSIGNED') {
      consultButtonStatus = 'REPONSE_EN_ATTENTE';
    }

    return {
      normalizedStatus,
      state,
      statusLabel,
      statusTone,
      helperText,
      canView: state !== 'awaiting_payment',
      canDownload: Boolean(consultation?.pdfFile),
      viewLabel:
        state === 'ready'
          ? "Voir l'analyse"
          : state === 'awaiting_payment'
            ? 'Paiement requis'
            : "Afficher",
      consultButtonStatus,
      isFreeConsultation,
      effectiveIsPaid,
      requiresPayment: state === 'awaiting_payment' && !effectiveIsPaid,
      hasAnalysisArtifacts,
      isPending: state === 'queued' || state === 'processing',
      isCompleted: state === 'ready',
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
      consultButtonStatus: ui.consultButtonStatus,
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
      rubriqueId: consultationObj?.rubriqueId || null,
      type: detailed.type,
      status: detailed.status,
      normalizedStatus: detailed.normalizedStatus,
      title: detailed.title,
      titre: detailed.titre,
      description: detailed.description,
      createdAt: consultationObj?.createdAt || null,
      updatedAt: consultationObj?.updatedAt || null,
      completedDate: detailed.completedDate || null,
      dateGeneration: detailed.dateGeneration || null,
      pdfFile: detailed.pdfFile || null,
      analysisId: consultationObj?.analysisId || null,
      analysisDateGeneration: consultationObj?.analysisDateGeneration || null,
      analysisNotified: detailed.analysisNotified ?? false,
      isPaid: detailed.isPaid,
      paymentId: detailed.paymentId || null,
      price: detailed.price,
      client,
      clientId: client.id || consultationObj?.clientId,
      clientDisplayName: client.displayName,
      ui: detailed.ui,
      consultButtonStatus: detailed.consultButtonStatus,
      texte: consultationObj?.texte,
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





  /**
   * Méthode statique pour synchronisation forcée depuis analysis-db.service
   * Utilisation ConsultationsService.syncConsultationCompletionFromAnalysisStatic(consultationId, consultationModel, analysisModel)
   */
  static async syncConsultationCompletionFromAnalysisStatic(
    consultationId: string,
    consultationModel: typeof import('mongoose').Model<ConsultationDocument>,
    analysisModel: typeof import('mongoose').Model<Analysis>
  ) {
    const consultation = await consultationModel.findById(consultationId);
    if (!consultation) return;
    const analysis = await analysisModel.findOne({ consultationId });
    if (!analysis || !(typeof analysis.texte === 'string' && analysis.texte.trim().length > 0)) return;
    let shouldSave = false;
    if (consultation.status !== 'COMPLETED') {
      consultation.status = 'COMPLETED';
      shouldSave = true;
    }
    if (!consultation.completedDate) {
      consultation.completedDate = analysis.finishedAt || analysis.dateGeneration || new Date();
      shouldSave = true;
    }
    if (shouldSave) await consultation.save();
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
      status: consultation.status,
      title: consultation.title,
      description: consultation.description,
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

  private isFreeCinqEtoilesConsultation(
    consultation: { type?: ConsultationType | null } | null | undefined,
  ) {
    return consultation?.type === 'CINQ_ETOILES';
  }

  private analysisHasResult(analysis: Pick<Analysis, 'texte' | 'status'> | null | undefined) {
    if (typeof analysis?.texte === 'string' && analysis.texte.trim().length > 0) {
      return true;
    }

    return analysis?.status === ConsultationStatus.COMPLETED;
  }

  private async syncConsultationCompletionFromAnalysis<T extends ConsultationDocument | null>(consultation: T): Promise<T> {
    if (!consultation) {
      return consultation;
    }

    const analysis = await this.analysisDbService.findByConsultationId(consultation._id.toString());
    if (!this.analysisHasResult(analysis)) {
      return consultation;
    }

    let shouldSave = false;

    if (consultation.status !== ConsultationStatus.COMPLETED) {
      consultation.status = ConsultationStatus.COMPLETED;
      shouldSave = true;
    }

    if (!consultation.completedDate) {
      consultation.completedDate = analysis?.finishedAt || analysis?.dateGeneration || new Date();
      shouldSave = true;
    }

    if (!shouldSave) {
      return consultation;
    }

    await consultation.save();
    return consultation;
  }

  private async normalizeLegacyFreeCinqEtoilesConsultation<T extends ConsultationDocument | null>(consultation: T): Promise<T> {
    if (!consultation || !this.isFreeCinqEtoilesConsultation(consultation)) {
      return consultation;
    }

    let shouldSave = false;

    if (consultation.price !== 0) {
      consultation.price = 0;
      shouldSave = true;
    }

    if (consultation.isPaid !== true) {
      consultation.isPaid = true;
      shouldSave = true;
    }

    if ((consultation.status as string) === 'AWAITING_PAYMENT') {
      consultation.status = ConsultationStatus.PENDING;
      shouldSave = true;
    }

    if (!shouldSave) {
      return consultation;
    }

    await consultation.save();
    return consultation;
  }

  private async normalizeLegacyFreeCinqEtoilesConsultations<T extends ConsultationDocument>(consultations: T[]) {
    return Promise.all(consultations.map((consultation) => this.normalizeLegacyFreeCinqEtoilesConsultation(consultation)));
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
          priceUSD: found.priceUSD,
          category: found.category,
          description: found.description,
        }
        : alt;
    });
    return enrichedAlternatives;
  }

  /**
   * Créer une nouvelle consultation
   */
  async create(clientId: string, createConsultationDto: CreateConsultationDto, country?: string) {
    // Adaptation du payload frontend
    const {
      type,
      title,
      description,
      price,
      formData,
      status,
      alternatives,
      choice,
      requiredOffering,
      requiredOfferingsDetails,
      tierce,
      tierces,
      rubriqueId,
      pdfFile,
      choiceId: dtoChoiceId
    } = createConsultationDto;

    // Mapping des alternatives et choix
    let mappedAlternatives = alternatives || [];
    if (choice && choice.offering && Array.isArray(choice.offering.alternatives)) {
      mappedAlternatives = choice.offering.alternatives;
    }

    // Mapping du formData (incluant carteDuCiel, missionDeVie, etc.)
    const mappedFormData = formData || {};

    // Déterminer le pays (priorité: paramètre country, puis DTO, puis formData)
    const finalCountry = country || createConsultationDto.country || formData?.country || formData?.paysNaissance || null;

    // S'assurer que choiceId est bien présent
    let choiceId = dtoChoiceId;
    if ((!choiceId || choiceId === null) && choice && typeof choice === 'object' && '_id' in choice && choice._id) {
      choiceId = choice._id;
    }

    const isFreeCinqEtoilesConsultation = type === ConsultationType.CINQ_ETOILES;

    // Création de la consultation
    const consultation = new this.consultationModel({
      clientId,
      type,
      title,
      description,
      rubriqueId,
      formData: mappedFormData,
      tierce: tierce || null,
      tierces: tierces || null,
      status: status || ConsultationStatus.PENDING,
      price: isFreeCinqEtoilesConsultation ? 0 : (price ?? 0),
      isPaid: isFreeCinqEtoilesConsultation,
      alternatives: mappedAlternatives,
      requiredOffering: requiredOffering || null,
      requiredOfferingsDetails: requiredOfferingsDetails || [],
      choice: choice || null,
      choiceId: choiceId,
      country: finalCountry,
      pdfFile: pdfFile || null,
    });

    await consultation.save();

    // Enqueue l'analyse automatiquement pour toute nouvelle consultation
    try {
      await this.analysisQueueService.enqueueAnalysis(consultation._id.toString());
    } catch (err) {
      // Log mais ne bloque pas la création
      console.error('[ConsultationsService] Erreur lors de l\'enqueue de l\'analyse :', err);
    }

    // Incrémenter les compteurs de consultations de l'utilisateur
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
    status?: ConsultationStatus;
    type?: string;
    clientId?: string;
    consultantId?: string;
    rubriqueId?: string;
  }) {
    const { page = 1, limit = 10, status, type, clientId, consultantId, rubriqueId } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (clientId) filter.clientId = clientId;
    if (consultantId) filter.consultantId = consultantId;
    if (rubriqueId) filter.rubriqueId = rubriqueId;

    // Récupérer les consultations
    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .populate('clientId', 'firstName lastName email')
        .populate('consultantId', 'firstName lastName email specialties')
        .populate('serviceId', 'name description price')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);

    // Synchronisation FORCÉE du statut de la consultation avec l'analyse AVANT retour au frontend
    const normalizedConsultations = await Promise.all(
      consultations.map(async (consultation) => {
        await this.normalizeLegacyFreeCinqEtoilesConsultation(consultation);
        // Synchronisation stricte : on force la mise à jour en base si besoin
        const updated = await this.syncConsultationCompletionFromAnalysis(consultation);
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
    const consultation = await this.consultationModel
      .findById(id)
      .populate('consultantId', 'firstName lastName email specialties rating')
      .populate('serviceId', 'name description price duration')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    await this.normalizeLegacyFreeCinqEtoilesConsultation(consultation);
    await this.syncConsultationCompletionFromAnalysis(consultation);


    // Populate alternatives with offering details
    if (consultation.alternatives && consultation.alternatives.length) {
      consultation.alternatives = await this.populateAlternatives(consultation.alternatives);
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

    const previousStatus = currentConsultation.status;
    const newStatus = updateConsultationDto.status;

    if (this.isFreeCinqEtoilesConsultation(currentConsultation)) {
      (updateConsultationDto as any).price = 0;
      (updateConsultationDto as any).isPaid = true;
      if ((updateConsultationDto as any).status === 'AWAITING_PAYMENT') {
        (updateConsultationDto as any).status = ConsultationStatus.PENDING;
      }
    }

    // Si le statut passe à COMPLETED, mettre la date de complétion
    if (newStatus === ConsultationStatus.COMPLETED) {
      (updateConsultationDto as any)['completedDate'] = new Date();
      // NE PAS notifier ni marquer comme notifié ici, cela sera fait par un administrateur ultérieurement
    }

    // Gérer les changements de statut affectant les compteurs
    if (previousStatus !== newStatus) {
      const wasActive = previousStatus !== ConsultationStatus.CANCELLED;
      const willBeActive = newStatus !== ConsultationStatus.CANCELLED;

      if (wasActive && !willBeActive) {
        // Passage à CANCELLED: décrémenter consultationsCount
        await this.userModel.findByIdAndUpdate(
          currentConsultation.clientId,
          { $inc: { consultationsCount: -1 } },
          { new: true }
        ).exec();
      } else if (!wasActive && willBeActive) {
        // Passage de CANCELLED à un statut actif: incrémenter consultationsCount
        await this.userModel.findByIdAndUpdate(
          currentConsultation.clientId,
          { $inc: { consultationsCount: 1 } },
          { new: true }
        ).exec();
      }
    }

    const consultation = await this.consultationModel
      .findByIdAndUpdate(id, updateConsultationDto, { new: true })
      .populate('clientId', 'firstName lastName email')
      .populate('consultantId', 'firstName lastName email')
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
          consultantId,
          status: ConsultationStatus.ASSIGNED,
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
   * Sauvegarder l'analyse générée
   */
  async saveAnalysis(id: string, saveAnalysisDto: SaveAnalysisDto) {
    const consultation = await this.consultationModel.findById(id).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Vérifier si une analyse existe déjà pour ce choix de consultation
    const choiceId = consultation.choice?._id;
    if (choiceId && consultation.clientId) {
      const executedChoiceIds = await this.userConsultationChoiceService.getExecutedChoiceIds(consultation.clientId.toString(), id);
      if (executedChoiceIds.includes(choiceId)) {
        throw new ForbiddenException('Une analyse existe déjà pour ce choix de consultation.');
      }
    }

    // Mettre à jour avec l'analyse
    consultation.status =
      saveAnalysisDto.status === 'completed'
        ? ConsultationStatus.COMPLETED
        : ConsultationStatus.PENDING;

    // Enregistrer le choix de consultation utilisateur pour manipulation des fréquences (une seule fois)
    if (consultation.clientId && choiceId) {
      await this.userConsultationChoiceService.recordChoicesForConsultation(
        consultation.clientId.toString(),
        consultation._id.toString(),
        [{
          title: consultation.title,
          choiceId,
          frequence: consultation.choice?.frequence || 'LIBRE',
          participants: consultation.choice?.participants || 'SOLO',
        }]
      );
    }

    if (saveAnalysisDto.status === 'completed') {
      consultation.completedDate = new Date();
      // NE PAS notifier ni marquer comme notifié ici, cela sera fait par un administrateur ultérieurement
    }

    await consultation.save();
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
    const isActive = consultation.status !== ConsultationStatus.CANCELLED;
    await this.userModel.findByIdAndUpdate(
      consultation.clientId,
      {
        $inc: {
          totalConsultations: -1,
          consultationsCount: isActive ? -1 : 0,
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
    return this.findAll({ ...query, clientId: userId, status: ConsultationStatus.COMPLETED });
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
        await this.normalizeLegacyFreeCinqEtoilesConsultation(consultation);
        await this.syncConsultationCompletionFromAnalysis(consultation);
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
      description: consultation.description,
      status: consultation.status,
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


  /**
   * Marquer une analyse comme notifiée
   * Utilisé lorsqu'une notification est envoyée à l'utilisateur
   */
  async markAnalysisAsNotified(consultationId: string): Promise<Analysis> {
    const consultation = await this.consultationModel.findById(consultationId).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    const analysis = await this.analysisDbService.markAnalysisAsNotified(consultationId);

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    consultation.analysisNotified = true;
    await consultation.save();

    return analysis;
  }

  /**
   * Vérifier si une analyse a été notifiée
   */
  async isAnalysisNotified(consultationId: string): Promise<boolean> {
    const consultation = await this.consultationModel
      .findById(consultationId)
      .select('analysisNotified')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation.analysisNotified === true;
  }
}