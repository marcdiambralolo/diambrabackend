# Documentation pour le développeur frontend

## Achat d'un livre avec une offrande

### Flux général
- L'achat d'un livre nécessite désormais une offrande spécifique (champ `offrandeId` dans le livre).
- L'utilisateur doit posséder l'offrande requise dans son wallet.
- Lors de l'achat, l'offrande est consommée (quantité -1).

### Endpoints principaux

#### 1. Liste des livres
- `GET /api/v1/books`
- Réponse :
```json
{
  "success": true,
  "books": [
    {
      "id": "...",
      "title": "...",
      "offrandeId": "...",
      ...
    }
  ]
}
```

#### 2. Détail d'un livre
- `GET /api/v1/books/:bookId`
- Réponse :
```json
{
  "success": true,
  "book": {
    "id": "...",
    "title": "...",
    "offrandeId": "...",
    ...
  }
}
```

#### 3. Achat d'un livre
- `POST /api/v1/books/:bookId/purchase`
- Body :
```json
{
  "userId": "...",
  "paymentId": "...",
  "customerName": "...",
  "customerPhone": "...",
  "customerEmail": "..." // optionnel
}
```
- Réponse :
```json
{
  "success": true,
  "purchased": true,
  "downloadToken": "...",
  "downloadUrl": "/api/v1/books/:bookId/download?token=...",
  "purchase": { ... }
}
```

#### 4. Vérification de l'achat
- `POST /api/v1/books/:bookId/check-purchase`
- Body : `{ "phone": "..." }`
- Réponse :
```json
{
  "success": true,
  "purchased": true,
  "downloadToken": "...",
  "downloadUrl": "/api/v1/books/:bookId/download?token=..."
}
```

#### 5. Téléchargement du livre
- `GET /api/v1/books/:bookId/download?token=...`
- Réponse : fichier PDF

### Points à vérifier côté frontend
- Afficher l'offrande requise pour chaque livre.
- Vérifier que l'utilisateur possède l'offrande avant d'afficher le bouton d'achat.
- Gérer le flux d'achat et de téléchargement selon les réponses ci-dessus.

### Exemple d'intégration
1. Afficher la liste des livres avec leur offrande.
2. Lorsqu'un utilisateur souhaite acheter, vérifier qu'il possède l'offrande.
3. Appeler l'endpoint d'achat.
4. Récupérer le lien de téléchargement.
5. Permettre le téléchargement du PDF.

---
Pour toute question sur l'intégration, contacter l'équipe backend.
