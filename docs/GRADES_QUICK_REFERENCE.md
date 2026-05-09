# Quick Reference - Grades API

## Base URL
```
http://localhost:3000/admin
```

## Authentication
All requests require JWT token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints Summary

### 1️⃣ List All Grades
```bash
GET /grades
```
Returns: Array of all 9 grades sorted by level

### 2️⃣ Get Single Grade
```bash
GET /grades/{gradeId}
```
Params: `gradeId` - MongoDB ObjectId
Returns: Single grade configuration

### 3️⃣ List Consultation Choices
```bash
GET /consultation-choices
```
Returns: All available consultation choices from all rubriques

### 4️⃣ Update Grade Config
```bash
PATCH /grades/{gradeId}
```
Body:
```json
{
  "consultationChoiceIds": ["id1", "id2"],
  "description": "Updated..."
}
```

### 5️⃣ Update Next Grade
```bash
PATCH /grades/{gradeId}/next-grade
```
Body:
```json
{
}
```

### 6️⃣ Reorder Choices
```bash
PUT /grades/{gradeId}/reorder-choices
```
Body:
```json
{
  "choices": [
    {"choiceId": "choice1", "order": 2},
    {"choiceId": "choice2", "order": 1}
  ]
}
```

---

## Response Format

### Success (200)
```json
{
  "_id": "ObjectId",
  "grade": "ASPIRANT",
  "level": 1,
  "name": "Aspirant",
  "requirements": {
    "consultations": 3,
    "rituels": 1,
    "livres": 1
  },
  "consultationChoices": [...],
  "description": "...",
  "createdAt": "2025-01-18T10:00:00Z",
  "updatedAt": "2025-01-18T10:00:00Z"
}
```

### Errors
```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

---

## HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | ✅ Success |
| 400 | ❌ Bad Request (validation error) |
| 401 | ❌ Unauthorized (no token or invalid) |
| 403 | ❌ Forbidden (not ADMIN role) |
| 404 | ❌ Not Found (grade doesn't exist) |

---

## Test with cURL

### Get all grades
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/grades
```

### Get single grade
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/grades/64abc123
```

### Update
```bash
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"New desc"}' \
  http://localhost:3000/admin/grades/64abc123
```

---

## Data Validation Rules

### Grade Reference
- Must be valid MongoDB ObjectId
- Cannot reference non-existent grade

### Consultation Choices
- Choice IDs must exist in rubriques
- Can be empty array
- Order is auto-calculated (1, 2, 3...)

### Description
- Optional
- Max length: No limit (MongoDB string default)
- Can be empty string ""

---

## Enumeration Values

### Frequence (Consultation Frequency)
- `UNE_FOIS_VIE`
- `ANNUELLE`
- `MENSUELLE`
- `QUOTIDIENNE`
- `LIBRE`

### Participants (Participation Mode)
- `SOLO`
- `AVEC_TIERS`
- `POUR_TIERS`
- `GROUPE`

### Grades (9 Total)
1. ASPIRANT (Level 1)
2. CONTEMPLATEUR (Level 2)
3. CONSCIENT (Level 3)
4. INTEGRATEUR (Level 4)
5. TRANSMUTANT (Level 5)
6. ALIGNE (Level 6)
7. EVEILLE (Level 7)
8. SAGE (Level 8)
9. MAITRE_DE_SOI (Level 9)

---

## Common Errors

### "Le grade ne peut pas pointer vers lui-même"
**Fix:** Use different grade ID

### "Le grade suivant doit être de niveau supérieur"
**Example:** ASPIRANT (1) → CONTEMPLATEUR (2) ✅
**Example:** BRILLANT (2) → ASPIRANT (1) ❌

### "Cycle détecté dans la hiérarchie des grades"
**Cause:** Circular reference (A→B→C→A)

### "Grade ... introuvable"
**Cause:** gradeId doesn't exist
**Fix:** Use GET /grades to list valid IDs

### "Accès réservé aux administrateurs"
**Cause:** User doesn't have ADMIN role
**Fix:** User must have `role: "ADMIN"` or `role: "SUPER_ADMIN"`

---

## TypeScript Types

```typescript
// From src/grades/dto/update-grade-config.dto.ts
interface UpdateGradeConfigDto {
  consultationChoiceIds?: string[];
  description?: string;
}

// From src/grades/schemas/grade-config.schema.ts
interface GradeConfig {
  _id: ObjectId;
  grade: 'ASPIRANT' | 'CONTEMPLATEUR' | ... | 'MAITRE_DE_SOI';
  level: number;
  name: string;
  requirements: {
    consultations: number;
    rituels: number;
    livres: number;
  };
  consultationChoices: GradeConsultationChoice[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Postman Collection (Example)

```
Environment: {{baseUrl}} = http://localhost:3000
            {{token}} = YOUR_JWT_TOKEN

GET {{baseUrl}}/admin/grades
Authorization: Bearer {{token}}

GET {{baseUrl}}/admin/grades/:gradeId
Authorization: Bearer {{token}}

PATCH {{baseUrl}}/admin/grades/:gradeId
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "description": "Updated description"
}
```

---

## Initialization

### Auto-Initialization (on app start)
```
npm start
→ GradeInitializerService triggers
→ All 9 grades created if missing
```

### Manual Seed
```
npm run seed:grades
→ Creates grades
→ Sets up hierarchy chain
```

### Reset All Grades
```
SEED_RESET=true npm run seed:grades
→ Deletes all existing grades
→ Creates new ones from scratch
```

---

## Documentation Files
- 📖 [IMPLEMENTATION_GRADES.md](docs/IMPLEMENTATION_GRADES.md) - Full API documentation
- 📖 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- 🗂️ [src/grades/](src/grades/) - Source code

---

## Links
- Swagger Docs: `http://localhost:3000/api-docs`
- MongoDB Atlas: [dashboard.mongodb.com](https://dashboard.mongodb.com)
- NestJS Docs: [docs.nestjs.com](https://docs.nestjs.com)

