# Endpoint : Mapping des choix de consultation vers leur grade

Ce document explique comment utiliser l'endpoint public permettant de récupérer, pour chaque choix de consultation, le grade auquel il appartient. Ce mapping permet d'afficher le grade sous chaque choix dans l'interface front-end.

## Endpoint

```
GET /admin/grades/choices-grade-map
```

- **Accès** : Public (pas besoin d'être authentifié)
- **URL complète** : `/admin/grades/choices-grade-map`
- **Méthode** : GET

## Réponse

La réponse est un objet JSON dont chaque clé est un `choiceId` (string), et la valeur associée est un objet contenant :
- `grade` : le code du grade (ex : "NEOPHYTE", "ASPIRANT", ...)
- `gradeName` : le nom lisible du grade (ex : "Néophyte", "Aspirant", ...)
- `level` : le niveau numérique du grade (0 = plus bas, croissant)

### Exemple de réponse

```json
{
  "65e3c1...": {
    "grade": "NEOPHYTE",
    "gradeName": "Néophyte",
    "level": 0
  },
  "65e3c2...": {
    "grade": "ASPIRANT",
    "gradeName": "Aspirant",
    "level": 1
  }
  // ...
}
```

## Utilisation côté front-end

- Pour chaque choix de consultation affiché, utilisez son `choiceId` pour retrouver dans la réponse le grade associé.
- Affichez le nom du grade (`gradeName`) ou le code (`grade`) sous le choix, selon le besoin UX.
- Le mapping est complet et à jour à chaque appel.

## Remarques
- Si un `choiceId` n'est pas présent dans la réponse, il n'est associé à aucun grade.
- L'endpoint est optimisé pour être appelé une fois au chargement ou lors d'un rafraîchissement des choix.

---

Pour toute question ou besoin d'évolution, contactez l'équipe backend.