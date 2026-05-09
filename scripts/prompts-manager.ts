/**
 * UTILITAIRE DE GESTION DES PROMPTS PAR CHOIX DE CONSULTATION
 * 
 * Ce module fournit des fonctions pour récupérer le prompt approprié
 * en fonction du choix de consultation de l'utilisateur.
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
export interface ConsultationChoice {
  id: string;
  title: string;
  prompt: string;
  type: 'calcul' | 'analyse' | 'cycles' | 'synastrie' | 'previsionnel' | 'numerologie' | 'numerologie_cycle' | 'complete' | 'equipe';
  periode?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annuel' | 'mensuel' | 'quotidien';
}

export interface CategoryPrompts {
  title: string;
  description: string;
  consultationChoices: ConsultationChoice[];
}

export interface PromptsStructure {
  [categoryKey: string]: CategoryPrompts;
}

/**
 * Charge la structure des prompts depuis le fichier JSON
 */
export function loadPromptsStructure(): PromptsStructure {
  const structurePath = path.resolve(__dirname, 'prompts-structure.json');
  const structureData = fs.readFileSync(structurePath, 'utf-8');
  return JSON.parse(structureData) as PromptsStructure;
}

/**
 * Charge le contenu complet du fichier prompts.txt
 */
export function loadPromptsContent(): string {
  const promptsPath = path.resolve(__dirname, 'prompts.txt');
  return fs.readFileSync(promptsPath, 'utf-8');
}

/**
 * Recherche un prompt spécifique dans le fichier prompts.txt
 * @param promptTitle - Le titre du prompt à rechercher (ex: "MON SIGNE SOLAIRE")
 * @returns Le contenu complet du prompt ou null si non trouvé
 */
