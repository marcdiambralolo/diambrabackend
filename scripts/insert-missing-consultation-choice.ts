import { NestFactory } from '@nestjs/core';
import { Connection } from 'mongoose';
import { AppModule } from '../src/app.module';
import { ConsultationChoiceSchema } from '../src/consultations/schemas/consultation-choice.schema';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get(Connection);
  const ConsultationChoiceModel = connection.model('ConsultationChoice', ConsultationChoiceSchema);

  // Exemple d'insertion d'un choix manquant
  const missingChoiceId = '694d32075b9d9dfa00bed232';
  const exists = await ConsultationChoiceModel.findById(missingChoiceId);
  if (!exists) {
    await ConsultationChoiceModel.create({
      _id: missingChoiceId,
      title: 'ORIENTATION DE CARRIÈRE',
      description: 'Description à compléter',
      frequence: 'LIBRE',
      participants: 'SOLO',
      offering: {},
    });
   }  
  await app.close();
}

run().catch(console.error);
