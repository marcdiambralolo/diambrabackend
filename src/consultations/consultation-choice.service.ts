
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';
import { Rubrique, RubriqueDocument } from '../rubriques/rubrique.schema';

@Injectable()
export class ConsultationChoiceService {
  constructor(
    @InjectModel('ConsultationChoice')
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
    @InjectModel(Rubrique.name)
    private rubriqueModel: Model<RubriqueDocument>,
  ) { } 

  async findByIdRaw(id: string): Promise<ConsultationChoice> {
    const choice = await this.consultationChoiceModel.findById(id).exec();
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable par raw`);
    }
    return choice;
  }

  async findChoiceInRubriquesById(id: string): Promise<any> {
    // Récupérer toutes les rubriques
    const rubriques = await this.rubriqueModel.find().exec();
    for (const rubrique of rubriques) {
      if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
        const found = rubrique.consultationChoices.find((choice: any) => choice._id?.toString() === id);
        if (found) {
          return {
            ...found as any, // conserve _id, title, description, frequence, participants, found,
            rubriqueId: rubrique._id,
            rubriqueTitle: rubrique.titre,
          };
        }
      }
    }
    throw new NotFoundException(`Aucun choix de consultation avec l'ID ${id} trouvé dans les rubriques.`);
  }

  async findAll(): Promise<ConsultationChoice[]> {
    return this.consultationChoiceModel.find().exec();
  }

  async findById(id: string): Promise<ConsultationChoice> {
    const choice = await this.consultationChoiceModel.findById(id).exec();
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable`);
    }
    return choice;
  }


  async findAllChoices(): Promise<any[]> {
    // Récupère toutes les rubriques et leurs choix
    const rubriques = await this.rubriqueModel.find().populate('categorieId').exec();
    const choicesWithoutPrompt: any[] = [];
    for (const rubrique of rubriques) {
      if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
        for (const choice of rubrique.consultationChoices) {
          choicesWithoutPrompt.push({
            _id: choice._id,
            title: choice.title,
            description: choice.description,
            offering: choice.offering,
            rubriqueId: rubrique._id,
            rubriqueTitle: rubrique.titre,
          });

        }
      }
    }
    return choicesWithoutPrompt;
  }

}