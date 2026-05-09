/**
 * Script de test pour la détection du pays lors de la création d'une consultation
 * 
 * Usage: node scripts/test-country-detection.js
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000'; // ou votre URL de production
const AUTH_TOKEN = 'VOTRE_JWT_TOKEN_ICI'; // À remplacer par un vrai token

// Données de test
const testConsultation = {
  title: 'Test de détection de pays',
  description: 'Test automatique de géolocalisation',
  type: 'NUMEROLOGIE',
  rubriqueId: '6784f6da2b21c929c0baed20', // À adapter selon votre base
  formData: {
    nom: 'Test',
    prenoms: 'Utilisateur',
    dateNaissance: '1990-01-01',
    heureNaissance: '10:00',
    villeNaissance: 'Abidjan',
    paysNaissance: 'Côte d\'Ivoire',
    genre: 'M',
    email: 'test@example.com'
  },
  status: 'PENDING',
  price: 0
};

async function testCountryDetection() {
  try {
    console.log('🧪 Début du test de détection de pays...\n');

    // Test 1: Création de consultation avec token d'authentification
    console.log('📍 Test 1: Création de consultation avec authentification');
    console.log('-----------------------------------------------------------');
    
    const response = await axios.post(
      `${API_URL}/consultations`,
      testConsultation,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✅ Consultation créée avec succès !');
      console.log('📋 ID de la consultation:', response.data.id || response.data.consultationId);
      console.log('🌍 Pays détecté:', response.data.country || 'Non spécifié');
      console.log('');
      
      // Récupérer les détails de la consultation
      const consultationId = response.data.id || response.data.consultationId;
      
      console.log('📍 Test 2: Vérification des données enregistrées');
      console.log('-----------------------------------------------------------');
      
      const detailsResponse = await axios.get(
        `${API_URL}/consultations/${consultationId}`,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        }
      );

      console.log('✅ Détails de la consultation récupérés');
      console.log('🌍 Pays enregistré:', detailsResponse.data.country || 'Non spécifié');
      console.log('📊 Données complètes:', JSON.stringify(detailsResponse.data, null, 2));
    } else {
      console.log('❌ Échec de la création de consultation');
      console.log('Réponse:', response.data);
    }

    console.log('\n✨ Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message || error.message);
      console.error('Données:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Test de géolocalisation directe avec différentes IPs
async function testGeolocalization() {
  console.log('\n🌍 Test de géolocalisation avec différentes IPs');
  console.log('================================================\n');

  const testIPs = [
    { ip: '8.8.8.8', expected: 'États-Unis' },
    { ip: '197.234.221.1', expected: 'Côte d\'Ivoire' },
    { ip: '2.2.2.2', expected: 'France' },
    { ip: '127.0.0.1', expected: 'Local (non géolocalisable)' }
  ];

  const geoip = require('geoip-lite');

  testIPs.forEach(({ ip, expected }) => {
    const geo = geoip.lookup(ip);
    if (geo) {
      console.log(`✅ IP: ${ip.padEnd(15)} → ${geo.country} (${expected})`);
    } else {
      console.log(`⚠️  IP: ${ip.padEnd(15)} → Non géolocalisable (${expected})`);
    }
  });
}

// Fonction principale
async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Test de détection du pays lors des consultations ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Vérifier que le token est défini
  if (AUTH_TOKEN === 'VOTRE_JWT_TOKEN_ICI') {
    console.log('⚠️  ATTENTION: Vous devez d\'abord définir un token JWT valide');
    console.log('📝 Instructions:');
    console.log('   1. Connectez-vous à l\'application');
    console.log('   2. Récupérez votre token JWT');
    console.log('   3. Remplacez AUTH_TOKEN dans ce script');
    console.log('   4. Relancez le script\n');
    
    // On peut quand même tester la géolocalisation sans API
    await testGeolocalization();
    return;
  }

  // Exécuter les tests
  await testCountryDetection();
  await testGeolocalization();
}

// Exécution
main();
