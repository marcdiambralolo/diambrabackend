# 🌟 SYSTÈME DE GESTION DES PROMPTS PAR CONSULTATION

## 📋 Vue d'ensemble

Ce système organise et gère tous les prompts utilisés dans l'application Mon Étoile. Il permet de :
- ✅ **Mapper** chaque choix de consultation à son prompt correspondant
- ✅ **Récupérer** facilement un prompt par son ID
- ✅ **Remplir** automatiquement les placeholders avec les données utilisateur
- ✅ **Rechercher** des consultations par mot-clé
- ✅ **Maintenir** la cohérence entre la base de données et les prompts

## 📁 Structure des fichiers

```
scripts/
├── prompts.txt                    # Contenu complet de tous les prompts
├── prompts-structure.json         # Structure JSON de mapping
├── PROMPTS_REFERENCE.md          # Documentation de référence
├── prompts-manager.ts            # Utilitaire TypeScript
└── README_PROMPTS.md             # Ce fichier (guide d'utilisation)
```

## 🚀 Utilisation

### 1️⃣ Importer le module

```typescript
import PromptsManager from './scripts/prompts-manager';
```

### 2️⃣ Récupérer un prompt par ID de consultation

```typescript
const consultationId = 'mon_signe_solaire';
const promptContent = PromptsManager.getPromptByConsultationId(consultationId);

if (promptContent) {
  console.log('Prompt trouvé :', promptContent);
} else {
  console.error('Prompt introuvable pour cet ID');
}
```

### 3️⃣ Récupérer les informations d'une consultation

```typescript
const info = PromptsManager.getConsultationChoiceInfo('mon_signe_solaire');

console.log(info);
// {
//   id: 'mon_signe_solaire',
//   title: 'MON SIGNE SOLAIRE',
//   prompt: 'MON SIGNE SOLAIRE',
//   type: 'analyse'
// }
```

### 4️⃣ Remplir les placeholders automatiquement

```typescript
const prompt = PromptsManager.getPromptByConsultationId('mon_signe_solaire');
const userData = {
  prenom: 'Sophie',
  dateNaissance: '15/03/1990',
  heureNaissance: '14:30',
  ville: 'Paris',
  pays: 'France'
};

const filledPrompt = PromptsManager.fillPromptPlaceholders(prompt, userData);
// Le prompt avec tous les [PRÉNOM] remplacés par "Sophie", etc.
```

### 5️⃣ Utilisation complète (recommandée)

```typescript
const result = PromptsManager.getCompletePromptForConsultation(
  'mon_signe_solaire',
  {
    prenom: 'Sophie',
    dateNaissance: '15/03/1990',
    heureNaissance: '14:30',
    ville: 'Paris',
    pays: 'France'
  }
);

if (result) {
  
  // Utiliser le prompt avec votre API d'IA
  const response = await sendToAI(result.prompt);
}
```

### 6️⃣ Rechercher des consultations

```typescript
const results = PromptsManager.searchConsultationChoices('carrière');

results.forEach(choice => {
  console.log(`${choice.title} (${choice.category})`);
});
// Output:
// ORIENTATION DE CARRIÈRE (MONDE_PROFESSIONNEL)
```

### 7️⃣ Lister toutes les catégories

```typescript
const categories = PromptsManager.getAllCategories();

// [
//   'CARTE_DU_CIEL_ET_5_PORTES',
//   'MA_VIE_PERSONNELLE',
//   'FAMILLE_AMITIE_ET_COUPLE',
//   'MONDE_PROFESSIONNEL',
//   'NUMEROLOGIE_NOMBRES_PERSONNELS',
//   'NUMEROLOGIE_CYCLES_PERSONNELS'
// ]
```

### 8️⃣ Récupérer tous les choix d'une catégorie

```typescript
const choices = PromptsManager.getConsultationChoicesByCategory('MONDE_PROFESSIONNEL');

choices.forEach(choice => {
  console.log(`${choice.id}: ${choice.title}`);
});
// Output:
// talents_potentiel: TALENTS & POTENTIEL
// leadership_management: LEADERSHIP & MANAGEMENT
// orientation_carriere: ORIENTATION DE CARRIÈRE
// ...
```

## 🎯 Exemple d'intégration dans un service

```typescript
// consultations.service.ts

import PromptsManager from '../scripts/prompts-manager';
import { OpenAIService } from './openai.service';

export class ConsultationsService {
  constructor(private readonly openaiService: OpenAIService) {}

  async generateConsultationResult(
    consultationId: string,
    userData: any
  ): Promise<string> {
    // 1. Récupérer le prompt complet
    const result = PromptsManager.getCompletePromptForConsultation(
      consultationId,
      userData
    );

    if (!result) {
      throw new Error(`Consultation ${consultationId} introuvable`);
    }

    // 2. Vérifier le type de consultation
    console.log(`Type de consultation: ${result.info.type}`);

    // 3. Envoyer à l'API d'IA
    const aiResponse = await this.openaiService.generateResponse(result.prompt);

    return aiResponse;
  }
}
```

