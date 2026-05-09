# Documentation Backend - MonEtoile

Bienvenue dans la documentation complète du backend MonEtoile.

## 📚 Table des matières

### 🌍 Détection du Pays (Nouveau)

- **[Guide de détection du pays](./COUNTRY_DETECTION_GUIDE.md)** - Guide complet sur la détection automatique du pays lors de la création de consultations
- **[API - Détection du pays](./API_COUNTRY_DETECTION.md)** - Documentation de l'API avec exemples d'utilisation
- **[Implémentation](./IMPLEMENTATION_COUNTRY_DETECTION.md)** - Résumé technique de l'implémentation

### 📋 Consultations

- **[Guide des consultations](./CONSULTATIONS_GUIDE.md)** - Documentation complète du système de consultations
- **[Statut des consultations](./CONSULTATION_STATUS_COMPLETE.md)** - Gestion des statuts
- **[Utilisation des statuts](./CONSULTATION_STATUS_USAGE.md)** - Guide d'utilisation
- **[API Statut de choix](./CONSULTATION_CHOICE_STATUS_API.md)** - API pour les statuts de choix

### 📊 Analyses et Templates

- **[Guide des templates d'analyse](./ANALYSIS_TEMPLATES_GUIDE.md)** - Création et gestion des templates d'analyse

### 🎖️ Grades et Profils

- **[Implémentation des grades](./IMPLEMENTATION_GRADES.md)** - Système de grades utilisateur
- **[Guide d'implémentation Admin](./BACKEND_IMPLEMENTATION_GUIDE_ADMIN_GRADES_MANAGEMENT.md)** - Gestion administrative des grades
- **[Référence rapide des grades](./GRADES_QUICK_REFERENCE.md)** - Guide de référence
- **[Automatisation grades/profils](./AUTOMATISATION_GRADES_PROFILS.md)** - Automatisation du système

### 🚀 Déploiement

- **[Guide de déploiement](./DEPLOYMENT_GUIDE.md)** - Déploiement général
- **[Déploiement VPS](./DEPLOIEMENT_VPS.md)** - Déploiement sur serveur VPS
- **[Installation MongoDB local](./INSTALLATION_MONGODB_LOCAL.md)** - Installation en local

### 📝 Implémentation

- **[Résumé d'implémentation](./IMPLEMENTATION_SUMMARY.md)** - Vue d'ensemble
- **[Checklist d'implémentation](./IMPLEMENTATION_CHECKLIST.md)** - Liste de vérification

### 🔧 Structures

- **[Structure des services](./services_structure.md)** - Architecture des services
- **[Structure des offrandes](./offrandes_structure.ts)** - Modèle de données des offrandes

## 🆕 Dernières mises à jour

### Février 2026

#### Détection automatique du pays lors de la création de consultations

Une nouvelle fonctionnalité a été implémentée pour enregistrer automatiquement le pays d'origine de l'utilisateur lors de la création d'une consultation.

**Fonctionnalités principales :**
- ✅ Détection automatique via IP avec geoip-lite
- ✅ Gestion des proxies (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
- ✅ Fallback sur les données du formulaire
- ✅ Support de 25+ pays avec mapping des codes ISO
- ✅ Migration des données existantes disponible
- ✅ Scripts de test inclus

**Nouveaux fichiers :**
- Service : `src/common/services/geolocation.service.ts`
- Documentation : `COUNTRY_DETECTION_GUIDE.md`
- API : `API_COUNTRY_DETECTION.md`
- Scripts : `scripts/test-country-detection.js`, `scripts/migrate-add-country-to-consultations.js`

**Modifications :**
- Schéma Consultation : nouveau champ `country`
- ConsultationsService : paramètre `country` ajouté
- ConsultationsController : injection de `GeolocationService`

**Utilisation :**
```typescript
POST /consultations
// Le champ 'country' est automatiquement ajouté à la réponse
{
  success: true,
  id: "...",
  country: "Côte d'Ivoire", // ← Nouveau
  ...
}
```

**Voir :**
- [Guide complet](./COUNTRY_DETECTION_GUIDE.md)
- [Documentation API](./API_COUNTRY_DETECTION.md)
- [Détails d'implémentation](./IMPLEMENTATION_COUNTRY_DETECTION.md)

## 📖 Comment utiliser cette documentation

### Pour les développeurs

1. **Nouvelle fonctionnalité ?** → Consultez les guides d'implémentation
2. **Intégration API ?** → Consultez les documentations API spécifiques
3. **Problème technique ?** → Vérifiez les guides de déploiement et troubleshooting

### Pour les administrateurs

1. **Déploiement ?** → Suivez les guides de déploiement VPS
2. **Configuration ?** → Consultez `.env.example` et les guides d'installation
3. **Monitoring ?** → Référez-vous aux guides de statuts et analyses

### Organisation des fichiers

```
docs/
├── README.md (ce fichier)
│
├── Détection du pays (Nouveau) 🌍
│   ├── COUNTRY_DETECTION_GUIDE.md
│   ├── API_COUNTRY_DETECTION.md
│   └── IMPLEMENTATION_COUNTRY_DETECTION.md
│
├── Consultations 📋
│   ├── CONSULTATIONS_GUIDE.md
│   ├── CONSULTATION_STATUS_COMPLETE.md
│   ├── CONSULTATION_STATUS_USAGE.md
│   └── CONSULTATION_CHOICE_STATUS_API.md
│
├── Analyses 📊
│   └── ANALYSIS_TEMPLATES_GUIDE.md
│
├── Grades 🎖️
│   ├── IMPLEMENTATION_GRADES.md
│   ├── BACKEND_IMPLEMENTATION_GUIDE_ADMIN_GRADES_MANAGEMENT.md
│   ├── GRADES_QUICK_REFERENCE.md
│   └── AUTOMATISATION_GRADES_PROFILS.md
│
├── Déploiement 🚀
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEPLOIEMENT_VPS.md
│   └── INSTALLATION_MONGODB_LOCAL.md
│
└── Structures 🔧
    ├── services_structure.md
    ├── services_structure.ts
    └── offrandes_structure.ts
```

## 🔍 Recherche rapide

### Je cherche à...

| Tâche | Document |
|-------|----------|
| Détecter le pays d'un utilisateur | [COUNTRY_DETECTION_GUIDE.md](./COUNTRY_DETECTION_GUIDE.md) |
| Créer une consultation | [CONSULTATIONS_GUIDE.md](./CONSULTATIONS_GUIDE.md) |
| Gérer les grades | [IMPLEMENTATION_GRADES.md](./IMPLEMENTATION_GRADES.md) |
| Déployer l'application | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| Créer un template d'analyse | [ANALYSIS_TEMPLATES_GUIDE.md](./ANALYSIS_TEMPLATES_GUIDE.md) |
| Configurer MongoDB | [INSTALLATION_MONGODB_LOCAL.md](./INSTALLATION_MONGODB_LOCAL.md) |

## 🛠️ Scripts disponibles

### Dans `scripts/`

- **test-country-detection.js** - Test de la détection de pays
- **migrate-add-country-to-consultations.js** - Migration des consultations existantes
- **seed-grades.ts** - Initialisation des grades
- **prompts-manager.ts** - Gestion des prompts
- **find-missing-choice-prompts.js** - Diagnostic des prompts manquants

**Usage :**
```bash
node scripts/nom-du-script.js
```

## 📦 Dépendances principales

- **NestJS** - Framework backend
- **MongoDB / Mongoose** - Base de données
- **geoip-lite** - Géolocalisation IP (nouveau)
- **JWT** - Authentification
- **Passport** - Stratégies d'authentification

## 🤝 Contribution

Pour ajouter de la documentation :

1. Créez un nouveau fichier `.md` dans `docs/`
2. Suivez le format existant
3. Ajoutez une entrée dans ce README
4. Mettez à jour la section "Dernières mises à jour"

### Template de documentation

```markdown
# Titre de la fonctionnalité

## Vue d'ensemble
Description courte

## Fonctionnalités
- Liste des fonctionnalités

## Utilisation
Exemples de code

## API
Documentation des endpoints

## Exemples
Cas d'usage concrets

## Troubleshooting
Solutions aux problèmes courants
```

## 📞 Support

Pour toute question sur la documentation :
1. Consultez d'abord ce README
2. Vérifiez le document spécifique à votre besoin
3. Contactez l'équipe de développement

## 🔗 Liens utiles

- **API en production :** https://api.votre-domaine.com
- **API en développement :** http://localhost:3000
- **Documentation Swagger :** http://localhost:3000/api
- **MongoDB Compass :** `mongodb://localhost:27017/monetoile`

---

**Dernière mise à jour :** Février 2026  
**Version :** 1.0  
**Mainteneur :** Équipe Backend MonEtoile
