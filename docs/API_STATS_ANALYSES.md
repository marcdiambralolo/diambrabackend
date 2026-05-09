# Endpoints de Statistiques & Analyses – Cosmique Backend

Ce document décrit les nouveaux endpoints d’API REST pour la récupération de statistiques et d’analyses, à destination du développeur front-end.

---

## 1. Statistiques globales

### `GET /stats/overview`
- **Description** : Statistiques globales de la plateforme.
- **Réponse** :
```json
{
  "totalUsers": 1234,
  "totalConsultations": 5678,
  "totalRituels": 234,
  "totalBooksRead": 890,
  "totalOfferingsConsumed": 456,
  "growth": {
    "users": 12,
    "consultations": 34,
    "rituels": 5
  }
}
```

---

## 2. Classements et répartitions

### `GET /stats/top-users`
- **Description** : Top 10 des utilisateurs les plus actifs.
- **Réponse** :
```json
[
  { "userId": "...", "name": "...", "consultations": 42, "rituels": 10, "books": 5 },
  ...
]
```

### `GET /stats/leaderboard/grades`
- **Description** : Répartition des utilisateurs par grade.
- **Réponse** :
```json
[
  { "grade": "Néophyte", "count": 100 },
  { "grade": "Aspirant", "count": 80 },
  ...
]
```

---

## 3. Analyses temporelles

### `GET /stats/consultations/timeline`
- **Description** : Nombre de consultations par période (jour/semaine/mois).
- **Query params** : `period=day|week|month` (défaut: day)
- **Réponse** :
```json
[
  { "date": "2026-02-01", "count": 12 },
  ...
]
```

### `GET /stats/rituals/timeline`
- **Description** : Nombre de rituels réalisés dans le temps.
- **Query params** : `period=day|week|month`
- **Réponse** :
```json
[
  { "date": "2026-02-01", "count": 3 },
  ...
]
```

---

## 4. Analyses par rubrique/thème

### `GET /stats/consultations/by-rubrique`
- **Description** : Nombre de consultations par rubrique.
- **Réponse** :
```json
[
  { "rubriqueId": "...", "rubriqueTitle": "...", "count": 25 },
  ...
]
```

### `GET /stats/books/by-category`
- **Description** : Livres les plus lus par catégorie.
- **Réponse** :
```json
[
  { "category": "Spiritualité", "topBooks": [ { "bookId": "...", "title": "...", "reads": 12 }, ... ] },
  ...
]
```

---

## 5. Statistiques financières/offrandes

### `GET /stats/offerings/summary`
- **Description** : Total des offrandes consommées, achetées, remboursées.
- **Réponse** :
```json
{
  "totalConsumed": 123,
  "totalPurchased": 234,
  "totalRefunded": 12
}
```

### `GET /stats/offerings/top`
- **Description** : Offrandes les plus populaires.
- **Réponse** :
```json
[
  { "offeringId": "...", "title": "...", "consumed": 45 },
  ...
]
```

---

## 6. Progression et engagement utilisateur

### `GET /users/:userId/progress`
- **Description** : Progression détaillée de l’utilisateur vers le prochain grade.
- **Réponse** :
```json
{
  "currentGrade": "Aspirant",
  "nextGrade": "Contemplateur",
  "progress": {
    "consultations": 80,
    "rituels": 60,
    "livres": 100
  },
  "nextGradeRequirements": {
    "consultations": 6,
    "rituels": 2,
    "livres": 1
  }
}
```

### `GET /users/:userId/activity`
- **Description** : Timeline des actions de l’utilisateur.
- **Réponse** :
```json
[
  { "date": "2026-02-01", "type": "consultation", "details": { ... } },
  ...
]
```

---

## 7. Analyses avancées

### `GET /analysis/retention`
- **Description** : Taux de rétention des utilisateurs.
- **Réponse** :
```json
{
  "weeklyRetention": 75,
  "monthlyRetention": 60
}
```

### `GET /analysis/usage-patterns`
- **Description** : Heures et jours de plus forte activité.
- **Réponse** :
```json
{
  "peakHours": ["18:00", "21:00"],
  "peakDays": ["Monday", "Thursday"]
}
```

---

**Contacte le backend pour toute question sur les paramètres ou la structure des réponses.**
