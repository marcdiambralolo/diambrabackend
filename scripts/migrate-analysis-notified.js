/**
 * Script de migration pour initialiser le champ analysisNotified
 * dans les consultations existantes
 * 
 * Usage: node scripts/migrate-analysis-notified.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monetoile';

async function migrateAnalysisNotified() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();

    const db = client.db();
    const consultations = db.collection('consultations');

    // 1. Compter les consultations sans le champ analysisNotified
    const withoutField = await consultations.countDocuments({
      analysisNotified: { $exists: false }
    });


    if (withoutField === 0) {
      return;
    }

    // 2. Initialiser à false pour toutes les consultations sans le champ
    const initResult = await consultations.updateMany(
      { analysisNotified: { $exists: false } },
      { $set: { analysisNotified: false } }
    );

    // 3. Mettre à true pour celles qui ont déjà un résultat
    const updateResult = await consultations.updateMany(
      {
        result: { $exists: true, $ne: null, $ne: '' },
        analysisNotified: false
      },
      { $set: { analysisNotified: true } }
    );

    // 4. Statistiques finales
    const notNotified = await consultations.countDocuments({
      analysisNotified: false
    });
    const notified = await consultations.countDocuments({
      analysisNotified: true
    });
    const total = await consultations.countDocuments({});

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await client.close();

  }
}

// Exécuter la migration
migrateAnalysisNotified();
