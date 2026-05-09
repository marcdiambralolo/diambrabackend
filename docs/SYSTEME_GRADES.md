# Système de gestion des grades — MON ÉTOILE

## Les 9 grades initiatiques

| Niveau | Grade | Consultations | Rituels | Livres |
|:---:|---|:---:|:---:|:---:|
| 1 | Aspirant | 3 | 1 | 1 |
| 2 | Contemplateur | 6 | 2 | 1 |
| 3 | Conscient | 9 | 3 | 2 |
| 4 | Intégrateur | 13 | 4 | 2 |
| 5 | Transmutant | 18 | 6 | 3 |
| 6 | Aligné | 23 | 8 | 4 |
| 7 | Éveillé | 28 | 10 | 5 |
| 8 | Sage | 34 | 10 | 6 |
| 9 | Maître de Soi | 40 | 10 | 8 |

## Comment fonctionne la progression

La progression d'un grade au suivant repose sur **deux niveaux de vérification** :

### 1. Seuils globaux

L'utilisateur a 3 compteurs sur son profil :

- `consultationsCompleted` — nombre total de consultations terminées
- `rituelsCompleted` — nombre de rituels/invocations réalisés
- `booksRead` — nombre de livres/contenus complétés

Ces compteurs sont incrémentés via les endpoints `/grades/increment-consultations`, `/grades/increment-rituels`, `/grades/increment-books`. À chaque incrémentation, le système vérifie automatiquement si l'utilisateur peut monter en grade.

### 2. Exigences par rubrique

En complément des seuils globaux, chaque grade peut avoir des `rubriqueRequirements` : un nombre minimum de consultations COMPLETED dans des rubriques spécifiques (ex : au moins 2 consultations en Numérologie ET 1 en Astrologie). Ce décompte est calculé par agrégation MongoDB sur les consultations réelles de l'utilisateur, groupées par `rubriqueId`.

> **Important :** Le nombre de consultations requis pour évoluer vers un grade supérieur **n'est PAS équivalent** au nombre total de consultations accessibles dans le grade actuel.

## Logique de calcul

Le processus de vérification se déroule en 3 étapes (fichier `src/users/grade.service.ts`) :

1. **`calculateGrade()`** — Parcourt les 9 grades du plus haut au plus bas et retourne le plus haut grade dont les seuils globaux sont atteints.

2. **`validateGradeWithRubriqueRequirements()`** — Prend ce grade candidat et vérifie les exigences par rubrique. Si elles ne sont pas remplies, descend au grade inférieur qui est satisfait.

3. **Mise à jour** — Si le grade résultant diffère du grade actuel → mise à jour du profil utilisateur + génération d'un message de félicitations personnalisé.

## Les 3 couches du système

```
┌─────────────────────────────────────────────────────┐
│  RUBRIQUES                                          │
│  Contiennent les consultationChoices (choix de      │
│  consultation avec fréquence, offrandes, prompts)   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  GRADE CONFIG (admin)                               │
│  • consultationChoices → quels choix sont           │
│    ACCESSIBLES à ce grade                           │
│  • requirements → seuils globaux (consultations,    │
│    rituels, livres) immuables                       │
│  • rubriqueRequirements → nombre min de             │
│    consultations PAR RUBRIQUE pour progresser       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  UTILISATEUR                                        │
│  • grade → son grade actuel                         │
│  • consultationsCompleted, rituelsCompleted,        │
│    booksRead → compteurs globaux                    │
│  • Consultations COMPLETED avec rubriqueId →        │
│    vérifiées par agrégation MongoDB                 │
└─────────────────────────────────────────────────────┘
```

## Initialisation


## Messages

- À chaque changement de grade, un **message de félicitations** personnalisé est généré (défini dans `GRADE_MESSAGES` de `src/common/enums/user-grade.enum.ts`).
- À la création du compte, un **message de bienvenue** présente les 9 grades (`PROFILE_WELCOME_MESSAGE`).

