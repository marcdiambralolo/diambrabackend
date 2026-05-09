// Script pour lister tous les choiceId de toutes les rubriques et détecter ceux qui n'ont pas de prompt associé
// Usage : node scripts/find-missing-choice-prompts.js

const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cosmique';

async function main() {
  await mongoose.connect(MONGO_URI);

  // Récupérer tous les choix de toutes les rubriques
  const rubriques = await mongoose.connection.collection('rubriques').find({}).toArray();
  const allChoiceIds = rubriques.flatMap(rub =>
    (rub.consultationChoices || []).map(choice => choice._id?.toString())
  ).filter(Boolean);

  // Récupérer tous les prompts existants
  const prompts = await mongoose.connection.collection('prompts').find({}).toArray();
  const promptChoiceIds = new Set(prompts.map(p => p.choiceId?.toString()));

  // Filtrer les choiceId sans prompt
  const missingChoiceIds = allChoiceIds.filter(id => !promptChoiceIds.has(id));
 
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