## 📊 Statistiques des prompts

| Catégorie | Nombre de consultations |
|-----------|-------------------------|
| **Carte du Ciel + 5 Portes** | 6 |
| **Ma Vie Personnelle** | 16 |
| **Famille, Amitié et Couple** | 8 |
| **Monde Professionnel** | 6 |
| **Horoscope** | 5 |
| **Numérologie - Nombres Personnels** | 3 |
| **Numérologie - Cycles Personnels** | 3 |
| **TOTAL** | **47 consultations** |

## 🔧 Maintenance

### Ajouter un nouveau prompt

1. **Ajouter le contenu dans `prompts.txt`**
   ```
   LE PROMPT : NOUVEAU PROMPT
   RÔLE : ...
   OBJECTIF : ...
   ```

2. **Ajouter la référence dans `prompts-structure.json`**
   ```json
   {
     "id": "nouveau_prompt",
     "title": "NOUVEAU PROMPT",
     "prompt": "NOUVEAU PROMPT",
     "type": "analyse"
   }
   ```

3. **Mettre à jour `PROMPTS_REFERENCE.md`**
   - Ajouter une ligne dans la table de la catégorie concernée

4. **Tester**
   ```typescript
   const prompt = PromptsManager.getPromptByConsultationId('nouveau_prompt');
   ```

### Modifier un prompt existant

1. **Modifier uniquement dans `prompts.txt`**
2. Pas besoin de toucher aux autres fichiers (sauf si changement de titre)
3. Tester avec l'ID existant

### Supprimer un prompt

1. Retirer l'entrée de `prompts-structure.json`
2. Mettre à jour `PROMPTS_REFERENCE.md`
3. (Optionnel) Retirer de `prompts.txt` ou le commenter

## ⚠️ Points d'attention

### Placeholders supportés

| Placeholder | Description | Exemple |
|-------------|-------------|---------|
| `[PRÉNOM]` ou `[PRÉNOM DE LA PERSONNE]` | Prénom de l'utilisateur | Sophie |
| `[DATE]` ou `[DATE DE NAISSANCE]` | Date complète | 15/03/1990 |
| `[JOUR]` | Jour de naissance | 15 |
| `[MOIS]` | Mois de naissance | 03 |
| `[ANNÉE]` | Année | 1990 |
| `[HEURE PRÉCISE]` | Heure de naissance | 14:30 |
| `[VILLE, PAYS]` | Lieu de naissance | Paris, France |
| `[LIEU]` | Lieu générique | Paris |

### Formats de données attendus

```typescript
interface UserData {
  prenom?: string;              // "Sophie"
  dateNaissance?: string;       // "15/03/1990"
  heureNaissance?: string;      // "14:30"
  ville?: string;               // "Paris"
  pays?: string;                // "France"
  lieuNaissance?: string;       // "Paris, France"
  jour?: string;                // "15"
  mois?: string;                // "03"
  annee?: string;               // "1990"
}
```

## 🧪 Tests

### Test basique

```typescript
// test-prompts.ts
import PromptsManager from './scripts/prompts-manager';

// Test 1: Récupération d'un prompt
const prompt = PromptsManager.getPromptByConsultationId('mon_signe_solaire');
console.assert(prompt !== null, '❌ Prompt introuvable');
console.log('✅ Test 1: Récupération OK');

// Test 2: Remplissage des placeholders
const filled = PromptsManager.fillPromptPlaceholders(prompt!, { prenom: 'Sophie' });
console.assert(filled.includes('Sophie'), '❌ Placeholder non remplacé');
console.log('✅ Test 2: Remplissage OK');

// Test 3: Recherche
const results = PromptsManager.searchConsultationChoices('solaire');
console.assert(results.length > 0, '❌ Recherche échouée');
console.log('✅ Test 3: Recherche OK');
```

### Lancer les tests

```bash
ts-node scripts/test-prompts.ts
```

## 📚 Documentation complète

- **Structure JSON** : [prompts-structure.json](./prompts-structure.json)
- **Référence complète** : [PROMPTS_REFERENCE.md](./PROMPTS_REFERENCE.md)
- **Contenu des prompts** : [prompts.txt](./prompts.txt)

## 🤝 Contribution

Lors de l'ajout d'un nouveau prompt :
1. ✅ Respecter le format existant dans `prompts.txt`
2. ✅ Utiliser des IDs en snake_case
3. ✅ Documenter dans `PROMPTS_REFERENCE.md`
4. ✅ Tester avec `PromptsManager`
5. ✅ Mettre à jour les statistiques

## 📞 Support

En cas de problème :
1. Vérifier que l'ID correspond exactement à celui dans `prompts-structure.json`
2. Vérifier que le titre du prompt dans `prompts.txt` est exact
3. Consulter la documentation de référence
4. Tester avec les fonctions de recherche

---

**Dernière mise à jour** : 16 janvier 2026  
**Version** : 1.0.0
