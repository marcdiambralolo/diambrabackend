/**
 * SCRIPT DE TEST POUR LE SYSTÈME DE GESTION DES PROMPTS
 * 
 * Ce script teste toutes les fonctionnalités du PromptsManager
 */

import PromptsManager from './prompts-manager';
import * as fs from 'fs';
import * as path from 'path';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testResult(testName: string, passed: boolean, details?: string) {
  if (passed) {
    log('green', `✅ ${testName}: PASS`);
    if (details) console.log(`   ${details}`);
  } else {
    log('red', `❌ ${testName}: FAIL`);
    if (details) console.log(`   ${details}`);
  }
}

// Test 1: Chargement de la structure
function testLoadStructure() {
  log('blue', '\n📋 Test 1: Chargement de la structure JSON');
  try {
    const structure = PromptsManager['loadPromptsStructure']();
    const categories = Object.keys(structure);
    testResult(
      'Chargement structure',
      categories.length > 0,
      `${categories.length} catégories trouvées`
    );
    return structure;
  } catch (error) {
    testResult('Chargement structure', false, (error as Error).message);
    return null;
  }
}

// Test 2: Chargement du contenu des prompts
function testLoadContent() {
  log('blue', '\n📄 Test 2: Chargement du fichier prompts.txt');
  try {
    const content = PromptsManager['loadPromptsContent']();
    testResult(
      'Chargement prompts.txt',
      content.length > 0,
      `${content.length} caractères chargés`
    );
    return content;
  } catch (error) {
    testResult('Chargement prompts.txt', false, (error as Error).message);
    return null;
  }
}

// Test 3: Récupération d'un prompt par titre
function testFindPromptByTitle() {
  log('blue', '\n🔍 Test 3: Recherche de prompt par titre');
  
  const testCases = [
    'MON SIGNE SOLAIRE',
    'MON ASCENDANT',
    'MISSION DE VIE',
    'ORIENTATION DE CARRIÈRE',
  ];
  
  let passed = 0;
  testCases.forEach(title => {
    const prompt = PromptsManager['findPromptByTitle'](title);
    if (prompt) {
      passed++;
      testResult(`Recherche "${title}"`, true, `${prompt.length} caractères`);
    } else {
      testResult(`Recherche "${title}"`, false, 'Prompt non trouvé');
    }
  });
  
  log('yellow', `\n   Résultat: ${passed}/${testCases.length} prompts trouvés`);
}

// Test 4: Récupération par ID de consultation
function testGetPromptById() {
  log('blue', '\n🎯 Test 4: Récupération par ID de consultation');
  
  const testIds = [
    'mon_signe_solaire',
    'mon_ascendant',
    'mission_de_vie',
    'orientation_carriere',
    'synastrie_couple',
    'annee_personnelle',
  ];
  
  let passed = 0;
  testIds.forEach(id => {
    const prompt = PromptsManager.getPromptByConsultationId(id);
    if (prompt) {
      passed++;
      testResult(`ID "${id}"`, true, `Prompt trouvé`);
    } else {
      testResult(`ID "${id}"`, false, 'ID introuvable');
    }
  });
  
  log('yellow', `\n   Résultat: ${passed}/${testIds.length} IDs valides`);
}

// Test 5: Récupération des informations de consultation
function testGetConsultationInfo() {
  log('blue', '\n📊 Test 5: Récupération des infos de consultation');
  
  const info = PromptsManager.getConsultationChoiceInfo('mon_signe_solaire');
  if (info) {
    testResult('Récupération info', true);
    console.log(`   ID: ${info.id}`);
    console.log(`   Titre: ${info.title}`);
    console.log(`   Type: ${info.type}`);
  } else {
    testResult('Récupération info', false);
  }
}

// Test 6: Remplissage des placeholders
function testFillPlaceholders() {
  log('blue', '\n✏️  Test 6: Remplissage des placeholders');
  
  const mockPrompt = `
    Bonjour [PRÉNOM],
    Né(e) le [DATE],
    À [VILLE, PAYS],
    Heure: [HEURE PRÉCISE]
  `;
  
  const userData = {
    prenom: 'Sophie',
    dateNaissance: '15/03/1990',
    ville: 'Paris',
    pays: 'France',
    heureNaissance: '14:30',
  };
  
  const filled = PromptsManager.fillPromptPlaceholders(mockPrompt, userData);
  
  const checks = [
    { placeholder: '[PRÉNOM]', value: 'Sophie', found: filled.includes('Sophie') },
    { placeholder: '[DATE]', value: '15/03/1990', found: filled.includes('15/03/1990') },
    { placeholder: '[VILLE, PAYS]', value: 'Paris, France', found: filled.includes('Paris, France') },
    { placeholder: '[HEURE PRÉCISE]', value: '14:30', found: filled.includes('14:30') },
  ];
  
  checks.forEach(check => {
    testResult(
      `Placeholder ${check.placeholder}`,
      check.found,
      check.found ? `Remplacé par "${check.value}"` : 'Non remplacé'
    );
  });
}

