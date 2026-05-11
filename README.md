# 🌟 Diambra - Backend API

Backend NestJS complet pour la plateforme de voyance et spiritualité africaine **Diambra**.

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [API Documentation](#api-documentation)
- [Authentification](#authentification)
- [Rôles et Permissions](#rôles-et-permissions)
- [Modules](#modules)
- [Tests](#tests)
- [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

Backend production-ready avec :
- ✅ Authentification JWT sécurisée
- ✅ Système de rôles et permissions granulaires (5 rôles)
- ✅ 4 modules CRUD complets (Users, Consultations, Services, Payments)
- ✅ MongoDB Atlas integration
- ✅ Rate limiting et sécurité
- ✅ Validation des données avec class-validator
- ✅ Documentation API complète

---

## 🛠️ Technologies

### Core
- **NestJS** 10.x - Framework backend TypeScript
- **TypeScript** 5.x - Typage statique
- **Node.js** 20.x - Runtime

### Database
- **MongoDB** 8.x - Base de données NoSQL
- **Mongoose** 8.x - ODM pour MongoDB

### Authentification & Sécurité
- **Passport** 0.7.x - Authentification middleware
- **JWT** (jsonwebtoken) - Tokens sécurisés
- **bcrypt** 5.x - Hashage de passwords
- **Helmet** 7.x - Headers de sécurité
- **Throttler** 5.x - Rate limiting

### Validation
- **class-validator** 0.14.x - Validation des DTOs
- **class-transformer** 0.5.x - Transformation d'objets

---

## 🏗️ Architecture

```
backend/
├── src/
│   ├── auth/                    # Module authentification
│   │   ├── strategies/          # Stratégies Passport (JWT, Local)
│   │   ├── dto/                 # DTOs (RegisterDto, LoginDto)
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                   # Module utilisateurs
│   │   ├── schemas/             # Schéma Mongoose User
│   │   ├── dto/                 # DTOs (CreateUserDto, UpdateUserDto)
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── users.module.ts
│   │
│   ├── consultations/           # Module consultations
│   │   ├── schemas/             # Schéma Consultation
│   │   ├── dto/
│   │   ├── consultations.service.ts
│   │   ├── consultations.controller.ts
│   │   └── consultations.module.ts
│   │
│   ├── services/                # Module catalogue services
│   │   ├── schemas/
│   │   ├── dto/
│   │   ├── services.service.ts
│   │   ├── services.controller.ts
│   │   └── services.module.ts
│   │
│   ├── payments/                # Module paiements
│   │   ├── schemas/
│   │   ├── dto/
│   │   ├── payments.service.ts
│   │   ├── payments.controller.ts
│   │   └── payments.module.ts
│   │
│   ├── common/                  # Code partagé
│   │   ├── decorators/          # Decorators (@Roles, @Permissions, @CurrentUser, @Public)
│   │   ├── guards/              # Guards (JwtAuthGuard, RolesGuard, PermissionsGuard)
│   │   └── enums/               # Enums (Role, Permission, Status)
│   │
│   ├── app.module.ts            # Module racine
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts                  # Point d'entrée
│
├── .env.example                 # Variables d'environnement (template)
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 📦 Installation

### Prérequis

- **Node.js** 20.x ou supérieur
- **npm** ou **yarn**
- **MongoDB Atlas** account (ou MongoDB local)

### Étapes

1. **Cloner le repository**
```bash
git clone <repo-url>
cd backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

---

## ⚙️ Configuration

Créer un fichier `.env` à la racine du projet :

```env
# APPLICATION
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# DATABASE - MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/mon-etoile?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRATION=30d

# BCRYPT
BCRYPT_ROUNDS=10

# RATE LIMITING
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### Configuration MongoDB Atlas

1. Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créer un cluster gratuit
3. Créer un utilisateur de base de données
4. Récupérer l'URI de connexion
5. Remplacer `<username>`, `<password>`, et `<cluster>` dans `MONGODB_URI`

---

## 🚀 Démarrage

### Mode développement

```bash
npm run start:dev
```

### Mode production

```bash
# Build
npm run build

# Démarrage
npm run start:prod
```

###   commandes

```bash
# Format du code
npm run format

# Lint
npm run lint

# Tests
npm run test
npm run test:watch
npm run test:cov
```

Le serveur démarre sur **http://localhost:3001**

API disponible sur **http://localhost:3001/api/v1**

---

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Endpoints principaux

#### 🔐 Authentification (`/auth`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/auth/register` | Inscription | ❌ |
| POST | `/auth/login` | Connexion | ❌ |
| POST | `/auth/refresh` | Rafraîchir token | ❌ |
| GET | `/auth/me` | Profil actuel | ✅ |

#### 👥 Utilisateurs (`/users`)

| Méthode | Endpoint | Description | Auth | Permission |
|---------|----------|-------------|------|------------|
| POST | `/users` | Créer utilisateur | ✅ | ADMIN |
| GET | `/users` | Liste utilisateurs | ✅ | READ_ANY_USER |
| GET | `/users/me` | Mon profil | ✅ | - |
| GET | `/users/:id` | Utilisateur par ID | ✅ | READ_ANY_USER |
| PATCH | `/users/me` | Modifier mon profil | ✅ | - |
| PATCH | `/users/:id` | Modifier utilisateur | ✅ | UPDATE_ANY_USER |
| PATCH | `/users/:id/role` | Assigner rôle | ✅ | MANAGE_ROLES |
| DELETE | `/users/:id` | Supprimer (soft) | ✅ | DELETE_ANY_USER |


#### 🔮 Consultations (`/consultations`)

| Méthode | Endpoint | Description | Auth | Permission |
|---------|----------|-------------|------|------------|
| POST | `/consultations` | Créer consultation | ✅ | CREATE_CONSULTATION |
| GET | `/consultations` | Liste consultations | ✅ | READ_ANY_CONSULTATION |
| GET | `/consultations/my` | Mes consultations | ✅ | - |
| GET | `/consultations/:id` | Consultation par ID | ✅ | - |
| GET | `/consultations/analysis/:consultationId` | Analyse d'une consultation (astrologique) | ❌ (public) | - |
| PATCH | `/consultations/:id` | Modifier consultation | ✅ | UPDATE_OWN_CONSULTATION |
| PATCH | `/consultations/:id/assign/:consultantId` | Attribuer consultant | ✅ | ASSIGN_CONSULTATION |
| DELETE | `/consultations/:id` | Supprimer | ✅ | DELETE_OWN_CONSULTATION |
#
### Exemple : Récupérer l'analyse d'une consultation

**GET** `/consultations/analysis/:consultationId`

**Réponse (200)**
```json
{
  "success": true,
  "consultationId": "65a1234bcdef567890123456",
  "analyse": { /* ...données astrologiques... */ }
}
```

**Réponse (404)**
```json
{
  "success": false,
  "message": "Aucune analyse trouvée pour cette consultation"
}
```

#### 📦 Services (`/services`)

| Méthode | Endpoint | Description | Auth | Permission |
|---------|----------|-------------|------|------------|
| POST | `/services` | Créer service | ✅ | CREATE_SERVICE |
| GET | `/services` | Liste services | ❌ | - |
| GET | `/services/:id` | Service par ID | ❌ | - |
| PATCH | `/services/:id` | Modifier service | ✅ | UPDATE_SERVICE |
| DELETE | `/services/:id` | Supprimer service | ✅ | DELETE_SERVICE |

#### 💳 Paiements (`/payments`)

| Méthode | Endpoint | Description | Auth | Permission |
|---------|----------|-------------|------|------------|
| POST | `/payments` | Créer paiement | ✅ | CREATE_PAYMENT |
| GET | `/payments` | Liste paiements | ✅ | READ_ANY_PAYMENT |
| GET | `/payments/my` | Mes paiements | ✅ | - |
| GET | `/payments/:id` | Paiement par ID | ✅ | - |
| PATCH | `/payments/:id` | Modifier paiement | ✅ | UPDATE_PAYMENT |

---

## 🔐 Authentification

### Workflow d'authentification

1. **Inscription** : `POST /auth/register`
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Réponse :
```json
{
  "user": { ...user_data },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

2. **Connexion** : `POST /auth/login`
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

3. **Utiliser le token** : Ajouter dans les headers
```
Authorization: Bearer <accessToken>
```

4. **Rafraîchir le token** : `POST /auth/refresh`
```json
{
  "refreshToken": "eyJhbGc..."
}
```

---

## 👑 Rôles et Permissions

### 5 Rôles disponibles

| Rôle | Description | Hiérarchie |
|------|-------------|------------|
| **SUPER_ADMIN** | Accès total au système | 5 |
| **ADMIN** | Gestion des utilisateurs et consultations | 4 |
| **CONSULTANT** | Praticien spirituel / Voyant | 3 |
| **USER** | Client standard | 2 |
| **GUEST** | Visiteur non authentifié | 1 |

### Matrice des permissions

#### SUPER_ADMIN
- ✅ Toutes les permissions du système

#### ADMIN
- ✅ Créer, lire, modifier, supprimer utilisateurs
- ✅ Gérer toutes les consultations
- ✅ Gérer tous les services
- ✅ Voir tous les paiements et statistiques
- ✅ Attribuer consultations aux consultants

#### CONSULTANT
- ✅ Lire et modifier son profil
- ✅ Voir et mettre à jour les consultations attribuées
- ✅ Voir les services (lecture seule)
- ✅ Voir ses propres paiements
- ✅ Voir ses propres statistiques

#### USER
- ✅ Lire, modifier, supprimer son profil
- ✅ Créer, lire, modifier, supprimer ses consultations
- ✅ Voir les services
- ✅ Créer et voir ses paiements

#### GUEST
- ✅ Voir les services publics uniquement

### Utilisation dans le code

```typescript
// Protéger par rôle
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Get('admin-only')
adminRoute() { ... }

// Protéger par permission
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.DELETE_ANY_USER)
@Delete(':id')
deleteUser() { ... }

// Récupérer l'utilisateur actuel
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 📦 Modules

### Auth Module
- JWT authentication avec Passport
- Stratégies : JWT et Local
- Refresh tokens
- Guards personnalisés

### Users Module
- CRUD complet
- Gestion des rôles
- Changement de password
- Statistiques
- Soft delete

### Consultations Module
- CRUD consultations spirituelles
- Attribution aux consultants
- Filtres avancés
- Évaluations (rating/review)
- Statuts : PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED

### Services Module
- Catalogue des services offerts
- Types :  Numérologie, Vie personnelle, Relations, etc.
- Prix, durée, description
- Featured services

### Payments Module
- Gestion des transactions
- Méthodes : Carte, Stripe, PayPal, Mobile Money
- Statuts : PENDING, COMPLETED, FAILED, REFUNDED
- Historique et statistiques

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:cov

# Tests end-to-end
npm run test:e2e
```

---

## 🚢 Déploiement

### Heroku

1. Créer une app Heroku
```bash
heroku create mon-etoile-api
```

2. Ajouter MongoDB Atlas add-on ou utiliser votre cluster
```bash
heroku config:set MONGODB_URI="mongodb+srv://..."
```

3. Définir les variables d'environnement
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="..."
# etc.
```

4. Déployer
```bash
git push heroku main
```

### Railway / Render

1. Connecter votre repository GitHub
2. Configurer les variables d'environnement
3. Build command: `npm run build`
4. Start command: `npm run start:prod`

### Docker (optionnel)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

---

## 🔒 Sécurité

### Bonnes pratiques implémentées

✅ **Passwords** : Hashés avec bcrypt (10 rounds)
✅ **JWT** : Tokens signés avec secret fort
✅ **Rate Limiting** : Protection contre brute force (10 req/min)
✅ **Helmet** : Headers HTTP sécurisés
✅ **CORS** : Origines configurables
✅ **Validation** : DTOs avec class-validator
✅ **MongoDB Injection** : Protection avec Mongoose
✅ **Environment** : Secrets dans .env (jamais committed)

---

## 📝 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run start` | Démarrage standard |
| `npm run start:dev` | Développement avec hot-reload |
| `npm run start:debug` | Debug mode |
| `npm run start:prod` | Production |
| `npm run build` | Build TypeScript → JavaScript |
| `npm run format` | Format code avec Prettier |
| `npm run lint` | Lint avec ESLint |
| `npm run test` | Tests unitaires |
| `npm run test:watch` | Tests en watch mode |
| `npm run test:cov` | Couverture de code |
| `npm run test:e2e` | Tests end-to-end |

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 License

Ce projet est sous licence privée. Tous droits réservés.

---

## 👥 Équipe

**Diambra Team** - Plateforme de voyance et spiritualité africaine

---

## 📞 Support

Pour toute question ou problème :
- Email : support@monetoile.com
- Documentation : [Lien vers docs]
- Issues : [GitHub Issues]

---

**✨ Que les étoiles guident votre développement ! ✨**
