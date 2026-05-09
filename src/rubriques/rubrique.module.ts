import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rubrique, RubriqueSchema } from './rubrique.schema';
import { Analysis, AnalysisSchema } from '../consultations/schemas/analysis.schema';
import { RubriqueService } from './rubrique.service';
import { RubriqueBoutonService } from './rubriquebouton.service';
import { RubriqueController } from './rubrique.controller';
import { UserConsultationChoice, UserConsultationChoiceSchema } from '../consultations/schemas/user-consultation-choice.schema';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rubrique.name, schema: RubriqueSchema },
      { name: UserConsultationChoice.name, schema: UserConsultationChoiceSchema },
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Analysis.name, schema: AnalysisSchema },
    ]),
  ],
  providers: [RubriqueService, RubriqueBoutonService],
  controllers: [RubriqueController],
  exports: [RubriqueService, RubriqueBoutonService],
})
export class RubriqueModule { }
