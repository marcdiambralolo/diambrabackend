# 🗺️ CARTE SYSTÈME - GESTION DES PROMPTS

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTÈME DE GESTION DES PROMPTS                    │
│                         Diambra Backend                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         📁 FICHIERS SOURCES                          │
└─────────────────────────────────────────────────────────────────────┘

    prompts.txt                     prompts-structure.json
    ┌──────────────┐               ┌────────────────────┐
    │ LE PROMPT :  │               │ {                  │
    │ MON SIGNE    │◄──────────────┤   "id": "...",    │
    │ SOLAIRE      │   mapping     │   "title": "...", │
    │              │               │   "prompt": "..." │
    │ RÔLE: ...    │               │ }                  │
    │ OBJECTIF: ...│               └────────────────────┘
    │ ...          │
    └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      🎯 ARCHITECTURE LOGIQUE                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                          CATÉGORIES (7)                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. CARTE_DU_CIEL_ET_5_PORTES          [6 consultations]            │
│     ├─ carte_du_ciel_complete                                        │
│     ├─ mon_signe_solaire                                             │
│     ├─ mon_signe_lunaire                                             │
│     ├─ mon_ascendant                                                 │
│     ├─ mon_descendant                                                │
│     └─ mon_milieu_du_ciel                                            │
│                                                                       │
│  2. MA_VIE_PERSONNELLE                 [16 consultations]            │
│     ├─ les_4_piliers                                                 │
│     ├─ mission_de_vie                                                │
│     ├─ rapport_argent                                                │
│     ├─ maniere_aimer                                                 │
│     ├─ darakaraka                                                    │
│     ├─ stress_resilience                                             │
│     ├─ energie_sexuelle                                              │
│     ├─ cycles_saturne                                                │
│     ├─ cycles_jupiter                                                │
│     ├─ retour_mars                                                   │
│     ├─ cycle_uranus                                                  │
│     ├─ cycle_neptune                                                 │
│     ├─ cycle_pluton                                                  │
│     ├─ retour_chiron                                                 │
│     ├─ revelation_talents                                            │
│     ├─ liberation_blessures                                          │
│     └─ analyse_integrale                                             │
│                                                                       │
│  3. FAMILLE_AMITIE_ET_COUPLE           [8 consultations]             │
│     ├─ relations_similitude                                          │
│     ├─ relations_soutien                                             │
│     ├─ relations_defi                                                │
│     ├─ relations_decalage                                            │
│     ├─ synastrie_couple                                              │
│     ├─ relations_karmiques                                           │
│     ├─ theme_enfant                                                  │
│     └─ cycles_couple                                                 │
│                                                                       │
│  4. MONDE_PROFESSIONNEL                [6 consultations]             │
│     ├─ talents_potentiel                                             │
│     ├─ leadership_management                                         │
│     ├─ orientation_carriere                                          │
│     ├─ initier_projet                                                │
│     ├─ leadership_influence                                          │
│     └─ synergie_equipe                                               │
│                                                                       │
│  5. HOROSCOPE                          [5 consultations]             │
│     ├─ trimestre_1                                                   │
│     ├─ trimestre_2                                                   │
│     ├─ trimestre_3                                                   │
│     ├─ trimestre_4                                                   │
│     └─ revolution_solaire                                            │
│                                                                       │
│  6. NUMEROLOGIE_NOMBRES_PERSONNELS     [3 consultations]             │
│     ├─ chemin_de_vie                                                 │
│     ├─ nombre_expression                                             │
│     └─ nombre_ame                                                    │
│                                                                       │
│  7. NUMEROLOGIE_CYCLES_PERSONNELS      [3 consultations]             │
│     ├─ annee_personnelle                                             │
│     ├─ mois_personnel                                                │
│     └─ jour_personnel                                                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      🔄 FLUX D'UTILISATION                           │
└─────────────────────────────────────────────────────────────────────┘

    [1] UTILISATEUR
         │
         │ choisit une consultation
         ▼
    [2] FRONTEND
         │
         │ envoie consultationId + userData
         ▼
    [3] BACKEND (ConsultationsService)
         │
         │ utilise PromptsManager
         ▼
    [4] PromptsManager.getCompletePromptForConsultation()
         │
         ├─► getConsultationChoiceInfo(id)
         │   └─► charge prompts-structure.json
         │       └─► retourne { id, title, prompt, type }
         │
         ├─► getPromptByConsultationId(id)
         │   └─► findPromptByTitle(title)
         │       └─► charge prompts.txt
         │           └─► extrait le contenu du prompt
         │
         └─► fillPromptPlaceholders(prompt, userData)
             └─► remplace [PRÉNOM], [DATE], etc.
                 └─► retourne le prompt complet
         │
         ▼
    [5] API IA (OpenAI / Claude / etc.)
         │
         │ génère la réponse
         ▼
    [6] Retour au FRONTEND
         │
         ▼
    [7] UTILISATEUR reçoit son analyse

