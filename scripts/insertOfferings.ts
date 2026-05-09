import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OfferingsService } from '../src/offerings/offerings.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const offeringsService = app.get(OfferingsService);

  // Charger les données depuis le fichier JSON
  const filePath = path.resolve(__dirname, '../../offerings.bulk.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.offerings || !Array.isArray(data.offerings)) {
    throw new Error('Le fichier JSON ne contient pas de tableau offerings');
  }

  await offeringsService.bulkUpdate(data.offerings);
  await app.close();
}

bootstrap().catch(err => {
  console.error('Erreur lors de l’insertion des offrandes:', err);
  process.exit(1);
});
