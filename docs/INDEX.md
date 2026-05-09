# 📑 INDEX DU SYSTÈME DE GESTION DES PROMPTS

## 📁 Fichiers du Système

| Fichier | Type | Description | Taille |
|---------|------|-------------|--------|
| **prompts.txt** | Contenu | Contenu complet de tous les prompts (47 consultations) | ~470 KB |
| **prompts-structure.json** | Structure | Mapping JSON : consultation ID ↔ prompt title | ~12 KB |
| **prompts-manager.ts** | Utilitaire | Module TypeScript pour manipuler les prompts | ~8 KB |
| **test-prompts.ts** | Tests | Suite de tests automatiques du système | ~6 KB |
| **README_PROMPTS.md** | Documentation | Guide complet d'utilisation | ~15 KB |
| **PROMPTS_REFERENCE.md** | Documentation | Référence détaillée de toutes les consultations | ~25 KB |
| **SYSTEM_MAP.md** | Documentation | Carte visuelle du système | ~8 KB |
| **INDEX.md** | Documentation | Ce fichier (index général) | ~3 KB |

**Total** : 8 fichiers (~547 KB)

---

## 🎯 Par Où Commencer ?

### 👤 Pour un Utilisateur Final
1. Consulter [PROMPTS_REFERENCE.md](./PROMPTS_REFERENCE.md) pour voir toutes les consultations disponibles
2. Rechercher votre consultation dans les tables de référence

### 👨‍💻 Pour un Développeur
1. Lire [README_PROMPTS.md](./README_PROMPTS.md) pour comprendre l'utilisation
2. Examiner [prompts-manager.ts](./prompts-manager.ts) pour les fonctions disponibles
3. Lancer [test-prompts.ts](./test-prompts.ts) pour valider le système
4. Consulter [SYSTEM_MAP.md](./SYSTEM_MAP.md) pour la vision d'ensemble

### 🔧 Pour Ajouter un Nouveau Prompt
1. Ajouter le contenu dans [prompts.txt](./prompts.txt)
2. Ajouter la référence dans [prompts-structure.json](./prompts-structure.json)
3. Mettre à jour [PROMPTS_REFERENCE.md](./PROMPTS_REFERENCE.md)
4. Lancer les tests avec [test-prompts.ts](./test-prompts.ts)

---

## 📊 Structure des Données

### Hiérarchie
```
CATÉGORIE (7)
  ├─ Consultation Choice (47 total)
      ├─ ID unique
      ├─ Titre
      ├─ Prompt (référence vers prompts.txt)
      └─ Type (analyse, cycles, synastrie, etc.)
```

### Exemple de Consultation
```json
{
  "id": "mon_signe_solaire",
  "title": "MON SIGNE SOLAIRE",
  "prompt": "MON SIGNE SOLAIRE",
  "type": "analyse"
}
```

---

## 🔍 Recherche Rapide

### Par Catégorie

| Catégorie | Fichier de Référence | Ligne |
|-----------|---------------------|-------|
| Carte du Ciel + 5 Portes | PROMPTS_REFERENCE.md | #carte-du-ciel--les-5-portes |
| Ma Vie Personnelle | PROMPTS_REFERENCE.md | #ma-vie-personnelle |
| Famille, Amitié et Couple | PROMPTS_REFERENCE.md | #famille-amitié-et-couple |
| Monde Professionnel | PROMPTS_REFERENCE.md | #monde-professionnel |
| Horoscope | PROMPTS_REFERENCE.md | #horoscope |
| Numérologie - Nombres | PROMPTS_REFERENCE.md | #numérologie---les-nombres-personnels |
| Numérologie - Cycles | PROMPTS_REFERENCE.md | #numérologie---les-cycles-personnels |

### Par Type

| Type | Nombre | Description |
|------|--------|-------------|
| `calcul` | 1 | Calcul de la carte du ciel (NASA JPL) |
| `analyse` | 28 | Interprétation d'aspects du thème |
| `cycles` | 9 | Analyse de cycles planétaires |
| `synastrie` | 6 | Comparaison de 2 thèmes |
| `previsionnel` | 5 | Horoscopes et prévisions |
| `numerologie` | 3 | Calculs numériques de personnalité |
| `numerologie_cycle` | 3 | Prévisions numériques temporelles |
| `complete` | 1 | Analyse intégrale du thème |
| `equipe` | 1 | Synergie de groupe |

