# Guide du Système de Consultations

## Vue d'ensemble

Le système de consultations est au cœur de l'application Cosmique. Il gère l'ensemble du cycle de vie des consultations astrologiques, de la création à l'analyse, en passant par les choix de l'utilisateur et les notifications.

## Architecture du Module

### Structure des fichiers

```
src/consultations/
├── consultations.module.ts          # Module principal
├── consultations.controller.ts      # Routes API principales
├── consultations.service.ts         # Logique métier des consultations
├── analysis.service.ts              # Génération des analyses astrologiques
├── deepseek.service.ts              # Intégration avec l'API DeepSeek (IA)
├── consultation-choice.service.ts   # Gestion des choix de consultation
├── user-consultation-choice.service.ts  # Choix utilisateur
├── consultation-choice-status.service.ts # Statuts des choix
├── prompt.service.ts                # Gestion des prompts IA
├── schemas/
│   ├── consultation.schema.ts       # Schéma principal
│   ├── consultation-choice.schema.ts
│   ├── user-consultation-choice.schema.ts
│   ├── astrological-analysis.schema.ts
│   └── prompt.schema.ts
└── dto/
    ├── create-consultation.dto.ts
    ├── update-consultation.dto.ts
    ├── save-analysis.dto.ts
    └── ...
```

## Modèle de Données

### Consultation (Schema Principal)

Une consultation représente une demande d'analyse astrologique faite par un utilisateur.

**Propriétés principales :**

```typescript
{
  clientId: ObjectId,              // Référence vers l'utilisateur
  type: ConsultationType,          // Type de consultation (voir types)
  title: string,                   // Titre de la consultation
  description: string,             // Description détaillée
  status: ConsultationStatus,      // Statut actuel
  formData: Object,                // Données du formulaire
  tierce: Object | null,           // Données pour consultation tierce
  alternatives: OfferingAlternative[], // Options d'offrandes
  requiredOffering: RequiredOffering,  // Offrande obligatoire
  choice: ConsultationChoice,      // Choix de l'utilisateur
  analysisNotified: boolean,       // Notification envoyée
  createdAt: Date,
  updatedAt: Date
}
```

### Types de Consultations

```typescript
enum ConsultationType {
  NUMEROLOGIE = 'NUMEROLOGIE',
  CYCLES_PERSONNELS = 'CYCLES_PERSONNELS',
  NOMBRES_PERSONNELS = 'NOMBRES_PERSONNELS',
  // ... autres types
}
```

### Statuts de Consultation

```typescript
enum ConsultationStatus {
  PENDING = 'pending',           // En attente
  IN_PROGRESS = 'in-progress',   // En cours de traitement
  COMPLETED = 'completed',       // Terminée
  CANCELLED = 'cancelled',       // Annulée
  PAYMENT_REQUIRED = 'payment-required' // Paiement requis
}
```

### Offrandes (Offerings)

Les consultations peuvent nécessiter des offrandes avec plusieurs alternatives :

```typescript
interface OfferingAlternative {
  offeringId: string,     // ID de l'offrande
  quantity: number,       // Quantité requise
  name?: string,          // Nom enrichi
  price?: number,         // Prix
  category?: string,      // Catégorie (animal, vegetal, boisson)
  icon?: string,          // Icône
  description?: string    // Description
}

interface RequiredOffering {
  type: 'animal' | 'vegetal' | 'boisson',
  alternatives: OfferingAlternative[],
  selectedAlternative: string  // Alternative choisie par l'utilisateur
}
```

### Choix de Consultation

```typescript
interface ConsultationChoice {
  title: string,          // Titre du choix
  description: string,    // Description
  frequence: string,      // UNE_FOIS_VIE, ANNUELLE, MENSUELLE, QUOTIDIENNE, LIBRE
  participants: string,   // SOLO, AVEC_TIERS, GROUPE, POUR_TIERS
  offering: {
    alternatives: OfferingAlternative[]
  },
  promptId?: ObjectId     // Référence vers le prompt IA
  pdfFile?: string        // Chemin du fichier PDF associé (optionnel)
}
```

## Flux de Fonctionnement

### 1. Création d'une Consultation

**Endpoint:** `POST /consultations`

**Processus:**
1. L'utilisateur soumet un formulaire avec ses données de naissance
2. Le système crée une consultation avec status `PENDING`
3. Les compteurs de l'utilisateur sont incrémentés (`totalConsultations`, `consultationsCount`)
4. La consultation est retournée avec toutes les références populées

```typescript
// Exemple de payload
{
  "type": "NUMEROLOGIE",
  "title": "Ma consultation numérologie",
  "description": "Analyse complète",
  "formData": {
    "nom": "Dupont",
    "prenoms": "Jean",
    "dateNaissance": "1990-05-15",
    "heureNaissance": "14:30",
    "villeNaissance": "Paris",
    "paysNaissance": "France",
    "genre": "M"
  }
}
```