export function findPromptByTitle(promptTitle: string): string | null {
  const content = loadPromptsContent();
  
  // Recherche du début du prompt
  const regex = new RegExp(`LE PROMPT\\s*:\\s*${promptTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  const match = content.match(regex);
  
  if (!match) {
    return null;
  }
  
  const startIndex = match.index!;
  
  // Recherche de la fin du prompt (début du prompt suivant ou fin du fichier)
  const nextPromptRegex = /\n\n\nLE PROMPT\s*:/g;
  nextPromptRegex.lastIndex = startIndex + match[0].length;
  const nextMatch = nextPromptRegex.exec(content);
  
  const endIndex = nextMatch ? nextMatch.index : content.length;
  
  return content.substring(startIndex, endIndex).trim();
}

/**
 * Récupère le prompt correspondant à un ID de choix de consultation
 * @param consultationChoiceId - L'ID du choix de consultation (ex: "mon_signe_solaire")
 * @returns Le contenu complet du prompt ou null si non trouvé
 */
export function getPromptByConsultationId(consultationChoiceId: string): string | null {
  const structure = loadPromptsStructure();
  
  // Parcourir toutes les catégories
  for (const category of Object.values(structure)) {
    // Chercher dans les choix de consultation
    const choice = category.consultationChoices.find(
      (c) => c.id === consultationChoiceId
    );
    
    if (choice) {
      return findPromptByTitle(choice.prompt);
    }
  }
  
  return null;
}

/**
 * Récupère les informations d'un choix de consultation
 * @param consultationChoiceId - L'ID du choix de consultation
 * @returns Les informations du choix ou null si non trouvé
 */
export function getConsultationChoiceInfo(consultationChoiceId: string): ConsultationChoice | null {
  const structure = loadPromptsStructure();
  
  for (const category of Object.values(structure)) {
    const choice = category.consultationChoices.find(
      (c) => c.id === consultationChoiceId
    );
    
    if (choice) {
      return choice;
    }
  }
  
  return null;
}

/**
 * Récupère tous les choix de consultation d'une catégorie
 * @param categoryKey - La clé de la catégorie (ex: "MA_VIE_PERSONNELLE")
 * @returns Liste des choix de consultation ou null si catégorie non trouvée
 */
export function getConsultationChoicesByCategory(categoryKey: string): ConsultationChoice[] | null {
  const structure = loadPromptsStructure();
  const category = structure[categoryKey];
  
  return category ? category.consultationChoices : null;
}

/**
 * Liste toutes les catégories disponibles
 * @returns Tableau des clés de catégories
 */
export function getAllCategories(): string[] {
  const structure = loadPromptsStructure();
  return Object.keys(structure);
}

/**
 * Recherche des consultations par mot-clé
 * @param keyword - Mot-clé à rechercher dans les titres
 * @returns Liste des choix de consultation correspondants
 */
export function searchConsultationChoices(keyword: string): Array<ConsultationChoice & { category: string }> {
  const structure = loadPromptsStructure();
  const results: Array<ConsultationChoice & { category: string }> = [];
  const lowerKeyword = keyword.toLowerCase();
  
  for (const [categoryKey, category] of Object.entries(structure)) {
    for (const choice of category.consultationChoices) {
      if (
        choice.title.toLowerCase().includes(lowerKeyword) ||
        choice.prompt.toLowerCase().includes(lowerKeyword) ||
        choice.id.toLowerCase().includes(lowerKeyword)
      ) {
        results.push({ ...choice, category: categoryKey });
      }
    }
  }
  
  return results;
}

/**
 * Remplace les placeholders d'un prompt avec les données de l'utilisateur
 * @param promptContent - Le contenu du prompt
 * @param userData - Les données de l'utilisateur
 * @returns Le prompt avec les placeholders remplacés
 */
export function fillPromptPlaceholders(
  promptContent: string,
  userData: {
    prenom?: string;
    dateNaissance?: string;
    heureNaissance?: string;
    lieuNaissance?: string;
    ville?: string;
    pays?: string;
    jour?: string;
    mois?: string;
    annee?: string;
    [key: string]: any;
  }
): string {
  let filledPrompt = promptContent;
  
  // Remplacement des placeholders standards
  if (userData.prenom) {
    filledPrompt = filledPrompt.replace(/\[PRÉNOM( DE LA PERSONNE)?\]/g, userData.prenom);
  }
  if (userData.dateNaissance) {
    filledPrompt = filledPrompt.replace(/\[DATE( DE NAISSANCE)?\]/g, userData.dateNaissance);
  }
  if (userData.jour) {
    filledPrompt = filledPrompt.replace(/\[JOUR\]/g, userData.jour);
  }
  if (userData.mois) {
    filledPrompt = filledPrompt.replace(/\[MOIS\]/g, userData.mois);
  }
  if (userData.annee) {
    filledPrompt = filledPrompt.replace(/\[ANNÉE\]/g, userData.annee);
  }
  if (userData.heureNaissance) {
    filledPrompt = filledPrompt.replace(/\[HEURE PRÉCISE\]/g, userData.heureNaissance);
  }
  if (userData.ville && userData.pays) {
    filledPrompt = filledPrompt.replace(/\[VILLE, PAYS\]/g, `${userData.ville}, ${userData.pays}`);
  }
  if (userData.lieuNaissance) {
    filledPrompt = filledPrompt.replace(/\[LIEU\]/g, userData.lieuNaissance);
  }
  
  return filledPrompt;
}

/**
 * Exemple d'utilisation complète
 */
export function getCompletePromptForConsultation(
  consultationChoiceId: string,
  userData: any
): { prompt: string; info: ConsultationChoice } | null {
  const info = getConsultationChoiceInfo(consultationChoiceId);
  if (!info) {
    return null;
  }
  
  const promptContent = getPromptByConsultationId(consultationChoiceId);
  if (!promptContent) {
    return null;
  }
  
  const filledPrompt = fillPromptPlaceholders(promptContent, userData);
  
  return {
    prompt: filledPrompt,
    info,
  };
}

// Export par défaut pour usage simple
export default {
  getPromptByConsultationId,
  getConsultationChoiceInfo,
  getConsultationChoicesByCategory,
  getAllCategories,
  searchConsultationChoices,
  fillPromptPlaceholders,
  getCompletePromptForConsultation,
};
