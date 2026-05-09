import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Categorie, CategorieDocument } from './categorie.schema';
import { CreateCategorieDto, UpdateCategorieDto } from './categorie.dto';
import { ConsultationChoiceStatusService } from '../consultations/consultation-choice-status.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Categorie.name) private categorieModel: Model<CategorieDocument>,
    @Inject(forwardRef(() => ConsultationChoiceStatusService))
    private readonly statusService: ConsultationChoiceStatusService,
  ) { }

  async findAll() {
    return this.categorieModel.find().populate({ path: 'rubriques', model: 'Rubrique' }).exec();
  }

  async findOne(id: string, userId?: string) {
    if (!id || id === 'undefined' || !Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID de catégorie invalide');
    }
    const cat = await this.categorieModel.findById(id).populate({ path: 'rubriques', model: 'Rubrique' });
    if (!cat) throw new NotFoundException('Catégorie non trouvée');
    
    // Si userId est fourni, enrichir avec les statuts de consultation
    if (userId && cat.rubriques) {
      const plainCat = cat.toObject();
      
      // Enrichir chaque rubrique avec les statuts de ses choix
      const enrichedRubriques = await Promise.all(
        plainCat.rubriques.map(async (rubrique: any) => {
          if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
            const choiceIds = rubrique.consultationChoices.map((c: any) => c._id?.toString()).filter(Boolean);
            
            if (choiceIds.length > 0) {
              const statusResponse = await this.statusService.getUserChoicesStatus(userId, choiceIds);
              const statusMap = new Map(statusResponse.choices.map(s => [s.choiceId, s]));
              
              rubrique.consultationChoices = rubrique.consultationChoices.map((choice: any) => ({
                choice,
                status: statusMap.get(choice._id?.toString()) || {
                  choiceId: choice._id?.toString() || '',
                  choiceTitle: choice.title,
                  buttonStatus: 'CONSULTER',
                  hasActiveConsultation: false,
                  consultationId: null,
                },
              }));
            }
          }
          return rubrique;
        })
      );
      
      return { ...plainCat, rubriques: enrichedRubriques };
    }
    
    return cat;
  }

  async create(dto: CreateCategorieDto) {
    const created = await this.categorieModel.create({
      ...dto,
      rubriques: dto.rubriques?.map(id => new Types.ObjectId(id)) || [],
    });

    // Mettre à jour le champ categorie des rubriques associées
    if (dto.rubriques && dto.rubriques.length > 0) {
      const rubriqueModel = this.categorieModel.db.model('Rubrique');
      await rubriqueModel.updateMany(
        { _id: { $in: dto.rubriques } },
        { $set: { categorieId: created._id } }
      );
    }
    return created;
  }

  async update(id: string, dto: UpdateCategorieDto) {
    const updated = await this.categorieModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...dto,
          rubriques: dto.rubriques?.map(rid => new Types.ObjectId(rid)),
        },
      },
      { new: true },
    ).populate('rubriques');
    if (!updated) throw new NotFoundException('Catégorie non trouvée');

    // Mettre à jour le champ categorie des rubriques associées
    if (dto.rubriques && dto.rubriques.length > 0) {
      const rubriqueModel = this.categorieModel.db.model('Rubrique');
      await rubriqueModel.updateMany(
        { _id: { $in: dto.rubriques } },
        { $set: { categorieId: updated._id } }
      );
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.categorieModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Catégorie non trouvée');
    return deleted;
  }

  /**
   * Retourne une catégorie avec id, nom, description et ses rubriques (id, nom, titre, description, categorieId)
   */
  async getCategorieWithRubriques(id: string) {
    if (!id || id === 'undefined' || !Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID de catégorie invalide');
    }
    const cat = await this.categorieModel.findById(id).populate({ path: 'rubriques', model: 'Rubrique' }).exec();
    if (!cat) throw new NotFoundException('Catégorie non trouvée');

 
    const rubriques = (cat.rubriques || []).map((r: any) => ({
      _id: r._id?.toString(),
      titre: r.titre,
      description: r.description,
      categorieId: r.categorieId?.toString() || null,
    }));
    return {
      _id: cat._id.toString(),
      titre: cat.nom,
      description: cat.description,
      rubriques,
    };
  }
}