# Endpoints Backend Non Referencies Par Le Frontend

Ce document liste les endpoints backend qui ne sont pas references dans le source frontend actuel `plan-cosmique`.

Perimetre de l'analyse:
- backend inspecte: `backend/src/**/**controller.ts`
- frontend inspecte: `plan-cosmique/**/*.ts`, `plan-cosmique/**/*.tsx`
- exclus: `.next`, `node_modules`, scripts, docs, sorties temporaires

Important:
- "Non reference par le frontend" ne veut pas dire "supprimable sans risque".
- Certains endpoints peuvent encore etre utilises par des webhooks, callbacks serveur, liens de telechargement, outils admin externes ou anciens bundles.

## Endpoints Clairement Non Referencies

### App
- `GET /`
- `GET /status`

Source: `src/app.controller.ts`

### Auth
- `POST /auth/logout`

Source: `src/auth/auth.controller.ts`

### Books
- `GET /books/user/purchases`
- `POST /books/seed`
- `GET /books/ids`

Source: `src/books/books.controller.ts`

### Site Metrics
- `POST /metrics/visit`
- `GET /metrics/visits`

Source: `src/common/site-metrics.controller.ts`

### MoneyFusion
- `POST /moneyfusion/payment`
- `GET /moneyfusion/payment/:token`
- `POST /moneyfusion/webhook`

Source: `src/moneyfusion/moneyfusion.controller.ts`

### Offering Stock
- `POST /offering-stock/increment`
- `POST /offering-stock/decrement`
- `GET /offering-stock/all`

Source: `src/offerings/offering-stock.controller.ts`

### Offerings
- `POST /offerings/bulk-update`

Source: `src/offerings/offerings.controller.ts`

### Grade Evolution
- `GET /admin/grade-evolution`
- `POST /admin/grade-evolution`
- `PATCH /admin/grade-evolution/:id`
- `DELETE /admin/grade-evolution/:id`

Source: `src/grades/grade-evolution-config.controller.ts`

### Grade Config
- `GET /admin/grades/choices-grade-map`

Source: `src/grades/grade-config.controller.ts`

### Services
Le module entier semble non utilise par le frontend actuel:
- `POST /services`
- `GET /services`
- `GET /services/:id`
- `GET /services/slug/:slug`
- `PATCH /services/:id`
- `DELETE /services/:id`
- `POST /services/consultation`
- `GET /services/consultations`
- `GET /services/consultation/:id`
- `PATCH /services/consultation/:id`
- `DELETE /services/consultation/:id`
- `POST /services/offrande`
- `GET /services/offrandes`
- `GET /services/offrande/:id`
- `PATCH /services/offrande/:id`
- `DELETE /services/offrande/:id`
- `POST /services/panier`
- `GET /services/paniers`
- `GET /services/panier/:id`
- `PATCH /services/panier/:id`
- `DELETE /services/panier/:id`
- `POST /services/panier/:panierId/achat`
- `GET /services/panier/:panierId/achats`
- `DELETE /services/panier/:panierId/achat/:achatId`

Source: `src/services/services.controller.ts`

### User Grade Progress
- `GET /user-grade-progress/me`
- `GET /user-grade-progress/:userId`
- `GET /user-grade-progress/:userId/current`
- `POST /user-grade-progress/:userId/:grade`
- `PATCH /user-grade-progress/:userId/:grade/increment`

Source: `src/users/user-grade-progress.controller.ts`

### User Access
- `GET /user-access/subscription-info/:userId`

Source: `src/users/user-access.controller.ts`

### Users
- `GET /users/consultants`
- `GET /users/me/sky-chart`
- `GET /users/count`
- `POST /users`
- `GET /users`
- `PATCH /users/me/password`
- `GET /users/statistics`
- `PATCH /users/:id`
- `PATCH /users/:id/role`
- `DELETE /users/:id`
- `DELETE /users/:id/hard`