## Endpoints

### Endpoints utilisateur (`/grades/...`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/grades/progress` | Progression de l'utilisateur connecté avec détail par rubrique |
| `GET` | `/grades/progress/:userId` | Progression d'un utilisateur spécifique |
| `GET` | `/grades/info` | Liste tous les grades et leurs exigences |
| `POST` | `/grades/check/:userId` | Vérifier et mettre à jour le grade d'un utilisateur |
| `PATCH` | `/grades/increment-consultations` | Incrémenter le compteur de consultations |
| `PATCH` | `/grades/increment-rituels` | Incrémenter le compteur de rituels |
| `PATCH` | `/grades/increment-books` | Incrémenter le compteur de livres lus |
| `GET` | `/grades/welcome-message` | Message de bienvenue personnalisé |

### Endpoints admin (`/admin/...`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin/grades` | Tous les grades configurés |
| `GET` | `/admin/grades/enriched` | Grades avec infos enrichies (nb choix, grade suivant, exigences rubriques) |
| `GET` | `/admin/grades/:id` | Un grade par son ID |
| `POST` | `/admin/grades` | Créer un grade |
| `PATCH` | `/admin/grades/:id` | Modifier un grade |
| `DELETE` | `/admin/grades/:id` | Supprimer un grade |
| `PUT` | `/admin/grades/:id/reorder-choices` | Réordonner les choix de consultations |
| `PATCH` | `/admin/grades/:id/next-grade` | Définir le grade suivant |
| `PATCH` | `/admin/grades/:id/rubrique-requirements` | Configurer les exigences par rubrique |
| `GET` | `/admin/consultation-choices` | Tous les choix de consultations disponibles |
| `GET` | `/admin/rubriques-for-requirements` | Lister les rubriques pour configurer les exigences |

### Endpoints profil/abonnement (`/user-access/...`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/user-access/subscription-info` | Infos d'abonnement de l'utilisateur connecté |
| `GET` | `/user-access/subscription-info/:userId` | Infos d'abonnement d'un utilisateur |
| `POST` | `/user-access/check-access/:rubriqueId` | Vérifier l'accès à une rubrique |
| `POST` | `/user-access/activate-premium` | Activer un abonnement Premium |
| `POST` | `/user-access/activate-integral` | Activer un abonnement Intégral |
| `DELETE` | `/user-access/cancel-subscription` | Annuler l'abonnement |

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/common/enums/user-grade.enum.ts` | Enum des grades, seuils (`GRADE_REQUIREMENTS`), messages de félicitations |
| `src/users/grade.constants.ts` | Seuils sous forme de tableau (utilisé par `UsersService`) |
| `src/users/grade.service.ts` | Logique de calcul et de progression des grades |
| `src/users/grade.controller.ts` | Endpoints utilisateur |
| `src/grades/schemas/grade-config.schema.ts` | Schéma MongoDB : `GradeConfig`, `RubriqueRequirement`, `GradeConsultationChoice` |
| `src/grades/grade-config.service.ts` | Logique admin (CRUD grades, exigences par rubrique) |
| `src/grades/grade-config.controller.ts` | Endpoints admin |
| `src/grades/grade-initializer.service.ts` | Auto-création des 9 grades au démarrage |
| `src/grades/dto/update-grade-config.dto.ts` | DTO de mise à jour (incluant `RubriqueRequirementDto`) |
| `src/grades/dto/create-grade-config.dto.ts` | DTO de création d'un grade |
| `src/users/dto/grade.dto.ts` | DTO de réponse (`GradeProgressDto`, `RubriqueProgressDto`) |
| `src/rubriques/rubrique.schema.ts` | Schéma des rubriques et choix de consultation |
| `src/users/user-access.controller.ts` | Endpoints profil/abonnement |
| `src/users/user-access.service.ts` | Logique d'accès et d'abonnement |
