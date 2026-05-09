# Automatisation des Grades et Profils Utilisateurs

## 1. Ajout des constantes de progression de grade
- Création du fichier `src/users/grade.constants.ts` contenant :
  - Les conditions d'accès à chaque grade (consultations, rituels, livres).
  - Les labels des 9 grades initiatiques.

## 2. Extension du modèle utilisateur
- Le schéma `User` (déjà existant) contient :
  - Les compteurs : `consultationsCompleted`, `rituelsCompleted`, `booksRead`.
  - Le champ `grade` (enum UserGrade).
  - Les champs de gestion d'abonnement : `userType`, `premiumRubriqueId`, `subscriptionStartDate`, `subscriptionEndDate`.

## 3. Service d'automatisation
- Ajout d'une méthode `updateUserGradeAndProfile(userId)` dans `users.service.ts` qui :
  - Met à jour le type utilisateur (BASIQUE, PREMIUM, INTEGRAL) selon la date d'expiration d'abonnement.
  - Calcule le grade atteint selon les compteurs et les conditions de `grade.constants.ts`.
  - Met à jour le champ `grade` et la date de changement de grade.
  - (Prévu : envoi de notification et message de félicitations lors d'une montée de grade.)

## 4. Endpoint d'automatisation
- Ajout d'un endpoint PATCH `/users/:id/auto-grade` dans `users.controller.ts` :
  - Accessible aux admins avec la permission `UPDATE_ANY_USER`.
  - Appelle la méthode d'automatisation pour mettre à jour grade et profil utilisateur.

## 5. Build, commit et push
- Build du projet sans erreur.
- Commit et push sur git avec le message :
  - `feat: auto grade and profile automation for users`

## 6. Utilisation
- Pour automatiser la progression de grade et la gestion du profil utilisateur, appeler l'endpoint PATCH `/users/:id/auto-grade`.
- Le grade et le profil sont mis à jour selon les règles métier décrites dans le fichier `grade.constants.ts`.

---

**Ce système permet une gestion centralisée, traçable et évolutive des grades et profils utilisateurs, conforme à la logique métier fournie.**
