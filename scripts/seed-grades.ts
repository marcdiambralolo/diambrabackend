/**
 * Grade Initialization Seed Script
 * Usage: npm run seed:grades
 * 
 * This script initializes the 9 grades in MongoDB with default requirements.
 * It creates all grades and sets up the nextGradeId chain automatically.
 * 
 * Safe to run multiple times - won't create duplicates
 */

import * as mongoose from 'mongoose';

// Grade config data
const GRADE_CONFIGS = [
  {
    grade: 'ASPIRANT',
    level: 1,
    name: 'Aspirant',
    consultations: 3,
    rituels: 1,
    livres: 1,
  },
  {
    grade: 'CONTEMPLATEUR',
    level: 2,
    name: 'Contemplateur',
    consultations: 6,
    rituels: 2,
    livres: 1,
  },
  {
    grade: 'CONSCIENT',
    level: 3,
    name: 'Conscient',
    consultations: 9,
    rituels: 3,
    livres: 2,
  },
  {
    grade: 'INTEGRATEUR',
    level: 4,
    name: 'Intégrateur',
    consultations: 13,
    rituels: 4,
    livres: 2,
  },
  {
    grade: 'TRANSMUTANT',
    level: 5,
    name: 'Transmutant',
    consultations: 18,
    rituels: 6,
    livres: 3,
  },
  {
    grade: 'ALIGNE',
    level: 6,
    name: 'Aligné',
    consultations: 23,
    rituels: 8,
    livres: 4,
  },
  {
    grade: 'EVEILLE',
    level: 7,
    name: 'Éveillé',
    consultations: 28,
    rituels: 10,
    livres: 5,
  },
  {
    grade: 'SAGE',
    level: 8,
    name: 'Sage',
    consultations: 34,
    rituels: 10,
    livres: 6,
  },
  {
    grade: 'MAITRE_DE_SOI',
    level: 9,
    name: 'Maître de Soi',
    consultations: 40,
    rituels: 10,
    livres: 8,
  },
];

// Grade config schema
const GradeConfigSchema = new mongoose.Schema({
  grade: {
    type: String,
    enum: [
      'ASPIRANT',
      'CONTEMPLATEUR',
      'CONSCIENT',
      'INTEGRATEUR',
      'TRANSMUTANT',
      'ALIGNE',
      'EVEILLE',
      'SAGE',
      'MAITRE_DE_SOI',
    ],
    required: true,
    unique: true,
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 9,
    unique: true,
  },
  name: { type: String, required: true },
  requirements: {
    consultations: { type: Number, required: true },
    rituels: { type: Number, required: true },
    livres: { type: Number, required: true },
  },
  consultationChoices: {
    type: [
      {
        choiceId: String,
        title: String,
        description: String,
        frequence: String,
        participants: String,
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    default: [],
  },
  nextGradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GradeConfig',
    default: null,
  },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function seedGrades() {
  try {
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set in environment variables');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get or Create the model
    const GradeConfig =
      mongoose.models.GradeConfig ||
      mongoose.model('GradeConfig', GradeConfigSchema);

    // Clear existing grades if environment variable is set
    if (process.env.SEED_RESET === 'true') {
      console.log('🗑️  Clearing existing grades...');
      await (GradeConfig as any).deleteMany({});
    }

    // Create or skip existing grades
    let createdCount = 0;
    let skippedCount = 0;

    for (const config of GRADE_CONFIGS) {
      const existing = await (GradeConfig as any).findOne({ grade: config.grade });

      if (!existing) {
        await (GradeConfig as any).create({
          grade: config.grade,
          level: config.level,
          name: config.name,
          requirements: {
            consultations: config.consultations,
            rituels: config.rituels,
            livres: config.livres,
          },
          consultationChoices: [],
          nextGradeId: null,
          description: '',
        });
        console.log(`✅ Created grade: ${config.grade}`);
        createdCount++;
      } else {
        console.log(`⏭️  Grade already exists: ${config.grade}`);
        skippedCount++;
      }
    }

    // Set up the nextGradeId chain
    console.log('\n🔗 Setting up grade hierarchy...');
    const grades = await (GradeConfig as any).find().sort({ level: 1 });

    for (let i = 0; i < grades.length - 1; i++) {
      if (!grades[i].nextGradeId || grades[i].nextGradeId.toString() !== grades[i + 1]._id.toString()) {
        grades[i].nextGradeId = grades[i + 1]._id;
        await grades[i].save();
        console.log(
          `🔗 ${grades[i].name} → ${grades[i + 1].name}`,
        );
      }
    }

    // Last grade should have no next grade
    const lastGrade = grades[grades.length - 1];
    if (lastGrade.nextGradeId) {
      lastGrade.nextGradeId = null;
      await lastGrade.save();
    }

    console.log('\n✨ Grade seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${grades.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding grades:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedGrades();
