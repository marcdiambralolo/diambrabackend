# 📚 GUIDE DE RÉFÉRENCE DES PROMPTS PAR CHOIX DE CONSULTATION

## 🎯 Structure Générale

Ce document établit la correspondance entre **chaque choix de consultation** et le(s) **prompt(s)** à utiliser pour générer une réponse de qualité.

---

## 📖 TABLE DES MATIÈRES

1. [CARTE DU CIEL + LES 5 PORTES](#carte-du-ciel--les-5-portes)
2. [MA VIE PERSONNELLE](#ma-vie-personnelle)
3. [FAMILLE, AMITIÉ ET COUPLE](#famille-amitié-et-couple)
4. [MONDE PROFESSIONNEL](#monde-professionnel)
5. [HOROSCOPE](#horoscope)
6. [NUMÉROLOGIE - LES NOMBRES PERSONNELS](#numérologie---les-nombres-personnels)
7. [NUMÉROLOGIE - LES CYCLES PERSONNELS](#numérologie---les-cycles-personnels)

---

## 📍 CARTE DU CIEL + LES 5 PORTES

Cette catégorie regroupe le **calcul initial de la carte du ciel** et l'analyse des **5 portes fondamentales** de l'astrologie.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant | Type |
|-----------------|-------|----------------------|------|
| `carte_du_ciel_complete` | **CARTE DU CIEL COMPLÈTE** | `CARTE DU CIEL COMPLÈTE (MOTEUR DE CALCUL NASA JPL)` | Calcul |
| `mon_signe_solaire` | **MON SIGNE SOLAIRE** | `MON SIGNE SOLAIRE` | Analyse |
| `mon_signe_lunaire` | **MON SIGNE LUNAIRE** | `MON SIGNE LUNAIRE` | Analyse |
| `mon_ascendant` | **MON ASCENDANT** | `MON ASCENDANT` | Analyse |
| `mon_descendant` | **MON DESCENDANT** | `MON DESCENDANT` | Analyse |
| `mon_milieu_du_ciel` | **MON MILIEU DU CIEL** | `MON MILIEU DU CIEL` | Analyse |

### 📝 Note Importante
La consultation **"CARTE DU CIEL COMPLÈTE"** doit être effectuée EN PREMIER car elle génère toutes les données brutes nécessaires aux 5 autres consultations.

---

## 🌟 MA VIE PERSONNELLE

Cette catégorie couvre les **analyses personnelles approfondies** : mission de vie, talents, blessures karmiques, cycles planétaires.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant | Type |
|-----------------|-------|----------------------|------|
| `les_4_piliers` | **LES 4 PILIERS DE TON ÉQUILIBRE PERSONNEL** | `Les 4 Piliers de ton Équilibre Personnel` | Analyse |
| `mission_de_vie` | **MISSION DE VIE** | `Mission de Vie` | Analyse |
| `rapport_argent` | **TON RAPPORT À L'ARGENT ET À L'ABONDANCE** | `Ton Rapport à l'Argent et à l'Abondance` | Analyse |
| `maniere_aimer` | **MANIÈRE D'AIMER** | `MANIÈRE D'AIMER` | Analyse |
| `darakaraka` | **LE DARAKARAKA – TON COMPAGNON DE L'ÂME** | `LE DARAKARAKA – TON COMPAGNON DE L'ÂME` | Analyse |
| `stress_resilience` | **STRESS & RÉSILIENCE** | `STRESS & RÉSILIENCE` | Analyse |
| `energie_sexuelle` | **ÉNERGIE SEXUELLE** | `ANALYSE ASTROLOGIQUE DE L'ÉNERGIE SEXUELLE` | Analyse |
| `cycles_saturne` | **LES CYCLES DE SATURNE** | `ANALYSE ASTROLOGIQUE : LES CYCLES DE SATURNE` | Cycles |
| `cycles_jupiter` | **LES CYCLES DE JUPITER** | `ANALYSE ASTROLOGIQUE : LES CYCLES DE JUPITER` | Cycles |
| `retour_mars` | **LE RETOUR DE MARS** | `LE RETOUR DE MARS (ÉNERGIE, ACTION & CONQUÊTE)` | Cycles |
| `cycle_uranus` | **LE CYCLE D'URANUS** | `LE CYCLE D'URANUS (LIBÉRATION, ÉVEIL & RÉINVENTION)` | Cycles |
| `cycle_neptune` | **LE CYCLE DE NEPTUNE** | `LE CYCLE DE NEPTUNE (QUÊTE DE SENS, INTUITION & TRANSCENDANCE)` | Cycles |
| `cycle_pluton` | **LE CYCLE DE PLUTON** | `LE CYCLE DE PLUTON (MÉTAMORPHOSE, POUVOIR & RENAISSANCE)` | Cycles |
| `retour_chiron` | **LE RETOUR DE CHIRON** | `LE RETOUR DE CHIRON (VULNÉRABILITÉ, SAGESSE & GUÉRISON)` | Cycles |
| `revelation_talents` | **RÉVÉLATION DES TALENTS INNÉS** | `Révélation des Talents Innés` | Analyse |
| `liberation_blessures` | **LIBÉRATION DES BLESSURES KARMIQUES** | `Libération des Blessures Karmiques` | Analyse |
| `analyse_integrale` | **ANALYSE INTÉGRALE DU THÈME NATAL** | `ANALYSE INTÉGRALE DU THÈME NATAL` | Complète |

---

## ❤️ FAMILLE, AMITIÉ ET COUPLE

Cette catégorie couvre les **analyses relationnelles** : synastries, compatibilités, liens karmiques et cycles de couple.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant | Type |
|-----------------|-------|----------------------|------|
| `relations_similitude` | **RELATIONS DE SIMILITUDE** | `RELATIONS DE SIMILITUDE (L'ÉCHO DE TON ÉLÉMENT)` | Synastrie |
| `relations_soutien` | **RELATIONS DE SOUTIEN ET D'ÉQUILIBRE** | `RELATIONS DE SOUTIEN ET D'ÉQUILIBRE (L'ALLIANCE FERTILE)` | Synastrie |
| `relations_defi` | **RELATIONS DE DÉFI ET D'ÉVOLUTION** | `RELATIONS DE DÉFI ET D'ÉVOLUTION (LA FRICTION SACRÉE)` | Synastrie |
| `relations_decalage` | **RELATIONS DE DÉCALAGE ET DE LIMITES** | `RELATIONS DE DÉCALAGE ET DE LIMITES (L'ART DE LA DISTANCE JUSTE)` | Synastrie |
| `synastrie_couple` | **SYNASTRIE DE COUPLE** | `SYNASTRIE DE COUPLE (L'ALLIANCE DES DESTINÉES)` | Synastrie |
| `relations_karmiques` | **RELATIONS KARMIQUES & LIENS D'ÂMES** | `RELATIONS KARMIQUES & LIENS D'ÂMES (LE RENDEZ-VOUS DES ÂMES)` | Synastrie |
| `theme_enfant` | **THÈME ASTRAL DE L'ENFANT** | `THÈME ASTRAL DE L'ENFANT` | Analyse |
| `cycles_couple` | **CYCLES & ÉVOLUTION DU COUPLE** | `CYCLES & ÉVOLUTION DU COUPLE` | Cycles |

### 📝 Note Importante
Les consultations de synastrie nécessitent les **données de naissance des DEUX personnes**.

---

## 💼 MONDE PROFESSIONNEL

Cette catégorie couvre les **analyses professionnelles et de carrière** : talents, leadership, orientation et synergie d'équipe.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant | Type |
|-----------------|-------|----------------------|------|
| `talents_potentiel` | **TALENTS & POTENTIEL** | `TALENTS & POTENTIEL` | Analyse |
| `leadership_management` | **LEADERSHIP & MANAGEMENT** | `LEADERSHIP & MANAGEMENT` | Analyse |
| `orientation_carriere` | **ORIENTATION DE CARRIÈRE** | `ORIENTATION DE CARRIÈRE` | Analyse |
| `initier_projet` | **INITIER ET LANCER UN PROJET** | `INITIER ET LANCER UN PROJET` | Analyse |
| `leadership_influence` | **LEADERSHIP & INFLUENCE** | `LEADERSHIP & INFLUENCE` | Analyse |
| `synergie_equipe` | **SYNERGIE & ALCHIMIE D'ÉQUIPE** | `SYNERGIE & ALCHIMIE D'ÉQUIPE` | Équipe |

### 📝 Note Importante
La consultation **"SYNERGIE & ALCHIMIE D'ÉQUIPE"** nécessite les **thèmes de tous les membres de l'équipe**.

---

## 🔮 HOROSCOPE

Cette catégorie couvre les **prévisions et trajectoires temporelles** : horoscopes trimestriels et révolution solaire.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant | Période |
|-----------------|-------|----------------------|---------|
| `trimestre_1` | **TA TRAJECTOIRE TRIMESTRIELLE (JANVIER - FÉVRIER - MARS)** | `TA TRAJECTOIRE TRIMESTRIELLE (JANVIER - FÉVRIER - MARS)` | Q1 |
| `trimestre_2` | **LE DÉPLOIEMENT DE TA SÈVE (AVRIL - MAI - JUIN)** | `LE DÉPLOIEMENT DE TA SÈVE (AVRIL - MAI - JUIN)` | Q2 |
| `trimestre_3` | **L'ÉTÉ DE TA MATURATION (JUILLET - AOÛT - SEPTEMBRE)** | `L'ÉTÉ DE TA MATURATION (JUILLET - AOÛT - SEPTEMBRE)` | Q3 |
| `trimestre_4` | **LE BILAN ET LA VISION (OCTOBRE - NOVEMBRE - DÉCEMBRE)** | `LE BILAN ET LA VISION (OCTOBRE - NOVEMBRE - DÉCEMBRE)` | Q4 |
| `revolution_solaire` | **TA RÉVOLUTION SOLAIRE (LE CYCLE DES 7 PHASES)** | `TA RÉVOLUTION SOLAIRE (LE CYCLE DES 7 PHASES)` | Annuel |

### 📝 Note Importante
Les horoscopes trimestriels sont basés sur le **calendrier civil**, tandis que la **révolution solaire** démarre le jour de l'**anniversaire** de la personne.

---

## 🔢 NUMÉROLOGIE - LES NOMBRES PERSONNELS

Cette catégorie couvre les **analyses numériques de la personnalité**.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant |
|-----------------|-------|----------------------|
| `chemin_de_vie` | **LA TRAJECTOIRE DE L'ÂME (NOMBRE DU CHEMIN DE VIE)** | `LA TRAJECTOIRE DE L'ÂME (NOMBRE DU CHEMIN DE VIE)` |
| `nombre_expression` | **LE SOUFFLE DE TON ÊTRE (NOMBRE D'EXPRESSION)** | `LE SOUFFLE DE TON ÊTRE (NOMBRE D'EXPRESSION)` |
| `nombre_ame` | **LE CHANT DU CŒUR (NOMBRE DE L'ÂME)** | `LE CHANT DU CŒUR (NOMBRE DE L'ÂME)` |

### 📝 Données Requises
- **Chemin de Vie** : Date de naissance complète
- **Nombre d'Expression** : Nom(s) et Prénom(s) complets
- **Nombre de l'Âme** : Nom(s) et Prénom(s) complets (calcul sur les voyelles uniquement)

---

## 🔄 NUMÉROLOGIE - LES CYCLES PERSONNELS

Cette catégorie couvre les **prévisions numériques temporelles**.

### ✨ Consultations Disponibles

| ID Consultation | Titre | Prompt Correspondant | Période |
|-----------------|-------|----------------------|---------|
| `annee_personnelle` | **LE CYCLE DES SAISONS (VOTRE ANNÉE PERSONNELLE)** | `LE CYCLE DES SAISONS (VOTRE ANNÉE PERSONNELLE)` | Annuel |
| `mois_personnel` | **LE RYTHME DU MOMENT (VOTRE MOIS PERSONNEL)** | `LE RYTHME DU MOMENT (VOTRE MOIS PERSONNEL)` | Mensuel |
| `jour_personnel` | **LA PULSATION DU JOUR (VOTRE JOUR PERSONNEL)** | `LA PULSATION DU JOUR (VOTRE JOUR PERSONNEL)` | Quotidien |

### 📝 Hiérarchie des Calculs
1. **Année Personnelle** = Jour + Mois de naissance + Année en cours
2. **Mois Personnel** = Année Personnelle + Mois civil en cours
3. **Jour Personnel** = Mois Personnel + Jour calendrier en cours

---

## 🎯 UTILISATION PRATIQUE

### Comment identifier le bon prompt ?

1. **Identifier le choix de consultation** fait par l'utilisateur
2. **Consulter la table de correspondance** dans ce document
3. **Récupérer le nom exact du prompt** correspondant
4. **Chercher le prompt complet** dans le fichier `prompts.txt`
5. **Exécuter le prompt** avec les données de l'utilisateur

### Exemple Pratique

**Scénario** : L'utilisateur demande une consultation sur son **Orientation de Carrière**.

**Étapes** :
1. Identification : `orientation_carriere`
2. Catégorie : **MONDE PROFESSIONNEL**
3. Prompt : `ORIENTATION DE CARRIÈRE`
4. Localisation : Rechercher "LE PROMPT : ORIENTATION DE CARRIÈRE" dans `prompts.txt`
5. Exécution : Remplir les données `[PRÉNOM]`, `[DATE DE NAISSANCE]`, etc.

---

## 📊 STATISTIQUES

- **Total de catégories** : 7
- **Total de consultations** : 59
- **Astrologie** : 45 consultations
- **Numérologie** : 6 consultations
- **Horoscope** : 5 consultations
- **Synastrie/Relations** : 8 consultations

---

## 🔄 MISE À JOUR

**Dernière mise à jour** : 16 janvier 2026

**Maintenance** :
- Si un nouveau prompt est ajouté à `prompts.txt`, ajouter la référence ici
- Si un choix de consultation est créé dans la base de données, créer la correspondance
- Maintenir la cohérence entre les 3 fichiers :
  - `prompts.txt` (le contenu des prompts)
  - `prompts-structure.json` (la structure JSON)
  - `PROMPTS_REFERENCE.md` (cette documentation)

---

## ✅ VALIDATION

Pour vérifier la cohérence de cette structure :

1. Chaque `consultationChoice` doit avoir un `id` unique
2. Chaque `prompt` doit exister dans le fichier `prompts.txt`
3. Les titres doivent correspondre exactement entre JSON et TXT
4. Les types doivent être cohérents (`analyse`, `cycles`, `synastrie`, `previsionnel`, `numerologie`)

---

**📞 Support** : En cas de question ou d'ajout de prompt, maintenir ce document à jour.
