import { Injectable, Inject, forwardRef, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { OfferingStockService } from '../offerings/offering-stock.service';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { OfferingsService } from '../offerings/offerings.service';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';

interface OfferingItem {
  offeringId: string | Types.ObjectId | any;
  quantity: number;
}

export interface UserOffering {
  offeringId: string;
  quantity: number;
  offering?: any;
  illustrationUrl?: string;
}

interface OfferingStats {
  _id: Types.ObjectId;
  totalSold: number;
  transactions: number;
}

interface ConsumptionResult {
  success: boolean;
  message: string;
  consumedOfferings: Array<{
    offeringId: string;
    quantity: number;
    remainingQuantity?: number;
  }>;
}

export interface ConsultationValidationResult extends ConsumptionResult {
  consultationId: string;
  consultationStatus: ConsultationStatus;
}

@Injectable()
export class WalletOfferingsService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
    @Inject(forwardRef(() => OfferingStockService))
    private offeringStockService: OfferingStockService,
    @InjectModel(Consultation.name)
    private consultationModel: Model<ConsultationDocument>,
    @Inject(forwardRef(() => OfferingsService))
    private offeringsService: OfferingsService,
  ) {}

  /**
   * Retourne les offrandes agrégées du wallet de l'utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des offrandes avec quantités
   */
  async getUserOfferings(userId: string): Promise<UserOffering[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }

    const transactions = await this.walletTransactionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      })
      .populate({
        path: 'items.offeringId',
        model: 'Offering',
        select: 'name category price description isActive illustrationUrl',
      })
      .sort({ createdAt: -1 })
      .exec();

    // Regrouper les offrandes par ID avec somme des quantités
    const offeringsMap = new Map<string, { quantity: number; offering: any }>();

    transactions.forEach(transaction => {
      if (!transaction.items || !Array.isArray(transaction.items)) {
        return;
      }

      const sign = transaction['type'] === 'consumption' ? -1 : 1;

      transaction.items.forEach(item => {
        if (!item.offeringId || !item.quantity || item.quantity <= 0) {
          return;
        }

        // Normaliser l'ID de l'offrande
        const offeringId = this.normalizeOfferingId(item.offeringId);
        
        if (!offeringId) {
          return;
        }

        const current = offeringsMap.get(offeringId);
        const offeringData = this.extractOfferingData(item.offeringId);

        if (current) {
          current.quantity += item.quantity * sign;
        } else {
          offeringsMap.set(offeringId, {
            quantity: item.quantity * sign,
            offering: offeringData,
          });
        }
      });
    });

    // Convertir en tableau et filtrer
    const result = Array.from(offeringsMap.entries())
      .map(([offeringId, data]) => ({
        offeringId,
        quantity: data.quantity,
        offering: data.offering,
      }))
      .filter(item =>
        item.quantity > 0 &&
        item.offering &&
        item.offering.isActive !== false // Exclure les offrandes inactives
      )
      .sort((a, b) => b.quantity - a.quantity); // Tri par quantité décroissante

    return result;
  }

  /**
   * Consomme les offrandes pour une consultation
   * @param userId - ID de l'utilisateur
   * @param consultationId - ID de la consultation
   * @param offerings - Liste des offrandes à consommer
   * @returns Résultat de la consommation
   */
  async consumeOfferings(
    userId: string | undefined,
    consultationId: string,
    offerings: Array<{ offeringId: string; quantity: number }>,
  ): Promise<ConsumptionResult> {
    // Validation de la consultation
    if (!Types.ObjectId.isValid(consultationId)) {
      throw new BadRequestException('ID consultation invalide');
    }

    // Résoudre l'utilisateur si non fourni
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const consultation = await this.consultationModel.findById(consultationId).select('clientId');
      if (!consultation || !consultation.clientId) {
        throw new BadRequestException('Impossible de déterminer l\'utilisateur pour cette consultation');
      }
      resolvedUserId = consultation.clientId.toString();
    }

    if (!Types.ObjectId.isValid(resolvedUserId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }

    if (!Array.isArray(offerings) || offerings.length === 0) {
      throw new BadRequestException('Liste d\'offrandes invalide');
    }

    const consumedItems = await this.prepareConsumedItems(resolvedUserId, offerings);

    // Vérifier que la consultation n'a pas déjà consommé des offrandes
    const existingConsumption = await this.walletTransactionModel.findOne({
      consultationId,
      type: 'consumption',
    });

    if (existingConsumption) {
      throw new BadRequestException('Cette consultation a déjà consommé des offrandes');
    }

    return this.persistConsumption({
      userId: resolvedUserId,
      consumedItems,
      consultationId,
      metadata: { consultationId },
      paymentMethod: 'wallet_offerings',
      successMessage: 'Offrandes consommées avec succès',
      transactionPrefix: 'TXN-CONS',
      paymentTokenPrefix: 'CONS',
    });
  }

  async consumeOfferingsForBookPurchase(
    userId: string,
    bookId: string,
    offerings: Array<{ offeringId: string; quantity: number }>,
  ): Promise<ConsumptionResult> {
    if (!Types.ObjectId.isValid(bookId)) {
      throw new BadRequestException('ID livre invalide');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }

    const consumedItems = await this.prepareConsumedItems(userId, offerings);

    return this.persistConsumption({
      userId,
      consumedItems,
      metadata: { bookId },
      paymentMethod: 'wallet_book_offerings',
      successMessage: 'Offrandes consommées pour le livre avec succès',
      transactionPrefix: 'TXN-BOOK',
      paymentTokenPrefix: 'BOOK',
    });
  }

  async validateConsultationOfferings(
    userId: string,
    consultationId: string,
    offerings: Array<{ offeringId: string; quantity: number }>,
  ): Promise<ConsultationValidationResult> {
    if (!Types.ObjectId.isValid(consultationId)) {
      throw new BadRequestException('ID consultation invalide');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }

    const consultation = await this.consultationModel
      .findById(consultationId)
      .select('_id clientId status isPaid')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation introuvable');
    }

    if (consultation.clientId?.toString() !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas valider cette consultation');
    }

    const previousStatus = consultation.status;
    const previousIsPaid = Boolean((consultation as any).isPaid);

    await this.consultationModel.findByIdAndUpdate(consultationId, {
      status: ConsultationStatus.PENDING,
      isPaid: true,
    }).exec();

    try {
      const consumption = await this.consumeOfferings(userId, consultationId, offerings);

      return {
        ...consumption,
        consultationId,
        consultationStatus: ConsultationStatus.PENDING,
      };
    } catch (error) {
      await this.consultationModel.findByIdAndUpdate(consultationId, {
        status: previousStatus,
        isPaid: previousIsPaid,
      }).exec();

      throw error;
    }
  }

  private async prepareConsumedItems(
    userId: string,
    offerings: Array<{ offeringId: string; quantity: number }>,
  ): Promise<Array<{ offeringId: string; quantity: number }>> {
    if (!Array.isArray(offerings) || offerings.length === 0) {
      throw new BadRequestException('Liste d\'offrandes invalide');
    }

    // Vérifier que l'utilisateur possède suffisamment d'offrandes
    const userOfferings = await this.getUserOfferings(userId);
    const consumedItems = [] as Array<{ offeringId: string; quantity: number }>;

    for (const requestedItem of offerings) {
      if (!Types.ObjectId.isValid(requestedItem.offeringId)) {
        throw new BadRequestException(`ID offrande invalide: ${requestedItem.offeringId}`);
      }
      if (requestedItem.quantity <= 0) {
        throw new BadRequestException(`Quantité invalide pour l'offrande ${requestedItem.offeringId}`);
      }

      const userOffering = userOfferings.find(
        item => item.offeringId === requestedItem.offeringId.toString(),
      );

      if (!userOffering) {
        throw new BadRequestException(
          `Offrande ${requestedItem.offeringId} non trouvée dans le wallet`,
        );
      }

      if (userOffering.quantity < requestedItem.quantity) {
        throw new BadRequestException(
          `Quantité insuffisante pour l'offrande ${requestedItem.offeringId}. ` +
            `Possédé: ${userOffering.quantity}, Demandé: ${requestedItem.quantity}`,
        );
      }

      consumedItems.push({
        offeringId: requestedItem.offeringId,
        quantity: requestedItem.quantity,
      });
    }

    return consumedItems;
  }

  private async persistConsumption(params: {
    userId: string;
    consumedItems: Array<{ offeringId: string; quantity: number }>;
    consultationId?: string;
    metadata?: Record<string, unknown>;
    paymentMethod: string;
    successMessage: string;
    transactionPrefix: string;
    paymentTokenPrefix: string;
  }): Promise<ConsumptionResult> {
    const {
      userId,
      consumedItems,
      consultationId,
      metadata,
      paymentMethod,
      successMessage,
      transactionPrefix,
      paymentTokenPrefix,
    } = params;

    // Récupérer les détails des offrandes
    const offeringIds = consumedItems.map(item => item.offeringId);
    const offeringsData = await this.offeringsService['offeringModel']
      .find({ _id: { $in: offeringIds } })
      .select('_id name category price')
      .lean();

    const offeringMap = new Map(
      offeringsData.map((o: any) => [o._id.toString(), o]),
    );

    // Préparer les items complets pour le stockage
    const normalizedItems = consumedItems.map(item => {
      const offering = offeringMap.get(item.offeringId.toString());
      if (!offering) {
        throw new BadRequestException(`Offrande introuvable: ${item.offeringId}`);
      }

      const unitPrice = offering.price ?? 0;
      return {
        offeringId: item.offeringId.toString(),
        quantity: item.quantity,
        name: offering.name,
        // icon supprimé, illustrationUrl utilisé directement si besoin
        category: offering.category,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      };
    });

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    try {
      // Créer une transaction de consommation (traçabilité)
      const timestamp = Date.now();
      const transactionPayload: Partial<WalletTransaction> & Record<string, any> = {
        userId,
        type: 'consumption',
        status: 'completed',
        transactionId: `${transactionPrefix}-${timestamp}`,
        paymentToken: `${paymentTokenPrefix}-${timestamp}`,
        paymentMethod,
        items: normalizedItems,
        totalAmount,
        metadata,
      };

      if (consultationId) {
        transactionPayload.consultationId = consultationId;
      }

      await this.walletTransactionModel.create(transactionPayload);

      // Décrémenter le stock pour chaque offrande consommée
      const stockResults = [];
      for (const item of consumedItems) {
        const stockResult = await this.offeringStockService.decrementStock(
          new Types.ObjectId(item.offeringId),
          item.quantity,
        );
        stockResults.push({
          offeringId: item.offeringId,
          quantity: item.quantity,
          remainingQuantity: stockResult.remainingQuantity,
        });
      }

      return {
        success: true,
        message: successMessage,
        consumedOfferings: stockResults,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la consommation des offrandes: ${error.message}`,
      );
    }
  }

  /**
   * Récupère les statistiques des offrandes vendues
   * @returns Statistiques des ventes d'offrandes
   */
  async getOfferingsStats(): Promise<OfferingStats[]> {
    try {
      const stats = await this.walletTransactionModel.aggregate([
        // Filtrer uniquement les transactions d'achat complétées
        { 
          $match: { 
            status: 'completed',
            type: { $in: ['purchase', 'refund'] } // Inclure les remboursements
          } 
        },
        // Déplier les items
        { $unwind: '$items' },
        // Grouper par offrande avec ajustement pour les remboursements
        {
          $group: {
            _id: '$items.offeringId',
            totalSold: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'refund'] },
                  { $multiply: ['$items.quantity', -1] }, // Négatif pour les remboursements
                  '$items.quantity'
                ]
              }
            },
            purchaseCount: {
              $sum: { $cond: [{ $ne: ['$type', 'refund'] }, 1, 0] }
            },
            refundCount: {
              $sum: { $cond: [{ $eq: ['$type', 'refund'] }, 1, 0] }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $ne: ['$type', 'refund'] },
                  { $multiply: ['$items.quantity', '$items.unitPrice'] },
                  0
                ]
              }
            },
          }
        },
        // S'assurer que totalSold est positif
        {
          $match: {
            totalSold: { $gt: 0 }
          }
        },
        // Trier par quantité vendue décroissante
        { $sort: { totalSold: -1 } },
        // Formater la réponse
        {
          $project: {
            _id: 1,
            totalSold: 1,
            purchaseCount: 1,
            refundCount: 1,
            totalRevenue: 1,
            netSold: { $subtract: ['$purchaseCount', '$refundCount'] }
          }
        }
      ]);

      return stats;
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  /**
   * Récupère les offrandes consommées pour une consultation
   * @param consultationId - ID de la consultation
   * @returns Liste des offrandes consommées
   */
  async getConsultationConsumedOfferings(consultationId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(consultationId)) {
      throw new BadRequestException('ID consultation invalide');
    }

    const consumption = await this.walletTransactionModel
      .findOne({
        consultationId: new Types.ObjectId(consultationId),
        type: 'consumption',
        status: 'completed',
      })
      .populate({
        path: 'items.offeringId',
        model: 'Offering',
        select: 'name category',
      })
      .exec();

    return consumption?.items || [];
  }

  /**
   * Normalise l'ID d'une offrande
   * @param offeringId - ID à normaliser
   * @returns ID normalisé sous forme de chaîne
   */
  private normalizeOfferingId(offeringId: any): string | null {
    if (!offeringId) return null;

    if (typeof offeringId === 'string' && Types.ObjectId.isValid(offeringId)) {
      return offeringId;
    }

    if (offeringId instanceof Types.ObjectId) {
      return offeringId.toString();
    }

    if (typeof offeringId === 'object' && offeringId._id) {
      return offeringId._id.toString();
    }

    return null;
  }

  /**
   * Extrait les données d'une offrande
   * @param offeringData - Données de l'offrande
   * @returns Données nettoyées de l'offrande
   */
  private extractOfferingData(offeringData: any): any | null {
    if (!offeringData) return null;

    if (typeof offeringData === 'object' && offeringData._id) {
      return {
        _id: offeringData._id,
        name: offeringData.name,
        category: offeringData.category,
        price: offeringData.price,
        description: offeringData.description,
        isActive: offeringData.isActive !== false,
        illustrationUrl: offeringData.illustrationUrl,
      };
    }

    return null;
  }
}