Source: `src/users/users.controller.ts`

### Grades
- `GET /grades/consultation-choices/available`

Source: `src/users/grade.controller.ts`

### Admin
- `DELETE /admin/users/:id`

Source: `src/admin/admin.controller.ts`

### Analyses
- `PATCH /analyses/by-consultation/:consultationId/texte`

Source: `src/consultations/analysis.controller.ts`

### Consultation Choice Status
- `GET /consultation-choice-status/:userId/category/:category`

Source: `src/consultations/consultation-choice-status.controller.ts`

### Consultations
- `POST /consultations/personal`
- `GET /consultations/assigned`
- `GET /consultations/statistics`
- `GET /consultations/missing-choice-prompts`
- `POST /consultations/generate-for-rubrique`
- `PUT /consultations/:id`
- `PATCH /consultations/:id/assign/:consultantId`
- `POST /consultations/:id/save-analysis`
- `POST /consultations/:id/generate-analysis`
- `POST /consultations/:id/generate-analysis-user`
- `GET /consultations/:id/generate-analysis`
- `PATCH /consultations/:id/mark-notified`
- `GET /consultations/:id/is-notified`

Source: `src/consultations/consultations.controller.ts`

## Non Referencies Par Le Frontend Mais A Verifier Avant Suppression

Ces endpoints ne sont pas references par le frontend applicatif actuel, mais ils peuvent etre utiles pour des flux serveur, des callbacks, des webhooks ou des liens directs.

### Payments
- `POST /payments/moneyfusion/verify`
- `POST /payments/moneyfusion/callback`
- `POST /payments/moneyfusion/webhook`
- `POST /payments/callback`
- `POST /payments/callback/books`
- `POST /payments`
- `GET /payments`
- `GET /payments/my`
- `GET /payments/statistics`
- `GET /payments/:id`
- `PATCH /payments/:id`
- `POST /payments/process-book`

Source: `src/payments/payments.controller.ts`

### Books
- `GET /books/:bookId/download`

Raison: pas d'appel `api.get(...)` direct trouve dans le frontend, mais l'URL de telechargement est renvoyee par le backend lui-meme.

Source: `src/books/books.controller.ts`

## Endpoints Confirmes Comme Utilises Par Le Frontend

Exemples notables, non exhaustifs:
- `GET /users/me`
- `PATCH /users/me`
- `GET /notifications`
- `GET /config/domaines`
- `GET /config/stats`
- `GET /rubriques`
- `GET /rubriques/:id/choices-with-count`
- `GET /consultations/:id`
- `GET /consultations/:id/analysis-status`
- `GET /consultations/my`
- `POST /consultations`
- `PATCH /consultations/:id`
- `POST /consultations/generate-consultations-for-rubrique`
- `GET /consultations/progress`
- `POST /consultations/:id/generate-analysis-job`
- `GET /consultations/rubrique/:rubriqueId`
- `GET /analyses`
- `POST /analyses`
- `GET /analyses/:id`
- `DELETE /analyses/:id`
- `GET /analyses/by-consultation/:consultationId`
- `GET /analyses/by-choice/:choiceId`
- `GET /offerings`
- `GET /offerings/:id`
- `POST /offerings`
- `PUT /offerings/:id`
- `GET /offering-stock/available`
- `GET /wallet/transactions`
- `POST /wallet/transactions`
- `POST /wallet/offerings/add`
- `POST /wallet/consume-offerings`
- `GET /payments/verify`
- `POST /payments/process-consultation`

## Candidats Prioritaires Pour Un Menage Backend

Ordre recommande d'audit:
1. `src/services/services.controller.ts`
2. `src/users/user-grade-progress.controller.ts`
3. `src/common/site-metrics.controller.ts`
4. `src/grades/grade-evolution-config.controller.ts`
5. Endpoints utilitaires isoles dans `books`, `offerings` et `consultations`