---

## 🛠️ Commandes Utiles

### Lancer les Tests
```bash
cd d:\mike\cosmique\backend
ts-node scripts/test-prompts.ts
```

### Rechercher un Prompt
```typescript
import PromptsManager from './scripts/prompts-manager';

// Recherche par mot-clé
const results = PromptsManager.searchConsultationChoices('carrière');

```

### Récupérer un Prompt
```typescript
const prompt = PromptsManager.getPromptByConsultationId('mon_signe_solaire');

```

---

## 📈 Statistiques du Système

### Par Catégorie

| Catégorie | Consultations |
|-----------|--------------|
| CARTE_DU_CIEL_ET_5_PORTES | 6 |
| MA_VIE_PERSONNELLE | 16 |
| FAMILLE_AMITIE_ET_COUPLE | 8 |
| MONDE_PROFESSIONNEL | 6 |
| HOROSCOPE | 5 |
| NUMEROLOGIE_NOMBRES_PERSONNELS | 3 |
| NUMEROLOGIE_CYCLES_PERSONNELS | 3 |
| **TOTAL** | **47** |

### Par Type de Consultation

| Type | Répartition |
|------|------------|
| Analyses individuelles | 28 (59%) |
| Cycles planétaires | 9 (19%) |
| Synastries/Relations | 6 (13%) |
| Prévisions | 5 (11%) |
| Numérologie | 6 (13%) |
| Autres | 3 (6%) |

---

## 🔗 Liens Utiles

### Documentation
- [Guide d'Utilisation](./README_PROMPTS.md)
- [Référence Complète](./PROMPTS_REFERENCE.md)
- [Carte du Système](./SYSTEM_MAP.md)

### Code
- [Utilitaire TypeScript](./prompts-manager.ts)
- [Tests Automatiques](./test-prompts.ts)
- [Structure JSON](./prompts-structure.json)
- [Contenu des Prompts](./prompts.txt)

---

## ⚙️ Configuration Requise

### Prérequis
- Node.js 16+
- TypeScript 4.5+
- Modules : `fs`, `path` (natifs Node.js)

### Installation
```bash
# Aucune installation nécessaire, tout est inclus
cd d:\mike\cosmique\backend
```

---

## 🆘 Support & Maintenance

### En Cas de Problème

1. **Prompt introuvable**
   - Vérifier que l'ID existe dans `prompts-structure.json`
   - Vérifier que le titre du prompt est exact dans `prompts.txt`
   - Lancer `test-prompts.ts` pour diagnostiquer

2. **Placeholder non remplacé**
   - Vérifier le format des données utilisateur
   - Consulter la section "Placeholders supportés" dans README_PROMPTS.md

3. **Incohérence de structure**
   - Lancer `test-prompts.ts` (Test 10)
   - Consulter les logs pour identifier les prompts manquants

### Contact
Pour toute question technique, consulter d'abord :
1. [README_PROMPTS.md](./README_PROMPTS.md) - Section "Support"
2. [PROMPTS_REFERENCE.md](./PROMPTS_REFERENCE.md) - Section "Validation"

---

## 📅 Historique des Versions

| Version | Date | Changements |
|---------|------|-------------|
| **1.0.0** | 16/01/2026 | Version initiale - 47 consultations |

---

## ✅ Checklist de Validation

Avant de commiter des modifications :

- [ ] Tous les prompts ont un ID unique
- [ ] Tous les IDs dans `prompts-structure.json` correspondent à un prompt dans `prompts.txt`
- [ ] Les tests passent à 100% (`test-prompts.ts`)
- [ ] La documentation est à jour
- [ ] Les statistiques sont correctes
- [ ] Les exemples de code fonctionnent

---

## 🎉 Contribution

Pour ajouter une nouvelle consultation :

1. ✅ Créer le prompt dans `prompts.txt` (format standard)
2. ✅ Ajouter l'entrée dans `prompts-structure.json`
3. ✅ Mettre à jour `PROMPTS_REFERENCE.md`
4. ✅ Lancer `test-prompts.ts`
5. ✅ Mettre à jour les statistiques
6. ✅ Commiter avec un message clair

---

**Dernière mise à jour** : 16 janvier 2026  
**Maintenu par** : Équipe Mon Étoile  
**Version du système** : 1.0.0
