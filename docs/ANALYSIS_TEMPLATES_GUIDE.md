# Analysis Templates System - Guide d'Intégration

## Vue d'ensemble

Ce système permet de créer des templates d'analyses astrologiques paramétrables et de générer des analyses personnalisées basées sur les données du thème natal de l'utilisateur.

## Architecture

### 1. Templates d'Analyses (`AnalysisTemplate`)
Les templates contiennent :
- Un **prompt de base** avec les instructions complètes
- Une **catégorie** (ex: "énergie sexuelle", "compatibilité", "évolution")
- Des **tags** pour le filtrage
- Des **métadonnées** (temps estimé, niveau de difficulté, champs requis)
- Un **compteur d'utilisation** pour suivre la popularité

### 2. Analyses Générées (`GeneratedAnalysis`)
Sauvegarde :
- Le contenu généré par l'IA
- Les données astrologiques utilisées
- Le prompt complet envoyé à l'IA
- Un rating et feedback utilisateur
- Possibilité de marquer comme favori/public

## Flux de Utilisation

### Créer un Template

```
POST /analysis-templates
{
  "title": "Analyse de l'Énergie Sexuelle",
  "description": "Analyse complète de l'énergie sexuelle...",
  "category": "astrologie-personnelle",
  "tags": ["sexualité", "mars", "venus", "pluton"],
  "prompt": "ANALYSE ASTROLOGIQUE DE L'ÉNERGIE SEXUELLE\nAgis comme un astrologue...",
  "metadata": {
    "requiredFields": ["birthDate", "birthTime", "birthPlace"],
    "estimatedReadTime": 15,
    "difficulty": "advanced"
  }
}
```

### Générer une Analyse

```
POST /analysis-templates/:templateId/generate
{
  "astrologicalData": {
    "birthDate": "1990-05-15",
    "birthTime": "14:30",
    "birthPlace": "Paris, France",
    "planets": {
      "sun": { "sign": "Taurus", "house": 3, ... },
      "mars": { "sign": "Scorpio", "house": 8, ... },
      "venus": { "sign": "Cancer", "house": 5, ... },
      ...
    },
    "houses": { ... },
    "aspects": { ... },
    "asteroids": {
      "lilith": { ... },
      "eros": { ... },
      ...
    }
  },
  "userName": "Sophie",
  "customPromptAddition": "(optionnel) Instructions supplémentaires..."
}
```

### Récupérer les Analyses Générées

```
GET /analysis-templates/generated/my
GET /analysis-templates/generated/my?templateId={id}&limit=10
GET /analysis-templates/generated/{analysisId}
```

## Données Astrologiques à Intégrer

Pour chaque analyse, intégrez les données astrologiques suivantes :

```json
{
  "birthDate": "YYYY-MM-DD",
  "birthTime": "HH:MM",
  "birthPlace": "City, Country",
  "planets": {
    "sun": { "sign": "", "degree": 0, "house": 1, "retrograde": false },
    "moon": { ... },
    "mercury": { ... },
    "venus": { ... },
    "mars": { ... },
    "jupiter": { ... },
    "saturn": { ... },
    "uranus": { ... },
    "neptune": { ... },
    "pluto": { ... }
  },
  "houses": {
    "h1": { "sign": "", "degree": 0 },
    "h2": { ... },
    ...
    "h12": { ... }
  },
  "aspects": [
    { "planet1": "mars", "planet2": "venus", "aspect": "trine", "orb": 2.5 },
    ...
  ],
  "asteroids": {
    "lilith": { "sign": "", "house": 8 },
    "eros": { ... },
    "psyche": { ... },
    "amor": { ... },
    "cupido": { ... },
    "pholus": { ... }
  }
}
```

## Prompts Disponibles et À Créer

### Catégories Recommandées

1. **Astrologie Personnelle**
   - Énergie sexuelle
   - Chemin de vie
   - Karmas et leçons
   - Talents naturels
   - Ombres et peurs

2. **Relations et Compatibilité**
   - Synastrie avec partenaire
   - Compatibilité amoureuse
   - Dynamique relationnelle
   - Attirances inconscientes

3. **Évolution et Transformation**
   - Transits actuels
   - Progressions
   - Évolution spirituelle
   - Cycles de vie

4. **Bien-être et Santé**
   - Psychologie astrologique
   - Hygiène de vie selon le thème
   - Gestion des énergies

## Points Clés d'Intégration

### 1. Injection des Données Astrologiques

Le système formate automatiquement les données astrologiques dans le prompt :

```typescript
private formatAstrologicalData(data: any, userName?: string): string {
  // Formate les données en texte lisible pour l'IA
  // Inclut les planètes, maisons, aspects, astéroïdes
}
```

### 2. Flexible Prompt Enhancement

Vous pouvez ajouter des instructions personnalisées :

```typescript
if (dto.customPromptAddition) {
  fullPrompt += `\n\n${dto.customPromptAddition}`;
}
```

### 3. Sauvegarde du Contexte

Chaque analyse générée sauvegarde :
- Le prompt complet envoyé à l'IA
- Les données astrologiques utilisées
- Le modèle d'IA utilisé
- Le temps de génération
- La date de création

## Utilisation Recommandée

### Dans le Frontend

```typescript
// 1. Récupérer les templates disponibles
const templates = await fetch('/analysis-templates');

// 2. Afficher le template sélectionné
// 3. Collecter les données astrologiques de l'utilisateur
// 4. Déclencher la génération
const analysis = await fetch('/analysis-templates/{templateId}/generate', {
  method: 'POST',
  body: JSON.stringify({
    astrologicalData: userAstroData,
    userName: user.name
  })
});

// 5. Afficher l'analyse générée
// 6. Permettre le rating et la sauvegarde
```

## Prochaines Étapes

1. ✅ Créer les schemas et services
2. ✅ Créer les contrôleurs et DTOs
3. ⏳ Intégrer avec DeepseekService
4. ⏳ Créer des templates de base
5. ⏳ Tester la génération complète
6. ⏳ Ajouter la gestion du cache pour les analyses similaires
7. ⏳ Ajouter la possibilité de régénérer avec des paramètres différents

## Limitation Actuellement

- Chaque génération appelle l'API DeepSeek (à coût)
- Pas de cache des analyses similaires
- À considérer : implémenter un rate limiting

## Extension Future

- Ajouter des templates communautaires
- Permettre aux utilisateurs de créer leurs propres templates
- Historique et versioning des analyses
- Comparaison entre analyses
- Export PDF des analyses