### 2. Consultation Personnelle

**Endpoint:** `POST /consultations/personal`

Pour les consultations sans compte utilisateur, incluant possiblement des données pour une tierce personne.

### 3. Génération de l'Analyse

**Endpoint:** `POST /consultations/:id/analysis`

**Processus:**
1. Récupération de la consultation et validation des données
2. Détermination du type d'analyse (numérologie,   etc.)
3. Appel au service DeepSeek pour génération IA
4. Création d'une `AstrologicalAnalysis` avec:
   - Carte du ciel (positions planétaires)
   - Mission de vie
   - Analyses personnalisées
5. Mise à jour du statut de la consultation

**Analyse Astrologique (Schema):**

```typescript
{
  consultationId: ObjectId,
  sessionId: string,           // ID unique de session
  carteDuCiel: {
    sujet: {
      nom: string,
      prenoms: string,
      dateNaissance: string,
      lieuNaissance: string,
      heureNaissance: string
    },
    positions: [{
      planete: string,
      signe: string,
      maison: number,
      retrograde: boolean,
      degre: number
    }],
    aspectsTexte: string
  },
  missionDeVie: {
    titre: string,
    contenu: string
  },
  metadata: {
    processingTime: number,
    tokensUsed: number,
    model: string
  },
  createdAt: Date
}
```

### 4. Enrichissement des Alternatives

Le système enrichit automatiquement les alternatives d'offrandes avec les données complètes :

```typescript
// Alternative basique stockée
{ offeringId: "123", quantity: 1 }

// Alternative enrichie retournée
{
  offeringId: "123",
  quantity: 1,
  name: "Poulet rouge",
  price: 5000,
  priceUSD: 8,
  category: "animal",
  icon: "🐓",
  description: "Poulet de sacrifice traditionnel"
}
```

### 5. Notifications

**Endpoint:** `POST /consultations/:id/notify-user`

Envoie une notification à l'utilisateur lorsque son analyse est prête :
- Crée une notification de type `CONSULTATION_RESULT`
- Marque la consultation avec `analysisNotified: true`

## Services Clés

### ConsultationsService

Gère toutes les opérations CRUD et la logique métier des consultations.

**Méthodes principales:**
- `create(clientId, dto)` - Créer une consultation
- `findAll(query)` - Lister avec pagination et filtres
- `findOne(id)` - Récupérer une consultation
- `update(id, dto)` - Mettre à jour
- `delete(id)` - Supprimer
- `populateAlternatives(alternatives)` - Enrichir les offrandes

### AnalysisService

Génère les analyses astrologiques en utilisant l'IA.

**Méthodes principales:**
- `generateAnalysis(consultationId, user)` - Générer une analyse complète
- `getAstrologicalAnalysis(consultationId)` - Récupérer une analyse existante

**Types d'analyses supportés:**
- Numérologie 
- Cycles personnels
- Nombres personnels

### DeepseekService

Interface avec l'API DeepSeek (modèle d'IA) pour générer les contenus astrologiques.

**Caractéristiques:**
- Gestion du streaming de réponses
- Suivi de progression en temps réel
- Cache des résultats
- Gestion des erreurs et retry
- Support multi-langues

### UserConsultationChoiceService

Gère les choix de consultation faits par les utilisateurs.

```typescript
{
  userId: ObjectId,
  consultationId: ObjectId,
  choiceId: ObjectId,
  choiceTitle: string,
  frequence: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE',
  participants: 'SOLO' | 'AVEC_TIERS' | 'GROUPE' | 'POUR_TIERS'
}
```

## API Endpoints

### Consultations de Base

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/consultations` | Créer une consultation | ✅ |
| POST | `/consultations/personal` | Consultation sans compte | ❌ |
| GET | `/consultations` | Lister toutes | ❌ |
| GET | `/consultations/:id` | Récupérer une | ❌ |
| GET | `/consultations/user/:userId` | Consultations d'un utilisateur | ✅ |
| PATCH | `/consultations/:id` | Mettre à jour | ✅ |
| DELETE | `/consultations/:id` | Supprimer | ✅ |

### Analyses

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/consultations/:id/analysis` | Générer l'analyse | ✅ |
| GET | `/consultations/:id/analysis` | Récupérer l'analyse | ✅ |
| POST | `/consultations/:id/notify-user` | Notifier l'utilisateur | ✅ |

### Choix de Consultation

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/consultation-choices` | Lister tous les choix | ❌ |
| GET | `/consultation-choices/:id` | Récupérer un choix | ❌ |
| PATCH | `/consultation-choices/:id/prompt` | Associer un prompt | ✅ |

### Choix Utilisateur

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/user-consultation-choices` | Enregistrer un choix | ✅ |
| GET | `/user-consultation-choices/user/:userId` | Choix d'un utilisateur | ✅ |
| GET | `/user-consultation-choices/consultation/:consultationId` | Choix d'une consultation | ✅ |

