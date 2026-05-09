/**
 * Migration MongoDB pour renommer analyses.consultationID vers analyses.consultationId.
 *
 * Par defaut, le script fonctionne en dry-run et n'ecrit rien.
 * Utiliser --apply pour executer la migration.
 * Utiliser --drop-legacy pour supprimer consultationID apres copie.
 *
 * Exemples:
 *   node scripts/migrate-analysis-consultation-id.js
 *   node scripts/migrate-analysis-consultation-id.js --apply
 *   node scripts/migrate-analysis-consultation-id.js --apply --drop-legacy
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monetoile';
const APPLY = process.argv.includes('--apply');
const DROP_LEGACY = process.argv.includes('--drop-legacy');

function logHeader() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║ Migration analyses.consultationID -> consultationId        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Mode: ${APPLY ? 'apply' : 'dry-run'}`);
  console.log(`Suppression du champ legacy: ${DROP_LEGACY ? 'oui' : 'non'}`);
  console.log('');
}

async function collectStats(collection) {
  const [
    total,
    withLegacyOnly,
    withCanonicalOnly,
    withBoth,
    withMismatch,
    missingBoth,
  ] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({
      consultationID: { $exists: true, $ne: null },
      $or: [{ consultationId: { $exists: false } }, { consultationId: null }],
    }),
    collection.countDocuments({
      consultationId: { $exists: true, $ne: null },
      $or: [{ consultationID: { $exists: false } }, { consultationID: null }],
    }),
    collection.countDocuments({
      consultationID: { $exists: true, $ne: null },
      consultationId: { $exists: true, $ne: null },
    }),
    collection.countDocuments({
      consultationID: { $exists: true, $ne: null },
      consultationId: { $exists: true, $ne: null },
      $expr: { $ne: ['$consultationID', '$consultationId'] },
    }),
    collection.countDocuments({
      $and: [
        { $or: [{ consultationID: { $exists: false } }, { consultationID: null }] },
        { $or: [{ consultationId: { $exists: false } }, { consultationId: null }] },
      ],
    }),
  ]);

  return {
    total,
    withLegacyOnly,
    withCanonicalOnly,
    withBoth,
    withMismatch,
    missingBoth,
  };
}

function printStats(title, stats) {
  console.log(title);
  console.log(`  total: ${stats.total}`);
  console.log(`  legacy seulement: ${stats.withLegacyOnly}`);
  console.log(`  canonique seulement: ${stats.withCanonicalOnly}`);
  console.log(`  deux champs presents: ${stats.withBoth}`);
  console.log(`  divergences legacy/canonique: ${stats.withMismatch}`);
  console.log(`  sans aucun des deux champs: ${stats.missingBoth}`);
  console.log('');
}

async function migrate() {
  const client = new MongoClient(MONGO_URI);

  try {
    logHeader();
    await client.connect();

    const db = client.db();
    const analyses = db.collection('analyses');

    const before = await collectStats(analyses);
    printStats('Statistiques avant migration:', before);

    if (!APPLY) {
      console.log('Dry-run termine. Aucune ecriture effectuee.');
      return;
    }

    const copyResult = await analyses.updateMany(
      {
        consultationID: { $exists: true, $ne: null },
        $or: [{ consultationId: { $exists: false } }, { consultationId: null }],
      },
      [
        {
          $set: {
            consultationId: '$consultationID',
          },
        },
      ],
    );

    console.log(`Documents copies vers consultationId: ${copyResult.modifiedCount}`);

    if (DROP_LEGACY) {
      const dropResult = await analyses.updateMany(
        {
          consultationID: { $exists: true },
          consultationId: { $exists: true, $ne: null },
          $expr: { $eq: ['$consultationID', '$consultationId'] },
        },
        {
          $unset: { consultationID: '' },
        },
      );

      console.log(`Documents avec suppression du champ legacy: ${dropResult.modifiedCount}`);
    }

    const after = await collectStats(analyses);
    printStats('Statistiques apres migration:', after);

    if (after.withMismatch > 0) {
      console.log('Attention: des divergences entre consultationID et consultationId subsistent.');
    }
  } catch (error) {
    console.error('Erreur lors de la migration consultationId:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

migrate();