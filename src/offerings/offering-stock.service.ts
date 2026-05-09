import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OfferingStock, OfferingStockDocument } from './schemas/offering-stock.schema';

@Injectable()
export class OfferingStockService {
  constructor(
    @InjectModel(OfferingStock.name)
    private offeringStockModel: Model<OfferingStockDocument>,
  ) {}

  async incrementStock(offeringId: Types.ObjectId, name: string, quantity: number, category?: string): Promise<OfferingStock> {
    if (quantity <= 0) throw new BadRequestException('Quantité à ajouter invalide');
    return this.offeringStockModel.findOneAndUpdate(
      { offeringId },
      {
        $inc: { quantity },
        $setOnInsert: { name, category },
      },
      { new: true, upsert: true }
    );
  }

  async decrementStock(offeringId: Types.ObjectId, quantity: number): Promise<OfferingStock> {
    if (quantity <= 0) throw new BadRequestException('Quantité à retirer invalide');
    const stock = await this.offeringStockModel.findOne({ offeringId });
    if (!stock) throw new NotFoundException('Stock non trouvé');
    if (stock.quantity < quantity) throw new BadRequestException('Stock insuffisant');
    stock.quantity -= quantity;
    await stock.save();
    return stock;
  }

  async getAvailable(): Promise<OfferingStock[]> {
    return this.offeringStockModel.find({ quantity: { $gt: 0 } }).exec();
  }

  async getAll(): Promise<OfferingStock[]> {
    return this.offeringStockModel.find().exec();
  }
}