// Test 7: Recherche de consultations
function testSearchConsultations() {
  log('blue', '\n🔎 Test 7: Recherche de consultations');
  
  const keywords = ['solaire', 'carrière', 'couple', 'année'];
  
  keywords.forEach(keyword => {
    const results = PromptsManager.searchConsultationChoices(keyword);
    testResult(
      `Recherche "${keyword}"`,
      results.length > 0,
      `${results.length} résultat(s) trouvé(s)`
    );
  });
}

// Test 8: Récupération par catégorie
function testGetByCategory() {
  log('blue', '\n📂 Test 8: Récupération par catégorie');
  
  const categories = PromptsManager.getAllCategories();
  
  if (categories.length === 0) {
    testResult('Liste des catégories', false, 'Aucune catégorie trouvée');
    return;
  }
  
  testResult('Liste des catégories', true, `${categories.length} catégories`);
  
  categories.forEach(cat => {
    const choices = PromptsManager.getConsultationChoicesByCategory(cat);
    if (choices) {
      console.log(`   ${cat}: ${choices.length} consultation(s)`);
    }
  });
}

// Test 9: Utilisation complète
function testCompleteUsage() {
  log('blue', '\n🎭 Test 9: Utilisation complète');
  
  const userData = {
    prenom: 'Sophie',
    dateNaissance: '15/03/1990',
    heureNaissance: '14:30',
    ville: 'Paris',
    pays: 'France',
  };
  
  const result = PromptsManager.getCompletePromptForConsultation(
    'mon_signe_solaire',
    userData
  );
  
  if (result) {
    testResult('Utilisation complète', true);
    console.log(`   Titre: ${result.info.title}`);
    console.log(`   Type: ${result.info.type}`);
    console.log(`   Longueur du prompt: ${result.prompt.length} caractères`);
    console.log(`   Contient "Sophie": ${result.prompt.includes('Sophie')}`);
  } else {
    testResult('Utilisation complète', false);
  }
}

// Test 10: Validation de la cohérence
function testCoherence() {
  log('blue', '\n🔗 Test 10: Validation de la cohérence');
  
  const structure = PromptsManager['loadPromptsStructure']();
  let totalChoices = 0;
  let missingPrompts = 0;
  const missingList: string[] = [];
  
  for (const [categoryKey, category] of Object.entries(structure)) {
    const typedCategory = category as any;
    for (const choice of typedCategory.consultationChoices) {
      totalChoices++;
      const prompt = PromptsManager['findPromptByTitle'](choice.prompt);
      if (!prompt) {
        missingPrompts++;
        missingList.push(`${choice.id} (${choice.prompt})`);
      }
    }
  }
  
  testResult(
    'Cohérence structure <-> prompts',
    missingPrompts === 0,
    missingPrompts === 0
      ? `${totalChoices} consultations valides`
      : `${missingPrompts}/${totalChoices} prompts manquants`
  );
  
  if (missingPrompts > 0) {
    log('red', '\n   ⚠️  Prompts manquants:');
    missingList.forEach(item => console.log(`      - ${item}`));
  }
}

// Test 11: Statistiques
function testStatistics() {
  log('blue', '\n📈 Test 11: Statistiques globales');
  
  const structure = PromptsManager['loadPromptsStructure']();
  const categories = Object.keys(structure);
  
  let totalConsultations = 0;
  const statsByType: { [type: string]: number } = {};
  const statsByCategory: { [cat: string]: number } = {};
  
  for (const [categoryKey, category] of Object.entries(structure)) {
    const typedCategory = category as any;
    const count = typedCategory.consultationChoices.length;
    statsByCategory[categoryKey] = count;
    totalConsultations += count;
    
    typedCategory.consultationChoices.forEach((choice: any) => {
      statsByType[choice.type] = (statsByType[choice.type] || 0) + 1;
    });
  }
  
  log('magenta', '\n   📊 Statistiques:');
  console.log(`   Total des catégories: ${categories.length}`);
  console.log(`   Total des consultations: ${totalConsultations}`);
  
  log('magenta', '\n   Par catégorie:');
  for (const [cat, count] of Object.entries(statsByCategory)) {
    console.log(`      ${cat}: ${count}`);
  }
  
  log('magenta', '\n   Par type:');
  for (const [type, count] of Object.entries(statsByType)) {
    console.log(`      ${type}: ${count}`);
  }
}

// Fonction principale
function runAllTests() {
  log('magenta', '\n════════════════════════════════════════════════════');
  log('magenta', '   🧪 TEST DU SYSTÈME DE GESTION DES PROMPTS');
  log('magenta', '════════════════════════════════════════════════════');
  
  testLoadStructure();
  testLoadContent();
  testFindPromptByTitle();
  testGetPromptById();
  testGetConsultationInfo();
  testFillPlaceholders();
  testSearchConsultations();
  testGetByCategory();
  testCompleteUsage();
  testCoherence();
  testStatistics();
  
  log('magenta', '\n════════════════════════════════════════════════════');
  log('green', '   ✅ TESTS TERMINÉS');
  log('magenta', '════════════════════════════════════════════════════\n');
}

// Exécution
runAllTests();
