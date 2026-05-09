# Guide d'Implémentation - Gestion des Grades

## Vue d'ensemble

Ce guide complet décrit l'implémentation backend pour la gestion des grades initiatiqu via l'interface admin `/admin/grades`.

## Architecture

### Structure des fichiers

```
src/grades/
├── schemas/
│   └── grade-config.schema.ts       # Schéma MongoDB
├── dto/
│   ├── update-grade-config.dto.ts
│   ├── reorder-grade-choices.dto.ts
│   └── update-next-grade.dto.ts
├── grade-config.service.ts          # Logique métier
├── grade-config.controller.ts       # Endpoints API
├── grade-initializer.service.ts     # Service d'initialisation
└── grades.module.ts                 # Module NestJS
```

## Installation et Initialisation

### Option 1: Initialisation Automatique (Recommandée)

Les grades sont initialisés automatiquement au démarrage de l'application grâce au service `GradeInitializerService`. Cela garantit que les 9 grades existent toujours en base de données.

```bash
npm start
# Les grades seront créés automatiquement lors du démarrage
```

### Option 2: Script de Seed Manuel

Pour un contrôle plus granulaire ou pour réinitialiser les données :

```bash
# Initialiser les grades
MONGODB_URI=mongodb://... npm run seed:grades

# Réinitialiser (supprimer puis créer)
SEED_RESET=true MONGODB_URI=mongodb://... npm run seed:grades
```

## Modèle de Données

### GradeConfig

Chaque grade a la structure suivante :

```json
{
  "_id": "ObjectId",
  "grade": "ASPIRANT",
  "level": 1,
  "name": "Aspirant",
  "requirements": {
    "consultations": 3,
    "rituels": 1,
    "livres": 1
  },
  "consultationChoices": [
    {
      "choiceId": "choice_id",
      "title": "Consultation initiatique",
      "description": "...",
      "frequence": "UNE_FOIS_VIE",
      "participants": "SOLO",
      "order": 1,
      "isActive": true
    }
  ],
  "nextGradeId": "ObjectId|null",
  "description": "Premier grade du chemin initiatique",
  "createdAt": "2025-01-18T10:00:00Z",
  "updatedAt": "2025-01-18T10:00:00Z"
}
```

### Énumérations

#### Frequence (Fréquence de consultation)
- `UNE_FOIS_VIE` - Une seule fois dans la vie
- `ANNUELLE` - Annuellement
- `MENSUELLE` - Mensuellement
- `QUOTIDIENNE` - Quotidiennement
- `LIBRE` - À la convenance de l'utilisateur

#### Participants (Mode de participation)
- `SOLO` - En solitaire
- `AVEC_TIERS` - Accompagné d'une tiers personne
- `POUR_TIERS` - Pour une autre personne
- `GROUPE` - En groupe

## API Endpoints

### 1. GET `/admin/grades`

Récupère tous les grades configurés, triés par niveau.

**Authentification:** ✅ Requise (Admin uniquement)

**Response:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/grades
```

```json
[
  {
    "_id": "64abc123...",
    "grade": "ASPIRANT",
    "level": 1,
    "name": "Aspirant",
    "requirements": { "consultations": 3, "rituels": 1, "livres": 1 },
    "consultationChoices": [],
    "nextGradeId": "64abc456...",
    "description": "Premier grade du chemin initiatique"
  }
]
```

---

### 2. GET `/admin/grades/:id`

Récupère un grade spécifique par son ID.

**Parametres:**
- `id` (string, required): MongoDB ID du grade

**Response:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/grades/64abc123
```

```json
{
  "_id": "64abc123...",
  "grade": "ASPIRANT",
  "level": 1,
  "name": "Aspirant",
  ...
}
```

---

### 3. GET `/admin/consultation-choices`

Récupère tous les choix de consultations disponibles pour associer aux grades.

⚠️ **Note:** Cette route retourne les choix de TOUTES les rubriques actives.

**Response:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/consultation-choices
```

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
  },
  {
    "_id": "choice456",
    "choiceId": "choice456",
    "title": "Méditation Guidée",
    "description": "Séance de méditation profonde",
    "frequence": "LIBRE",
    "participants": "GROUPE",
    "rubriqueId": "rubrique456",
    "rubriqueTitle": "Méditation"
  }
]
```