┌─────────────────────────────────────────────────────────────────────┐
│                    📊 TYPES DE CONSULTATIONS                         │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   calcul     │ → Génération de la carte du ciel (NASA JPL)
    └──────────────┘

    ┌──────────────┐
    │   analyse    │ → Interprétation d'un aspect du thème
    └──────────────┘

    ┌──────────────┐
    │   cycles     │ → Analyse de cycles planétaires
    └──────────────┘

    ┌──────────────┐
    │  synastrie   │ → Comparaison de 2 thèmes (relations)
    └──────────────┘

    ┌──────────────┐
    │ previsionnel │ → Horoscopes et prévisions temporelles
    └──────────────┘

    ┌──────────────┐
    │ numerologie  │ → Calculs numériques de personnalité
    └──────────────┘

    ┌──────────────┐
    │ num_cycle    │ → Prévisions numériques temporelles
    └──────────────┘

    ┌──────────────┐
    │  complete    │ → Analyse intégrale du thème natal
    └──────────────┘

    ┌──────────────┐
    │   equipe     │ → Synergie de plusieurs personnes
    └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    🔧 OUTILS DISPONIBLES                             │
└─────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────┐
    │  prompts-manager.ts (Utilitaire Principal)         │
    ├────────────────────────────────────────────────────┤
    │                                                     │
    │  ✅ loadPromptsStructure()                         │
    │  ✅ loadPromptsContent()                           │
    │  ✅ findPromptByTitle(title)                       │
    │  ✅ getPromptByConsultationId(id)                  │
    │  ✅ getConsultationChoiceInfo(id)                  │
    │  ✅ getConsultationChoicesByCategory(category)     │
    │  ✅ getAllCategories()                             │
    │  ✅ searchConsultationChoices(keyword)             │
    │  ✅ fillPromptPlaceholders(prompt, userData)       │
    │  ✅ getCompletePromptForConsultation(id, userData) │
    │                                                     │
    └────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────┐
    │  test-prompts.ts (Tests automatiques)              │
    ├────────────────────────────────────────────────────┤
    │                                                     │
    │  ✅ Test de chargement                             │
    │  ✅ Test de recherche                              │
    │  ✅ Test de remplissage                            │
    │  ✅ Test de cohérence                              │
    │  ✅ Statistiques globales                          │
    │                                                     │
    └────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   📝 PLACEHOLDERS SUPPORTÉS                          │
└─────────────────────────────────────────────────────────────────────┘

    [PRÉNOM]              → Sophie
    [PRÉNOM DE LA PERSONNE] → Sophie
    [DATE]                → 15/03/1990
    [DATE DE NAISSANCE]   → 15/03/1990
    [JOUR]                → 15
    [MOIS]                → 03
    [ANNÉE]               → 1990
    [HEURE PRÉCISE]       → 14:30
    [VILLE, PAYS]         → Paris, France
    [LIEU]                → Paris

┌─────────────────────────────────────────────────────────────────────┐
│                      📚 DOCUMENTATION                                │
└─────────────────────────────────────────────────────────────────────┘

    README_PROMPTS.md          Guide d'utilisation complet
    PROMPTS_REFERENCE.md       Documentation de référence détaillée
    SYSTEM_MAP.md              Ce document (vue d'ensemble)

┌─────────────────────────────────────────────────────────────────────┐
│                    ⚡ EXEMPLE D'UTILISATION                          │
└─────────────────────────────────────────────────────────────────────┘

import PromptsManager from './scripts/prompts-manager';

// Récupérer un prompt complet
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
  console.log('Prompt:', result.prompt);
  console.log('Type:', result.info.type);
  
  // Envoyer à l'API IA
  const response = await openai.generate(result.prompt);
  console.log('Résultat:', response);
}

┌─────────────────────────────────────────────────────────────────────┐
│                      🎯 STATISTIQUES FINALES                         │
└─────────────────────────────────────────────────────────────────────┘

    ✅ 7 catégories
    ✅ 47 consultations différentes
    ✅ 47 prompts détaillés
    ✅ 10 types de placeholders
    ✅ 9 types de consultations

┌─────────────────────────────────────────────────────────────────────┐
│                    ✨ POINTS CLÉS DU SYSTÈME                         │
└─────────────────────────────────────────────────────────────────────┘

    1. ✅ CENTRALISATION : Tous les prompts dans un seul fichier
    2. ✅ TRAÇABILITÉ : Chaque consultation a un ID unique
    3. ✅ MAPPING : Structure JSON pour la correspondance
    4. ✅ AUTOMATISATION : Remplissage automatique des variables
    5. ✅ RECHERCHE : Fonction de recherche par mot-clé
    6. ✅ VALIDATION : Tests automatiques de cohérence
    7. ✅ DOCUMENTATION : Guide complet et référence détaillée
    8. ✅ MAINTENABILITÉ : Structure claire et évolutive

┌─────────────────────────────────────────────────────────────────────┐
│                      🔮 ÉVOLUTIONS FUTURES                           │
└─────────────────────────────────────────────────────────────────────┘

    🚀 Internationalisation (FR, EN, ES, etc.)
    🚀 Versioning des prompts
    🚀 A/B testing des formulations
    🚀 Prompts dynamiques basés sur le contexte
    🚀 Cache des prompts fréquemment utilisés
    🚀 Analytics d'utilisation des consultations
    🚀 API REST pour la gestion des prompts

════════════════════════════════════════════════════════════════════════
```
