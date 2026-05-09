# Spécifications pour l’Upload de la Cover et du PDF d’un Livre

## Endpoints concernés
- **Mise à jour d’un livre** : `/api/v1/books/:id` (méthode PUT)

## Format de la requête
- Type : `multipart/form-data`
- Champs attendus :
  - `files` (array) :
    - 1 image (cover) **et/ou** 1 PDF (fichier du livre)
  - Autres champs du livre (titre, auteur, etc.) dans le body

### Exemple de payload (formulaire)
- `files[0]` : image (cover)
- `files[1]` : PDF (livre)
- `title` : "Titre du livre"
- `author` : "Auteur"

## Contraintes sur les fichiers
- **Cover** :
  - Formats acceptés : jpg, jpeg, png, gif, webp, avif
  - Taille max : 50 Mo
- **PDF** :
  - Format accepté : pdf
  - Taille max : 50 Mo

## URLs publiques après upload
- Cover : `https://monetoile.org/uploads/books/covers/<nom-fichier>`
- PDF : `https://monetoile.org/uploads/books/pdfs/<nom-fichier>`

## Réponse de l’API
- Retourne les URLs publiques des fichiers uploadés dans la réponse JSON.

### Exemple de réponse
```json
{
  "message": "Livre mis à jour",
  "coverUrl": "https://monetoile.org/uploads/books/covers/123456789.jpg",
  "pdfUrl": "https://monetoile.org/uploads/books/pdfs/123456789.pdf"
}
```

## Notes importantes
- Le champ `files` peut contenir un ou deux fichiers (cover et/ou PDF).
- Si un seul fichier est envoyé, il sera traité selon son type MIME.
- Les anciens fichiers ne sont pas supprimés automatiquement (à gérer côté backend si besoin).

---

Pour toute question sur l’API ou les formats, contacter l’équipe backend.