    /**
     * Recherche une transaction par _id Mongo OU transactionId pour un utilisateur donné
     */
  

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { OfferingsService } from '../offerings/offerings.service';
import { BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { OfferingStockService } from '../offerings/offering-stock.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
    @Inject(forwardRef(() => OfferingsService))
    private offeringsService: OfferingsService,
    @Inject(forwardRef(() => OfferingStockService))
    private offeringStockService: OfferingStockService,
  ) {}

  async createTransaction(dto: CreateWalletTransactionDto, userId: string): Promise<WalletTransaction> {
    // Validation d’intégrité : vérifier que chaque offeringId existe
    const offeringIds = dto.items.map(item => item.offeringId);

    const found = await this.offeringsService['offeringModel']
      .find({ _id: { $in: offeringIds } })
      .select('_id name category price')
      .lean();

    const foundIds = found.map((o: any) => o._id.toString());
    const missing = offeringIds.filter(id => !foundIds.includes(id));
    if (missing.length > 0) {
      throw new BadRequestException({
        message: `Offrandes inexistantes: ${missing.join(', ')}`,
        error: 'Bad Request',
        statusCode: 400,
        receivedItems: dto.items,
        expectedField: 'offeringId',
        foundIds,
        offeringIds,
      });
    }

    // Enrichir chaque item avec les données d'offrande officielles et calculer les prix
    const offeringMap = new Map(found.map((o: any) => [o._id.toString(), o]));

    const normalizedItems = dto.items.map(item => {
      const offering = offeringMap.get(item.offeringId);
      const unitPrice = offering?.price ?? item.unitPrice ?? item.price;

      if (unitPrice === undefined || unitPrice === null) {
        throw new BadRequestException({
          message: `Prix manquant pour l'offrande ${item.offeringId}`,
          error: 'Bad Request',
          statusCode: 400,
        });
      }

      const quantity = Number(item.quantity) || 0;

      return {
        offeringId: item.offeringId,
        quantity,
        name: offering?.name ?? item.name,
        // icon supprimé
        category: offering?.category ?? item.category,
        unitPrice,
        totalPrice: unitPrice * quantity,
      };
    });

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Générer les champs manquants avec des valeurs par défaut
    const payload = {
      ...dto,
      items: normalizedItems,
      totalAmount,
      userId,
      transactionId: dto.transactionId || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentToken: dto.paymentToken || `TOKEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: dto.status || 'completed',
      paymentMethod: dto.paymentMethod || 'wallet_offering',
      type: dto.type || 'purchase',
    };

    try {
      const created = new this.walletTransactionModel(payload);
      const saved = await created.save();

      // Incrémenter le stock pour chaque item acheté
      for (const item of normalizedItems) {
        const offering = offeringMap.get(item.offeringId);
        if (!offering) continue;
        await this.offeringStockService.incrementStock(
          new Types.ObjectId(item.offeringId),
          offering.name,
          item.quantity,
          offering.category
        );
      }
      return saved;
    } catch (err) {
      console.error('[WalletService] Erreur lors de l\'enregistrement:', err);
      throw err;
    }
  }

    async findTransactionByIdOrTransactionId(id: string, userId: string): Promise<WalletTransaction | null> {
      // Recherche par _id Mongo OU transactionId, mais _id doit être un ObjectId valide
      const or: any[] = [];
      if (Types.ObjectId.isValid(id)) {
        or.push({ _id: id });
      }
      or.push({ transactionId: id });
      const tx = await this.walletTransactionModel.findOne({
        userId,
        $or: or,
      }).exec();
      return tx;
    }

  async getTransactionsByUser(userId: string): Promise<WalletTransaction[]> {
    // Populate items.offeringId with offering details
    return this.walletTransactionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'items.offeringId',
        model: 'Offering',
        select: 'name category price illustrationUrl',
      })
      .exec();
  }
}
