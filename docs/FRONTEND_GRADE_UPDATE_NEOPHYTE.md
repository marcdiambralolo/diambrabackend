# Ajout du grade "Néophyte" (10 grades)

## Contexte
Le système de progression comporte désormais 10 grades au lieu de 9. Le grade "Néophyte" est ajouté en première position (niveau 0). Tous les seuils, noms, messages et ordres sont mis à jour.

## Modifications à prendre en compte côté front-end

### 1. Enum et ordre des grades
- Nouveau grade : `NEOPHYTE` (clé : 'NEOPHYTE', label : 'Néophyte')
- L'ordre des grades (`GRADE_ORDER`) commence par `NEOPHYTE`, suivi de `ASPIRANT`, puis les autres grades existants.

### 2. Seuils d'accès (`GRADE_REQUIREMENTS`)
- `NEOPHYTE` : consultations = 0, rituels = 0, livres = 0
- Les seuils des autres grades sont inchangés.

### 3. Libellés (`GRADE_NAMES`)
- `NEOPHYTE` : 'Néophyte'
- Les autres labels sont inchangés.

### 4. Messages (`GRADE_MESSAGES`)
- Ajout d'un message d'accueil et de félicitations pour "Néophyte".
- Le message d'accueil d'"Aspirant" mentionne désormais 10 grades.

### 5. Progression utilisateur
- Un nouvel utilisateur commence au grade "Néophyte".
- La progression, les calculs et l'affichage doivent prendre en compte 10 grades.

### 6. UI/UX
- Les listes déroulantes, badges, affichages de progression, etc. doivent afficher 10 grades dans l'ordre, avec "Néophyte" en premier.
- Les composants utilisant `GRADE_ORDER`, `GRADE_NAMES`, ou `Object.keys(GRADE_NAMES)` doivent être vérifiés.

### 7. Références à "9 grades" ou "9 étapes"
- Remplacer toute mention de "9 grades", "neuf grades", "9 étapes" par "10 grades", "dix grades", "10 étapes".

## Fichiers impactés
- `lib/types/grade.types.ts` (enum, ordre, seuils, labels, messages)
- Tous les composants/pages utilisant la liste ou le nombre de grades
- Documentation, tooltips, textes d'aide, etc.

## À faire côté front
- Vérifier l'affichage du grade "Néophyte" partout (profils, progression, admin, dropdowns, etc.)
- Adapter les tests et les valeurs par défaut si besoin
- Mettre à jour la documentation utilisateur si nécessaire

---

**Résumé :**
- 10 grades désormais, "Néophyte" en premier
- Seuils, labels, messages et calculs mis à jour
- Adapter tous les affichages et textes en conséquence
