import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(@InjectModel(Service.name) private serviceModel: Model<ServiceDocument>) {}

  async create(createServiceDto: CreateServiceDto) {
    const existing = await this.serviceModel.findOne({ slug: createServiceDto.slug }).exec();
    if (existing) {
      throw new ConflictException('Service with this slug already exists');
    }

    const service = new this.serviceModel(createServiceDto);
    return service.save();
  }

  async findAll(query: { page?: number; limit?: number; type?: string; isActive?: boolean }) {
    const { page = 1, limit = 20, type, isActive } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;

    const [services, total] = await Promise.all([
      this.serviceModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.serviceModel.countDocuments(filter).exec(),
    ]);

    return { services, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const service = await this.serviceModel.findById(id).exec();
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async findBySlug(slug: string) {
    const service = await this.serviceModel.findOne({ slug }).exec();
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const service = await this.serviceModel
      .findByIdAndUpdate(id, updateServiceDto, { new: true })
      .exec();
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async remove(id: string) {
    const service = await this.serviceModel.findByIdAndDelete(id).exec();
    if (!service) throw new NotFoundException('Service not found');
  }

    // --- Consultations ---
    async createConsultation(dto: any) {
      // TODO: Implémenter la création d'une consultation
      return {};
    }

    async findAllConsultations() {
      // TODO: Implémenter la récupération de toutes les consultations
      return [];
    }

    async findOneConsultation(id: string) {
      // TODO: Implémenter la récupération d'une consultation par ID
      return {};
    }

    async updateConsultation(id: string, dto: any) {
      // TODO: Implémenter la modification d'une consultation
      return {};
    }

    async removeConsultation(id: string) {
      // TODO: Implémenter la suppression d'une consultation
      return;
    }

    // --- Offrandes ---
    async createOffrande(dto: any) {
      // TODO: Implémenter la création d'une offrande
      return {};
    }

    async findAllOffrandes() {
      // TODO: Implémenter la récupération de toutes les offrandes
      return [];
    }

    async findOneOffrande(id: string) {
      // TODO: Implémenter la récupération d'une offrande par ID
      return {};
    }

    async updateOffrande(id: string, dto: any) {
      // TODO: Implémenter la modification d'une offrande
      return {};
    }

    async removeOffrande(id: string) {
      // TODO: Implémenter la suppression d'une offrande
      return;
    }

    // --- Paniers ---
    async createPanier(dto: any) {
      // TODO: Implémenter la création d'un panier utilisateur
      return {};
    }

    async findAllPaniers() {
      // TODO: Implémenter la récupération de tous les paniers
      return [];
    }

    async findOnePanier(id: string) {
      // TODO: Implémenter la récupération d'un panier par ID
      return {};
    }

    async updatePanier(id: string, dto: any) {
      // TODO: Implémenter la modification d'un panier
      return {};
    }

    async removePanier(id: string) {
      // TODO: Implémenter la suppression d'un panier
      return;
    }

    // --- Achats dans le panier ---
    async addAchat(panierId: string, dto: any) {
      // TODO: Implémenter l'ajout d'un achat au panier
      return {};
    }

    async findAchats(panierId: string) {
      // TODO: Implémenter la récupération des achats d'un panier
      return [];
    }

    async removeAchat(panierId: string, achatId: string) {
      // TODO: Implémenter la suppression d'un achat du panier
      return;
    }
}
