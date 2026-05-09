# API de Statut des Choix de Consultation

## Vue d'ensemble

Cette API permet de déterminer l'état du bouton de consultation pour chaque choix de consultation d'un utilisateur. Le bouton peut avoir 3 états différents selon le statut de la consultation.

## Les 3 États du Bouton

### 1. **CONSULTER**
**Quand :** La consultation n'a pas encore été demandée OU elle n'a pas été finalisée avec une offrande (non payée).

**Signification :** L'utilisateur peut initier une nouvelle consultation pour ce choix.

**Conditions techniques :**
- Aucune consultation n'existe pour ce choix
- OU `consultation.isPaid = false`

---

### 2. **RÉPONSE EN ATTENTE**
**Quand :** La consultation a été finalisée avec l'offrande MAIS l'analyse n'a pas encore été générée et notifiée.

**Signification :** L'utilisateur attend que son analyse soit prête.

**Conditions techniques :**
- `consultation.isPaid = true`
- ET `consultation.analysisNotified = false`

---

### 3. **VOIR L'ANALYSE**
**Quand :** La consultation a été notifiée à l'utilisateur.

**Signification :** L'analyse est disponible et l'utilisateur peut la consulter.

**Conditions techniques :**
- `consultation.isPaid = true`
- ET `consultation.analysisNotified = true`

---

## Endpoints API

### 1. Obtenir le statut d'un choix spécifique

```http
GET /consultation-choice-status/:userId/:choiceId
```

**Paramètres :**
- `userId` (string) : ID de l'utilisateur
- `choiceId` (string) : ID du choix de consultation

**Réponse :**
```json
{
  "choiceId": "507f1f77bcf86cd799439011",
  "choiceTitle": "Thème astral complet",
  "buttonStatus": "CONSULTER",
  "hasActiveConsultation": false,
  "consultationId": null
}
```

**Exemple d'utilisation :**
```typescript
// Frontend
const response = await fetch(`/consultation-choice-status/${userId}/${choiceId}`);
const status = await response.json();

// Afficher le bon bouton
if (status.buttonStatus === 'CONSULTER') {
  // Afficher bouton "CONSULTER"
} else if (status.buttonStatus === 'RÉPONSE EN ATTENTE') {
  // Afficher bouton "RÉPONSE EN ATTENTE" (désactivé ou avec spinner)
} else if (status.buttonStatus === "VOIR L'ANALYSE") {
  // Afficher bouton "VOIR L'ANALYSE"
}
```

---

### 2. Obtenir les statuts de tous les choix d'un utilisateur

```http
GET /consultation-choice-status/:userId
```

**Paramètres :**
- `userId` (string) : ID de l'utilisateur

**Query params optionnels :**
- `choiceIds` (string) : Liste d'IDs de choix séparés par des virgules (ex: `?choiceIds=id1,id2,id3`)

**Réponse :**
```json
{
  "userId": "507f1f77bcf86cd799439012",
  "choices": [
    {
      "choiceId": "507f1f77bcf86cd799439011",
      "choiceTitle": "Thème astral complet",
      "buttonStatus": "CONSULTER",
      "hasActiveConsultation": false
    },
    {
      "choiceId": "507f1f77bcf86cd799439013",
      "choiceTitle": "Numérologie personnelle",
      "buttonStatus": "RÉPONSE EN ATTENTE",
      "hasActiveConsultation": true,
      "consultationId": "507f1f77bcf86cd799439014"
    },
    {
      "choiceId": "507f1f77bcf86cd799439015",
      "choiceTitle": "Compatibilité amoureuse",
      "buttonStatus": "VOIR L'ANALYSE",
      "hasActiveConsultation": true,
      "consultationId": "507f1f77bcf86cd799439016"
    }
  ]
}
```

**Exemple d'utilisation :**
```typescript
// Récupérer tous les statuts
const response = await fetch(`/consultation-choice-status/${userId}`);
const data = await response.json();

// Ou récupérer des choix spécifiques
const specificChoices = await fetch(
  `/consultation-choice-status/${userId}?choiceIds=${choiceId1},${choiceId2}`
);
```

---

### 3. Obtenir les statuts par catégorie

```http
GET /consultation-choice-status/:userId/category/:category
```

**Paramètres :**
- `userId` (string) : ID de l'utilisateur
- `category` (string) : Catégorie de consultation

**Réponse :** Identique à l'endpoint 2, mais filtré par catégorie.

---

## Intégration Frontend

### React / Next.js

