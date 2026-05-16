import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rubrique, RubriqueSchema } from './rubrique.schema';
 import { RubriqueService } from './rubrique.service';
 import { RubriqueController } from './rubrique.controller';
import { UserConsultationChoice, UserConsultationChoiceSchema } from '../consultations/schemas/user-consultation-choice.schema';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rubrique.name, schema: RubriqueSchema },
      { name: UserConsultationChoice.name, schema: UserConsultationChoiceSchema },
      { name: Consultation.name, schema: ConsultationSchema },
     ]),
  ],
  providers: [RubriqueService],
  controllers: [RubriqueController],
  exports: [RubriqueService],
})
export class RubriqueModule { }