---

### 4. PATCH `/admin/grades/:id`

Met à jour la configuration d'un grade (choix de consultations, grade suivant, description).

**Request Body:**
```json
{
  "consultationChoiceIds": ["choice123", "choice456"],
  "nextGradeId": "64abc789",
  "description": "Description mise à jour"
}
```

**Exemple:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "consultationChoiceIds": ["choice123"],
    "description": "Grade initiatique fondamental"
  }' \
  http://localhost:3000/admin/grades/64abc123
```

**Response:** (200 OK)
```json
{
  "_id": "64abc123...",
  "grade": "ASPIRANT",
  "consultationChoices": [
    {
      "choiceId": "choice123",
      "title": "Consultation initiatique",
      ...
    }
  ],
  "nextGradeId": "64abc789...",
  "description": "Grade initiatique fondamental",
  "updatedAt": "2025-01-18T12:00:00Z"
}
```

**Erreurs:**
- `400` - Grade suivant invalide ou niveau inférieur ou égal
- `404` - Grade non trouvé

---

### 5. PATCH `/admin/grades/:id/next-grade`

Met à jour uniquement le grade suivant.

**Request Body:**
```json
{
  "nextGradeId": "64abc789"
}
```

pour supprimer le grade suivant:
```json
{
  "nextGradeId": null
}
```

**Exemple:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nextGradeId": "64abc789"}' \
  http://localhost:3000/admin/grades/64abc123/next-grade
```

**Response:** (200 OK)
```json
{
  "_id": "64abc123...",
  "grade": "ASPIRANT",
  "nextGradeId": "64abc789...",
  "updatedAt": "2025-01-18T12:00:00Z"
}
```

**Validations:**
- Le grade suivant doit avoir un niveau **strictement supérieur**
- Le système détecte et rejette les **cycles** (ex: A→B→A)
- Un grade ne peut pas pointer vers lui-même

---

### 6. PUT `/admin/grades/:id/reorder-choices`

Réordonne les choix de consultations pour un grade.

**Request Body:**
```json
{
  "choices": [
    { "choiceId": "choice123", "order": 2 },
    { "choiceId": "choice456", "order": 1 }
  ]
}
```

**Exemple:**
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "choices": [
      {"choiceId": "choice456", "order": 1},
      {"choiceId": "choice123", "order": 2}
    ]
  }' \
  http://localhost:3000/admin/grades/64abc123/reorder-choices