## Intégration avec d'autres Modules

### Modules dépendants

```typescript
@Module({
  imports: [
    HttpModule,              // Pour les appels API externes
    AnalysisModule,          // Analyses et templates
    OfferingsModule,         // Gestion des offrandes
    NotificationsModule,     // Notifications utilisateur
    MongooseModule.forFeature([...]) // Schémas MongoDB
  ]
})
```

### Notifications

Lorsqu'une analyse est terminée :
```typescript
notificationsService.create({
  userId: string,
  type: NotificationType.CONSULTATION_RESULT,
  title: 'Votre analyse est prête',
  message: 'Consultation terminée',
  metadata: { consultationId }
})
```

### Offrandes (Offerings)

Les consultations peuvent nécessiter des offrandes :
- Récupération des détails via `OfferingsService.findByIds()`
- Enrichissement automatique des alternatives
- Validation des alternatives choisies

### Utilisateurs

Mise à jour automatique des compteurs :
```typescript
userModel.findByIdAndUpdate(clientId, {
  $inc: {
    totalConsultations: 1,
    consultationsCount: 1
  }
})
```

## Gestion des Erreurs

Le système utilise les exceptions NestJS standard :

```typescript
- NotFoundException       // Consultation non trouvée
- ForbiddenException     // Accès non autorisé
- HttpException          // Erreurs génériques
- BadRequestException    // Données invalides
```

## Système de Prompts

Les prompts sont utilisés pour guider l'IA dans la génération des analyses :

```typescript
interface Prompt {
  title: string,
  systemPrompt: string,    // Instructions système pour l'IA
  userPromptTemplate: string, // Template du prompt utilisateur
  category: string,        // Catégorie du prompt
  isActive: boolean,       // Actif ou non
  metadata: Object
}
```

Les prompts peuvent être associés aux choix de consultation via `promptId`.

## Monitoring et Progression

Le système utilise `AnalysisProgressService` pour suivre la progression des analyses en temps réel :

```typescript
interface AnalysisProgressUpdate {
  consultationId: string,
  progress: number,        // 0-100
  currentStep: string,     // Description de l'étape
  status: 'pending' | 'processing' | 'completed' | 'failed'
}
```

## Considérations Importantes

### Performance
- Les alternatives sont enrichies en batch (une seule requête pour toutes)
- Pagination par défaut : 10 items par page
- Population sélective des références (`firstName lastName email` uniquement)

### Sécurité
- Authentification JWT requise pour la plupart des endpoints
- Vérification des permissions via `PermissionsGuard`
- Validation des données avec les DTOs

### Données Sensibles
- Les données de naissance sont stockées dans `formData`
- Support pour les consultations tierces (données d'une autre personne)
- Email optionnel pour les consultations personnelles

### Cache et Optimisation
- Les résultats DeepSeek peuvent être cachés (metadata.cached)
- Session IDs uniques (UUID) pour tracking
- Timestamp de traitement enregistré

## Exemples d'Utilisation

### Créer une consultation complète

```typescript
POST /consultations
{
  "type": "NUMEROLOGIE",
  "title": "Analyse numérologique complète",
  "formData": {
    "nom": "Martin",
    "prenoms": "Sophie",
    "genre": "F",
    "dateNaissance": "1985-03-20",
    "heureNaissance": "09:15",
    "villeNaissance": "Lyon",
    "paysNaissance": "France",
    "email": "sophie@example.com"
  },
  "choice": {
    "title": "Analyse personnelle",
    "description": "Découvrir ma mission de vie",
    "frequence": "UNE_FOIS_VIE",
    "participants": "SOLO",
    "offering": {
      "alternatives": [
        {
          "offeringId": "abc123",
          "quantity": 1,
          "category": "animal"
        }
      ]
    }
  }
}
```

### Générer l'analyse

```typescript
POST /consultations/{{consultationId}}/analysis
// Pas de body nécessaire
// Retourne l'analyse complète avec carte du ciel et mission de vie
```

### Récupérer une consultation avec toutes les données

```typescript
GET /consultations/{{consultationId}}

// Réponse inclut :
// - Données de base de la consultation
// - Client (utilisateur) populé
// - Alternatives d'offrandes enrichies
// - Choix de consultation
// - Statut et timestamps
```

## Évolutions Futures

- Support pour plus de types d'analyses astrologiques
- Système de recommandations basé sur l'historique
- Partage de consultations entre utilisateurs
- Export PDF des analyses
- Webhooks pour notifications externes
- Analytics sur les types de consultations populaires

---

**Dernière mise à jour:** Janvier 2026
**Version du module:** Compatible avec NestJS 10+
