
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offering } from './schemas/offering.schema';

@Injectable()
export class OfferingsService {
  constructor(
    @InjectModel(Offering.name) private offeringModel: Model<Offering>,
  ) {}

  async create(data: Partial<Offering>): Promise<Offering> {
    const offering = new this.offeringModel(data);
    return offering.save();
  }
  async findAll(): Promise<Offering[]> {
    return this.offeringModel.find().exec();
  }

  /**
   * Récupère les offrandes par une liste d'IDs
   */
  async findByIds(ids: any[]): Promise<Offering[]> {
    if (!ids || !ids.length) return [];
    // Convertir les IDs en string pour robustesse
    const stringIds = ids.map(id => id?.toString());
    return this.offeringModel.find({ _id: { $in: stringIds } }).exec();
  }

  async findById(id: string): Promise<Offering | null> {
    if (!id) return null;
    return this.offeringModel.findById(id).exec();
  }

  async updateById(id: string, updateData: Partial<Offering>): Promise<Offering | null> {
    if (!id) return null;
    return this.offeringModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async bulkUpdate(offerings: any[]): Promise<void> {
    // Supprimer toutes les offrandes existantes
    await this.offeringModel.deleteMany({});

    // Insérer les nouvelles offrandes, MongoDB générera _id automatiquement
    await this.offeringModel.insertMany(offerings.map(o => {
      const { id, ...rest } = o;
      console.log('Inserting offering, ignoring provided id:', id);
      return rest;
    }));
  }

    /**
   * Retourne les offrandes correspondant à un tableau d'ids
   * @param ids Tableau d'identifiants
   */
  async findManyByIds(ids: string[]): Promise<any[]> {
    console.log("Recherche des offrandes pour les IDs :", ids);
    if (!Array.isArray(ids) || ids.length === 0) return [];
    // Si tu utilises Mongoose :
    return this.offeringModel.find({ _id: { $in: ids } }).lean();
    // Sinon, adapte selon ton ORM ou ta logique :
    //return this.findAll().then(all => all.filter(o => ids.includes(o._id?.toString() || o.id?.toString())));
  }

  /**
   * Supprime une offrande par son ID
   * @param id string
   * @returns true si supprimé, false sinon
   */
  async deleteById(id: string): Promise<boolean> {
    if (!id) return false;
    const res = await this.offeringModel.deleteOne({ _id: id }).exec();
    return res.deletedCount > 0;
  }
}