```

**Response:** (200 OK)
```json
{
  "_id": "64abc123...",
  "grade": "ASPIRANT",
  "consultationChoices": [
    { "choiceId": "choice456", "order": 1, ... },
    { "choiceId": "choice123", "order": 2, ... }
  ]
}
```

---

## Les 9 Grades

| Niveau | Grade | Consultations | Rituels | Livres | Description |
|--------|-------|---------------|---------|--------|-------------|
| 1 | ASPIRANT | 3 | 1 | 1 | Premier pas sur le chemin initiatique |
| 2 | CONTEMPLATEUR | 6 | 2 | 1 | Approfondissement de la conscience |
| 3 | CONSCIENT | 9 | 3 | 2 | Accès à une conscience plus large |
| 4 | INTEGRATEUR | 13 | 4 | 2 | Intégration des enseignements |
| 5 | TRANSMUTANT | 18 | 6 | 3 | Transmutation intérieure |
| 6 | ALIGNE | 23 | 8 | 4 | Alignement spirituel |
| 7 | EVEILLE | 28 | 10 | 5 | Éveil progressif |
| 8 | SAGE | 34 | 10 | 6 | Sagesse acquise |
| 9 | MAITRE_DE_SOI | 40 | 10 | 8 | Maîtrise et transcendance |

**Notes Importantes:**
- Les **prérequis** (consultations, rituels, livres) sont **immuables**
- Ils sont définis dans le code et ne peuvent pas être modifiés par l'admin
- Seuls les **choix de consultations** et le **grade suivant** sont modifiables
- La progression est **strictement hiérarchique** (pas de sauts)

## Sécurité

### Authentification
Tous les endpoints requièrent un **token JWT valide** dans le header `Authorization`.

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Autorisation
Seuls les utilisateurs avec le rôle **`ADMIN`** peuvent accéder aux endpoints `/admin/grades`.

Le système vérifie:
```typescript
if (!user.roles?.includes('ADMIN') && !user.roles?.includes('admin')) {
  throw new UnauthorizedException();
}
```

### Validation des Données
Tous les inputs sont validés avec `class-validator`:
- Les IDs doivent être des ObjectIds MongoDB valides
- Les énumérations doivent correspondre aux valeurs autorisées
- Les références aux grades doivent exister en base

### Protection contre les Cycles
Le système prévient les boucles infinies:
```typescript
// ❌ Invalide: ASPIRANT → ASPIRANT
// ❌ Invalide: A → B → C → A (cycle)
// ✅ Valide: A → B → C → null
```

## Intégration avec les Services Utilisateur

### Utilisation dans le système de Progression

Le service des grades pourrait être intégré pour:

```typescript
// Exemple: Déterminer le grade suivant d'un utilisateur
async getUserProgress(userId: string) {
  const user = await userService.findById(userId);
  const currentGrade = await gradeConfigService.getGradeConfigById(user.gradeId);
  
  // Vérifier si l'utilisateur a atteint les prérequis
  const consultationCount = await consultationService.countByUser(userId);
  const rituelCount = await rituelService.countByUser(userId);
  const bookCount = await bookService.countByUser(userId);
  
  const canProgress = 
    consultationCount >= currentGrade.requirements.consultations &&
    rituelCount >= currentGrade.requirements.rituels &&
    bookCount >= currentGrade.requirements.livres;
  
  return {
    currentGrade: currentGrade.grade,
    nextGrade: currentGrade.nextGradeId,
    canProgress,
    progress: {
      consultations: consultationCount / currentGrade.requirements.consultations,
      rituels: rituelCount / currentGrade.requirements.rituels,
      books: bookCount / currentGrade.requirements.livres
    }
  };
}
```

## Tests

### Test d'Initialisation

```typescript
describe('GradeInitializerService', () => {
  it('should initialize all 9 grades', async () => {
    const result = await service.onModuleInit();
    const grades = await gradeConfigService.getAllGradeConfigs(adminUser);
    
    expect(grades).toHaveLength(9);
    expect(grades[0].grade).toBe('ASPIRANT');
    expect(grades[8].grade).toBe('MAITRE_DE_SOI');
  });
});
```

### Test de Validation

```typescript
describe('GradeConfigService - Validation', () => {
  it('should reject cycle detection', async () => {
    await expect(
      service.updateNextGrade(grade1Id, grade1Id, adminUser)
    ).rejects.toThrow('Le grade ne peut pas pointer vers lui-même');
  });

  it('should require level progression', async () => {
    await expect(
      service.updateNextGrade(grade3Id, grade1Id, adminUser)
    ).rejects.toThrow('Le grade suivant doit être de niveau supérieur');
  });

  it('should validate consultation choice existence', async () => {
    await expect(
      service.updateGradeConfig(gradeId, {
        consultationChoiceIds: ['invalid-id']
      }, adminUser)
    ).not.toThrow(); // Silently ignores invalid IDs
  });
});
```

## Troubleshooting

### Grades non créés au démarrage

**Symptôme:** `/admin/grades` retourne un tableau vide

**Solution:**
1. Vérifier la connexion MongoDB: `MONGODB_URI` doit être configuré
2. Lancer le script de seed manuellement:
   ```bash
   MONGODB_URI=mongodb://... npm run seed:grades
   ```


## Maintenance

### Backup

```bash
# Exporter les grades
mongoexport --uri="mongodb://..." --collection=gradeconfigs --out=grades-backup.json

# Restaurer
mongoimport --uri="mongodb://..." --collection=gradeconfigs --file=grades-backup.json
```

### Monitoring

Ajouter des logs pour suivre:
- Temps d'initialisation des grades
- Erreurs de validation de hiérarchie
- Accès des admins aux endpoints

---

## Support

Pour toute question technique, consulter:
- Documentation NestJS: https://docs.nestjs.com
- Documentation MongoDB: https://docs.mongodb.com
- Code du projet: `src/grades/`

