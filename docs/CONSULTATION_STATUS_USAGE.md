# Exemple d'Utilisation - Statuts de Consultation

## 🎯 Endpoint Backend

```
GET /api/v1/consultation-choice-status/:userId/:choiceId
```

## 📝 Réponse de l'API

```typescript
interface ConsultationChoiceStatusDto {
  choiceId: string;
  choiceTitle: string;
  buttonStatus: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | 'VOIR L\'ANALYSE';
  hasActiveConsultation: boolean;
  consultationId: string | null;
}
```

## 🔧 Exemples de Réponses

### Cas 1: Aucune consultation (CONSULTER)
```json
{
  "choiceId": "694cde9bde3392d3751a0fee",
  "choiceTitle": "Consultation Amoureuse",
  "buttonStatus": "CONSULTER",
  "hasActiveConsultation": false,
  "consultationId": null
}
```

### Cas 2: Consultation payée, analyse en attente
```json
{
  "choiceId": "694cde9bde3392d3751a0fee",
  "choiceTitle": "Consultation Amoureuse",
  "buttonStatus": "RÉPONSE EN ATTENTE",
  "hasActiveConsultation": true,
  "consultationId": "507f1f77bcf86cd799439099"
}
```

### Cas 3: Analyse disponible
```json
{
  "choiceId": "694cde9bde3392d3751a0fee",
  "choiceTitle": "Consultation Amoureuse",
  "buttonStatus": "VOIR L'ANALYSE",
  "hasActiveConsultation": true,
  "consultationId": "507f1f77bcf86cd799439099"
}
```

## 💻 Utilisation dans le Frontend React/Next.js

### Hook personnalisé
```typescript
// hooks/useConsultationStatus.ts
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';

interface ConsultationStatus {
  choiceId: string;
  choiceTitle: string;
  buttonStatus: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | 'VOIR L\'ANALYSE';
  hasActiveConsultation: boolean;
  consultationId: string | null;
}

export function useConsultationStatus(userId: string, choiceId: string) {
  const [status, setStatus] = useState<ConsultationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(
          `/consultation-choice-status/${userId}/${choiceId}`
        );
        setStatus(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la récupération du statut');
      } finally {
        setLoading(false);
      }
    };

    if (userId && choiceId) {
      fetchStatus();
    }
  }, [userId, choiceId]);

  return { status, loading, error };
}
```

### Composant Bouton de Consultation
```typescript
// components/ConsultationButton.tsx
import { useRouter } from 'next/navigation';
import { useConsultationStatus } from '@/hooks/useConsultationStatus';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Eye } from 'lucide-react';

interface ConsultationButtonProps {
  userId: string;
  choiceId: string;
  className?: string;
}

export function ConsultationButton({ 
  userId, 
  choiceId, 
  className 
}: ConsultationButtonProps) {
  const router = useRouter();
  const { status, loading, error } = useConsultationStatus(userId, choiceId);

  if (loading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Chargement...
      </Button>
    );
  }

  if (error || !status) {
    return (
      <Button disabled variant="destructive" className={className}>
        Erreur
      </Button>
    );
  }

  const handleClick = () => {
    switch (status.buttonStatus) {
      case 'CONSULTER':
        // Rediriger vers la page de création de consultation
        router.push(`/consultation/new/${choiceId}`);
        break;

      case 'RÉPONSE EN ATTENTE':
        // Afficher un message ou désactiver le bouton
        // Optionnel: rediriger vers une page de suivi
        alert('Votre analyse est en cours de préparation. Vous serez notifié dès qu\'elle sera prête.');
        break;

      case 'VOIR L\'ANALYSE':
        // Rediriger vers la page de visualisation de l'analyse
        router.push(`/consultation/${status.consultationId}`);
        break;
    }
  };

  const getButtonConfig = () => {
    switch (status.buttonStatus) {
      case 'CONSULTER':
        return {
          text: 'CONSULTER',
          variant: 'default' as const,
          icon: null,
          disabled: false,
        };

      case 'RÉPONSE EN ATTENTE':
        return {
          text: 'RÉPONSE EN ATTENTE',
          variant: 'secondary' as const,
          icon: <Clock className="mr-2 h-4 w-4" />,
          disabled: true,
        };

      case 'VOIR L\'ANALYSE':
        return {
          text: 'VOIR L\'ANALYSE',
          variant: 'success' as const,
          icon: <Eye className="mr-2 h-4 w-4" />,
          disabled: false,
        };

      default:
        return {
          text: 'CONSULTER',
          variant: 'default' as const,
          icon: null,
          disabled: false,
        };
    }
  };

  const config = getButtonConfig();

  return (
    <Button
      onClick={handleClick}
      variant={config.variant}
      disabled={config.disabled}
      className={className}
    >
      {config.icon}
      {config.text}
    </Button>
  );
}
```

### Utilisation dans une page
```typescript
// app/consultations/[rubriqueId]/page.tsx
import { ConsultationButton } from '@/components/ConsultationButton';
import { useAuth } from '@/hooks/useAuth';

export default function RubriquePage({ params }: { params: { rubriqueId: string } }) {
  const { user } = useAuth();
  const [choices, setChoices] = useState([]);

  // Récupérer les choix de consultation pour cette rubrique
  // ...

  return (
    <div className="grid gap-4">
      {choices.map((choice) => (
        <div key={choice._id} className="card">
          <h3>{choice.title}</h3>
          <p>{choice.description}</p>
          
          <ConsultationButton
            userId={user._id}
            choiceId={choice._id}
            className="w-full mt-4"
          />
        </div>
      ))}
    </div>
  );
}
```

## 🧪 Test de l'Endpoint

```bash
# Tester l'endpoint avec un script Node.js
node scripts/test-consultation-status.js <userId> <choiceId>

# Exemple
node scripts/test-consultation-status.js 507f1f77bcf86cd799439011 694cde9bde3392d3751a0fee
```

## 📌 Points Importants

1. **Rafraîchissement**: Le statut doit être rafraîchi après :
   - Le paiement d'une offrande
   - La réception d'une notification d'analyse

2. **UX**: Pour "RÉPONSE EN ATTENTE" :
   - Désactiver le bouton
   - Afficher une icône de chargement/horloge
   - Afficher un tooltip informatif

3. **Sécurité**: Côté frontend, vérifier que le `userId` correspond bien à l'utilisateur connecté

4. **Performance**: Si vous affichez beaucoup de choix, utilisez l'endpoint batch :
   ```
   GET /api/v1/consultation-choice-status/:userId?choiceIds=id1,id2,id3
   ```
