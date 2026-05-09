# Blog API Documentation

## Endpoints

### 1. Récupérer la liste des articles
- **GET /blog**
- Retourne tous les articles du blog, triés par date de création (plus récent en premier).

### 2. Récupérer le détail d’un article
- **GET /blog/:id**
- Retourne les détails d’un article spécifique (id MongoDB).

### 3. Créer un nouvel article (admin)
- **POST /blog**
- Requiert authentification (JWT).
- Champs : `title`, `content`, `published` (optionnel), `illustration` (fichier image).
- L’illustration est uploadée via le champ `illustration` (multipart/form-data).
- L’URL de l’illustration est enregistrée dans `illustrationUrl`.

### 4. Modifier un article (admin)
- **PUT /blog/:id**
- Requiert authentification (JWT).
- Permet de modifier le contenu, le titre, l’illustration.
- L’illustration peut être remplacée en uploadant un nouveau fichier.

### 5. Supprimer un article (admin)
- **DELETE /blog/:id**
- Requiert authentification (JWT).
- Supprime l’article du blog.

## Modèle Article
- `title` : string (obligatoire)
- `content` : string (obligatoire)
- `illustrationUrl` : string (URL de l’image, optionnel)
- `published` : boolean (par défaut false)
- `createdAt` / `updatedAt` : dates (automatique)

## Upload d’illustration
- Les fichiers sont stockés dans `uploads/blog/`.
- L’URL accessible est `/uploads/blog/<filename>`.

## Sécurité
- Les routes POST, PUT, DELETE sont protégées par JWT (admin).

## Exemple de requête POST (avec illustration)
```bash
curl -X POST http://localhost:3001/api/v1/blog \
  -H "Authorization: Bearer <token>" \
  -F "title=Mon article" \
  -F "content=Contenu de l’article" \
  -F "illustration=@/chemin/vers/image.jpg"
```

## Frontend
- Utilise le service blog pour appeler ces endpoints.
- Pour l’upload, utiliser FormData et envoyer le fichier sous le champ `illustration`.

## Extension
- Possibilité d’ajouter des champs (tags, auteur, etc.)
- Possibilité de gérer la publication (draft/published)

---

Pour toute question ou évolution, voir blog.controller.ts, blog.service.ts, article.schema.ts.