```typescript
import { useEffect, useState } from 'react';

interface ConsultationChoiceStatus {
  choiceId: string;
  choiceTitle: string;
  buttonStatus: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | "VOIR L'ANALYSE";
  hasActiveConsultation: boolean;
  consultationId?: string;
}

function ConsultationButton({ userId, choiceId }: { userId: string; choiceId: string }) {
  const [status, setStatus] = useState<ConsultationChoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [userId, choiceId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `/api/consultation-choice-status/${userId}/${choiceId}`
      );
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <button disabled>Chargement...</button>;
  }

  if (!status) {
    return <button disabled>Erreur</button>;
  }

  const handleClick = () => {
    if (status.buttonStatus === 'CONSULTER') {
      // Rediriger vers la page de consultation
      window.location.href = `/consultations/new/${choiceId}`;
    } else if (status.buttonStatus === "VOIR L'ANALYSE") {
      // Rediriger vers la page de l'analyse
      window.location.href = `/consultations/${status.consultationId}/analysis`;
    }
    // Pour "RÉPONSE EN ATTENTE", le bouton est désactivé
  };

  const isDisabled = status.buttonStatus === 'RÉPONSE EN ATTENTE';

  return (
    <button 
      onClick={handleClick}
      disabled={isDisabled}
      className={`consultation-btn ${isDisabled ? 'waiting' : ''}`}
    >
      {status.buttonStatus}
    </button>
  );
}
```

---

### Vue.js

```vue
<template>
  <button
    @click="handleClick"
    :disabled="status?.buttonStatus === 'RÉPONSE EN ATTENTE'"
    class="consultation-btn"
  >
    {{ status?.buttonStatus || 'Chargement...' }}
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  userId: string;
  choiceId: string;
}>();

const status = ref<any>(null);

onMounted(async () => {
  const response = await fetch(
    `/api/consultation-choice-status/${props.userId}/${props.choiceId}`
  );
  status.value = await response.json();
});

const handleClick = () => {
  if (status.value?.buttonStatus === 'CONSULTER') {
    window.location.href = `/consultations/new/${props.choiceId}`;
  } else if (status.value?.buttonStatus === "VOIR L'ANALYSE") {
    window.location.href = `/consultations/${status.value.consultationId}/analysis`;
  }
};
</script>
```

---

## Workflow Backend

### Quand mettre à jour `analysisNotified` ?

Après avoir généré et notifié l'analyse à l'utilisateur, il faut mettre à jour le champ :

```typescript
// Dans le service de consultation
await this.consultationModel.findByIdAndUpdate(
  consultationId,
  { analysisNotified: true },
  { new: true }
);
```

**Où faire cette mise à jour :**
1. Après l'envoi de l'email de notification
2. Après l'envoi de la notification push
3. Après l'enregistrement de l'analyse dans la base de données

---

## Structure de la Base de Données

### Collection: `consultations`

Champs importants pour cette API :

```typescript
{
  _id: ObjectId,
  clientId: ObjectId,        // Référence à l'utilisateur
  choice: {
    _id: string,             // ID du choix de consultation
    title: string,
    // ... autres champs
  },
  isPaid: boolean,           // true si l'offrande a été finalisée
  analysisNotified: boolean, // true si l'analyse a été notifiée
  result: string,            // Contenu de l'analyse
  // ... autres champs
}
```

---

## Tests

### Test manuel avec curl

```bash
# Test 1: Récupérer le statut d'un choix spécifique
curl http://localhost:3000/consultation-choice-status/USER_ID/CHOICE_ID

# Test 2: Récupérer tous les statuts d'un utilisateur
curl http://localhost:3000/consultation-choice-status/USER_ID

# Test 3: Récupérer des choix spécifiques
curl "http://localhost:3000/consultation-choice-status/USER_ID?choiceIds=CHOICE_ID1,CHOICE_ID2"
```

---

## Notes importantes

1. **Performance** : L'endpoint qui récupère tous les statuts fait une requête par choix. Pour une meilleure performance, vous pouvez optimiser en faisant une seule requête à la base de données.

2. **Cache** : Envisagez de mettre en cache les statuts côté frontend pour éviter trop de requêtes.

3. **Websockets** : Pour une expérience en temps réel, vous pouvez implémenter des websockets pour notifier le changement de statut automatiquement.

4. **Sécurité** : Assurez-vous d'ajouter des middlewares d'authentification pour vérifier que l'utilisateur a bien le droit d'accéder à ses propres données.

---

## Migration des données existantes

Si vous avez déjà des consultations sans le champ `analysisNotified`, exécutez cette migration :

```typescript
// Script de migration
await db.consultations.updateMany(
  { analysisNotified: { $exists: false } },
  { $set: { analysisNotified: false } }
);

// Mettre à jour les consultations qui ont déjà un résultat
await db.consultations.updateMany(
  { 
    result: { $exists: true, $ne: null },
    analysisNotified: { $exists: false }
  },
  { $set: { analysisNotified: true } }
);
```
