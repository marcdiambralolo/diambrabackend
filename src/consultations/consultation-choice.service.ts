
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';
 

@Injectable()
export class ConsultationChoiceService {
  constructor(
    @InjectModel('ConsultationChoice')
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
  ) { } 

  async findByIdRaw(id: string): Promise<ConsultationChoice> {
    const choice = await this.consultationChoiceModel.findById(id).exec();
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable par raw`);
    }
    return choice;
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

 

}