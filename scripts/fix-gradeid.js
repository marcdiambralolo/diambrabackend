// Script de correction des gradeId manquants dans les choix de consultation
// Usage : node fix-gradeid.js

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/cosmique'; // adapte si besoin
const GRADE_ID_FIX = '69a5be959de02cef260fabfb';

async function main() {
  await mongoose.connect(MONGO_URI);
  const Rubrique = mongoose.connection.collection('rubriques');

  const result = await Rubrique.updateMany(
    { 'consultationChoices.gradeId': { $in: [null, '', undefined] } },
    [
      {
        $set: {
          'consultationChoices': {
            $map: {
              input: '$consultationChoices',
              as: 'choice',
              in: {
                $mergeObjects: [
                  '$$choice',
                  {
                    gradeId: {
                      $cond: [
                        { $or: [
                          { $eq: ['$$choice.gradeId', null] },
                          { $eq: ['$$choice.gradeId', ''] },
                          { $not: ['$$choice.gradeId'] }
                        ] },
                        GRADE_ID_FIX,
                        '$$choice.gradeId'
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]
  );

  console.log('Rubriques modifiées :', result.modifiedCount);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
