/**
 * Script de test pour l'endpoint consultation-choice-status
 * 
 * Usage:
 * node test-consultation-status.js <userId> <choiceId>
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

async function testConsultationStatus(userId, choiceId) {
  console.log('\n🧪 Test de l\'endpoint consultation-choice-status');
  console.log('================================================\n');
  console.log(`User ID: ${userId}`);
  console.log(`Choice ID: ${choiceId}\n`);

  try {
    const url = `${BASE_URL}/consultation-choice-status/${userId}/${choiceId}`;
    console.log(`📡 Appel de l'endpoint: ${url}`);
    
    const response = await axios.get(url);
    
    console.log('\n✅ Réponse reçue:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n📊 Analyse du statut:');
    const { buttonStatus, hasActiveConsultation, consultationId } = response.data;
    
    switch (buttonStatus) {
      case 'CONSULTER':
        console.log('🟢 Statut: CONSULTER');
        console.log('   → Aucune consultation active ou non payée');
        console.log('   → L\'utilisateur peut initier une nouvelle consultation');
        break;
      
      case 'RÉPONSE EN ATTENTE':
        console.log('🟡 Statut: RÉPONSE EN ATTENTE');
        console.log('   → Consultation payée mais analyse non notifiée');
        console.log(`   → Consultation ID: ${consultationId}`);
        break;
      
      case 'VOIR L\'ANALYSE':
        console.log('🟢 Statut: VOIR L\'ANALYSE');
        console.log('   → Analyse disponible et notifiée');
        console.log(`   → Consultation ID: ${consultationId}`);
        break;
      
      default:
        console.log('❌ Statut inconnu:', buttonStatus);
    }
    
    console.log(`\n   hasActiveConsultation: ${hasActiveConsultation}`);
    console.log(`   consultationId: ${consultationId || 'null'}`);
    
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'appel API:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

// Récupérer les arguments de ligne de commande
const userId = process.argv[2];
const choiceId = process.argv[3];

if (!userId || !choiceId) {
  console.error('❌ Usage: node test-consultation-status.js <userId> <choiceId>');
  console.error('\nExemple:');
  console.error('  node test-consultation-status.js 507f1f77bcf86cd799439011 694cde9bde3392d3751a0fee');
  process.exit(1);
}

testConsultationStatus(userId, choiceId);
