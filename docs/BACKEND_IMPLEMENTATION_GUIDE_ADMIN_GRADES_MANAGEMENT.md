describe('GradeConfigService', () => {
# Backend Implementation Guide - Admin Grades Management

## But et public

Ce document explique toute la gestion des grades côté backend afin d'aider l'intégration frontend. Il décrit les endpoints, les payloads, les règles métier, et les contraintes de sécurité.

## Vue d'ensemble (fonctionnel)

- Il existe **9 grades** fixes avec des prérequis **immuables** (consultations, rituels, livres).
- L'admin peut **uniquement** modifier :
  - Les **choix de consultations** associés à chaque grade.
- La hiérarchie est **acyclique** : pas de boucle, pas de pointeur vers soi, le niveau suivant doit être supérieur.
- Les **choix de consultations disponibles** proviennent de **toutes les rubriques** du projet.

## Modèle de données (référence conceptuelle)

### GradeConfig

```ts
interface GradeConfig {
  _id: string;
  grade: 'ASPIRANT' | 'CONTEMPLATEUR' | 'CONSCIENT' | 'INTEGRATEUR' | 'TRANSMUTANT' | 'ALIGNE' | 'EVEILLE' | 'SAGE' | 'MAITRE_DE_SOI';
  level: number; // 1..9
  name: string;
  requirements: {
    consultations: number;
    rituels: number;
    livres: number;
  };
  consultationChoices: Array<{
    choiceId: string;        // id du choix (issu d'une rubrique)
    title: string;
    description: string;
    frequence: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE';
    participants: 'SOLO' | 'AVEC_TIERS' | 'POUR_TIERS' | 'GROUPE';
    order: number;
    isActive: boolean;
  }>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Points importants pour le frontend

- Le backend **renvoie** les `consultationChoices` complets dans chaque grade.
- Pour **modifier** les choix d'un grade, le frontend envoie uniquement la liste de `consultationChoiceIds`.
- Les `consultationChoiceIds` doivent correspondre aux **choix réels** existants dans les rubriques.

## Sécurité et autorisations

- Authentification JWT obligatoire.
- Accès réservé aux utilisateurs avec `role = ADMIN` ou `role = SUPER_ADMIN`.

## Endpoints API

### 1) Lister tous les grades

**GET** `/admin/grades`

**Réponse (200):**
```json
[
  {
    "_id": "64abc123...",
    "grade": "ASPIRANT",
    "level": 1,
    "name": "Aspirant",
    "requirements": {
      "consultations": 3,
      "rituels": 1,
      "livres": 1
    },
    "consultationChoices": [],
    "description": "Premier grade du chemin initiatique",
    "createdAt": "2025-01-18T10:00:00Z",
    "updatedAt": "2025-01-18T10:00:00Z"
  }
]
```

### 2) Détail d'un grade

**GET** `/admin/grades/:id`

**Réponse (200):**
```json
{
  "_id": "64abc123...",
  "grade": "ASPIRANT",
  "level": 1,
  "name": "Aspirant",
  "requirements": {
    "consultations": 3,
    "rituels": 1,
    "livres": 1
  },
  "consultationChoices": [],
  "description": "Premier grade du chemin initiatique",
  "createdAt": "2025-01-18T10:00:00Z",
  "updatedAt": "2025-01-18T10:00:00Z"
}
```

### 3) Lister tous les choix de consultations disponibles

**GET** `/admin/consultation-choices`

**Notes:**

- Retourne **tous les choix** de **toutes les rubriques**.
- Chaque choix contient les infos utiles et la rubrique associée.

**Réponse (200):**
```json
[
  {
    "_id": "choice123",
    "choiceId": "choice123",
    "title": "Carte du Ciel Natale",
    "description": "Analyse complète de votre thème astral",
    "frequence": "UNE_FOIS_VIE",
    "participants": "SOLO",
    "rubriqueId": "rubrique123",
    "rubriqueTitle": "Astrologie"
  }
]
```

### 4) Mettre a jour un grade (choix + nextGrade + description)

**PATCH** `/admin/grades/:id`

**Payload:**
```json
{
  "consultationChoiceIds": ["choice123", "choice456"],
  "description": "Description mise a jour"
}
```

**Réponse (200):**
```json
{
  "_id": "64abc123...",
  "grade": "ASPIRANT",
  "consultationChoices": [...],
  "updatedAt": "2025-01-18T12:00:00Z"
}
```

**Règles métier:**

- Impossible de créer une boucle ou un pointeur vers soi.
- Les IDs inconnus dans `consultationChoiceIds` sont ignorés.

### 5) Mettre a jour uniquement le grade suivant

**PATCH** `/admin/grades/:id/next-grade`

**Payload:**
```json
{
}
```

**Pour retirer le suivant:**
```json
{
}
```

### 6) Reordonner les choix d'un grade

**PUT** `/admin/grades/:id/reorder-choices`

**Payload:**
```json
{
  "choices": [
    { "choiceId": "choice123", "order": 1 },
    { "choiceId": "choice456", "order": 2 }
  ]
}
```

**Réponse (200):**
```json
{
  "_id": "64abc123...",
  "consultationChoices": [...]
}
```

## Integration frontend (flux recommande)

1) Charger les grades : `GET /admin/grades`
2) Charger tous les choix disponibles : `GET /admin/consultation-choices`
3) Sur la page `/admin/grades` :
   - Lister les grades par `level`.
   - Pour chaque grade, afficher ses `consultationChoices`.
   - Offrir un select/multiselect base sur la liste complete des choix.
4) Lors d'une sauvegarde :
   - Envoyer les IDs des choix selectionnes via `PATCH /admin/grades/:id`.
5) Lors d'un drag and drop de l'ordre :
   - Envoyer la nouvelle liste d'ordre via `PUT /admin/grades/:id/reorder-choices`.

## Erreurs frequentes (cote frontend)

- 401/403 : Token absent ou utilisateur non admin.
- 404 : Grade inexistant.

## Initialisation des grades (info backend)

- Les 9 grades sont crees automatiquement au demarrage si absents.
- Script manuel disponible : `npm run seed:grades`.

## Notes importantes

- Les pre requis (consultations, rituels, livres) sont immuables.
- Les choix de consultations proviennent de **toutes les rubriques**.

## Support

Pour toute question technique, contacter l'equipe backend Mon Etoile.
