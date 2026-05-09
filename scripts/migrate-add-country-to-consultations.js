/**
 * Script de migration pour ajouter le champ 'country' aux consultations existantes
 * 
 * Ce script met à jour toutes les consultations existantes en ajoutant le champ 'country'
 * basé sur les données formData.paysNaissance ou une valeur par défaut
 * 
 * Usage: node scripts/migrate-add-country-to-consultations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Configuration de la connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monetoile';

async function migrateConsultations() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Masquer les credentials
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    const db = mongoose.connection.db;
    const consultationsCollection = db.collection('consultations');

    // Statistiques initiales
    const totalConsultations = await consultationsCollection.countDocuments();
    const consultationsWithoutCountry = await consultationsCollection.countDocuments({
      $or: [
        { country: null },
        { country: { $exists: false } }
      ]
    });

    console.log('📊 Statistiques initiales:');
    console.log('   Total de consultations:', totalConsultations);
    console.log('   Sans champ country:', consultationsWithoutCountry);
    console.log('');

    if (consultationsWithoutCountry === 0) {
      console.log('✨ Aucune migration nécessaire. Toutes les consultations ont déjà un pays.');
      await mongoose.disconnect();
      return;
    }

    console.log('🔄 Migration en cours...\n');

    // Étape 1: Mettre à jour avec formData.paysNaissance
    console.log('📍 Étape 1: Mise à jour depuis formData.paysNaissance');
    const result1 = await consultationsCollection.updateMany(
      {
        $or: [
          { country: null },
          { country: { $exists: false } }
        ],
        'formData.paysNaissance': { $exists: true, $ne: null, $ne: '' }
      },
      [
        {
          $set: {
            country: '$formData.paysNaissance'
          }
        }
      ]
    );
    console.log(`   ✅ ${result1.modifiedCount} consultations mises à jour depuis paysNaissance`);

    // Étape 2: Mettre à jour avec formData.countryOfBirth
    console.log('📍 Étape 2: Mise à jour depuis formData.countryOfBirth');
    const result2 = await consultationsCollection.updateMany(
      {
        $or: [
          { country: null },
          { country: { $exists: false } }
        ],
        'formData.countryOfBirth': { $exists: true, $ne: null, $ne: '' }
      },
      [
        {
          $set: {
            country: '$formData.countryOfBirth'
          }
        }
      ]
    );
    console.log(`   ✅ ${result2.modifiedCount} consultations mises à jour depuis countryOfBirth`);

    // Étape 3: Mettre à jour avec formData.country
    console.log('📍 Étape 3: Mise à jour depuis formData.country');
    const result3 = await consultationsCollection.updateMany(
      {
        $or: [
          { country: null },
          { country: { $exists: false } }
        ],
        'formData.country': { $exists: true, $ne: null, $ne: '' }
      },
      [
        {
          $set: {
            country: '$formData.country'
          }
        }
      ]
    );
    console.log(`   ✅ ${result3.modifiedCount} consultations mises à jour depuis country`);

    // Étape 4: Définir une valeur par défaut pour les consultations restantes
    console.log('📍 Étape 4: Application de la valeur par défaut');
    const result4 = await consultationsCollection.updateMany(
      {
        $or: [
          { country: null },
          { country: { $exists: false } }
        ]
      },
      {
        $set: {
          country: 'Côte d\'Ivoire'
        }
      }
    );
    console.log(`   ✅ ${result4.modifiedCount} consultations avec valeur par défaut`);

    // Statistiques finales
    console.log('\n📊 Statistiques finales:');
    const consultationsStillWithoutCountry = await consultationsCollection.countDocuments({
      $or: [
        { country: null },
        { country: { $exists: false } }
      ]
    });
    const consultationsWithCountry = await consultationsCollection.countDocuments({
      country: { $exists: true, $ne: null }
    });

    console.log('   Consultations avec pays:', consultationsWithCountry);
    console.log('   Consultations sans pays:', consultationsStillWithoutCountry);

    // Statistiques par pays
    console.log('\n🌍 Répartition par pays:');
    const countryStats = await consultationsCollection.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    countryStats.forEach(stat => {
      console.log(`   ${stat._id || '(Null)'}: ${stat.count} consultation(s)`);
    });

    console.log('\n✨ Migration terminée avec succès !');
    console.log(`📈 Total de consultations migrées: ${result1.modifiedCount + result2.modifiedCount + result3.modifiedCount + result4.modifiedCount}`);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Vérification avant migration
async function verifyBeforeMigration() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Migration: Ajout du champ country aux consultations     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  AVERTISSEMENT:');
  console.log('   Cette opération va modifier la base de données.');
  console.log('   Assurez-vous d\'avoir une sauvegarde avant de continuer.\n');

  // En production, vous pourriez ajouter une confirmation
  // const readline = require('readline').createInterface({
  //   input: process.stdin,
  //   output: process.stdout
  // });
  // 
  // readline.question('Continuer? (oui/non): ', async (answer) => {
  //   if (answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes') {
  //     await migrateConsultations();
  //   } else {
  //     console.log('Migration annulée.');
  //   }
  //   readline.close();
  // });

  // Pour l'instant, on lance directement
  await migrateConsultations();
}

// Exécution
verifyBeforeMigration();
