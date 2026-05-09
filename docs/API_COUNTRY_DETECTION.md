# API - Gestion du pays lors de la création de consultations

## Endpoints affectés

### POST /consultations

Crée une nouvelle consultation avec détection automatique du pays.

#### Authentification
- **Requise:** Oui
- **Type:** JWT Bearer Token
- **Header:** `Authorization: Bearer <token>`

#### Requête

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Forwarded-For: <ip_address> (optionnel, géré automatiquement)
```

**Body:**
```json
{
  "title": "Ma consultation",
  "description": "Description de la consultation",
  "type": "NUMEROLOGIE",
  "rubriqueId": "ObjectId_de_la_rubrique",
  "formData": {
    "nom": "Dupont",
    "prenoms": "Jean",
    "dateNaissance": "1990-05-15",
    "heureNaissance": "14:30",
    "villeNaissance": "Paris",
    "paysNaissance": "France",
    "genre": "M",
    "email": "jean.dupont@email.com",
    "phone": "+33612345678"
  },
  "status": "PENDING",
  "price": 0,
  "alternatives": [],
  "choice": {
    "title": "Choix de consultation",
    "description": "Description du choix",
    "frequence": "UNE_FOIS_VIE",
    "participants": "SOLO",
    "offering": {
      "alternatives": []
    }
  }
}
```

#### Réponse succès (201)

```json
{
  "success": true,
  "message": "Consultation créée avec succès",
  "id": "507f1f77bcf86cd799439011",
  "consultationId": "507f1f77bcf86cd799439011",
  "clientId": "507f1f77bcf86cd799439012",
  "type": "NUMEROLOGIE",
  "status": "PENDING",
  "title": "Ma consultation",
  "description": "Description de la consultation",
  "country": "France",
  "formData": {
    "nom": "Dupont",
    "prenoms": "Jean",
    "dateNaissance": "1990-05-15T00:00:00.000Z",
    "heureNaissance": "14:30",
    "villeNaissance": "Paris",
    "paysNaissance": "France",
    "genre": "M",
    "email": "jean.dupont@email.com"
  },
  "createdAt": "2026-02-16T12:00:00.000Z",
  "updatedAt": "2026-02-16T12:00:00.000Z"
}
```

**Nouveau champ:** `country` - Le pays détecté lors de la création

#### Réponse erreur (401)

```json
{
  "statusCode": 401,
  "message": "Non autorisé",
  "error": "Unauthorized"
}
```

#### Exemple cURL

```bash
curl -X POST http://localhost:3000/consultations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Consultation test",
    "description": "Test de détection de pays",
    "type": "NUMEROLOGIE",
    "rubriqueId": "6784f6da2b21c929c0baed20",
    "formData": {
      "nom": "Test",
      "prenoms": "Utilisateur",
      "dateNaissance": "1990-01-01",
      "paysNaissance": "Côte d'\''Ivoire"
    },
    "status": "PENDING"
  }'
```

#### Exemple JavaScript (axios)

```javascript
import axios from 'axios';

const createConsultation = async () => {
  try {
    const response = await axios.post(
      'http://localhost:3000/consultations',
      {
        title: 'Ma consultation',
        description: 'Description',
        type: 'NUMEROLOGIE',
        rubriqueId: '6784f6da2b21c929c0baed20',
        formData: {
          nom: 'Dupont',
          prenoms: 'Jean',
          dateNaissance: '1990-05-15',
          paysNaissance: 'France'
        },
        status: 'PENDING'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Pays détecté:', response.data.country);
    console.log('Consultation créée:', response.data.id);
  } catch (error) {
    console.error('Erreur:', error.response?.data);
  }
};
```

## Détection du pays

### Ordre de priorité

Le système utilise la cascade suivante pour déterminer le pays :

1. **IP de la requête** (automatique)
   - Extraction depuis les headers HTTP
   - Gestion des proxies (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
   - Géolocalisation via geoip-lite
   - Mapping vers nom complet du pays

2. **formData.country** (manuel)
   - Si fourni explicitement dans le body

3. **formData.paysNaissance** (fallback)
   - Pays de naissance de l'utilisateur

4. **formData.countryOfBirth** (fallback)
   - Variante anglaise

5. **Valeur par défaut**
   - "Côte d'Ivoire" si aucune détection

### Headers IP supportés

Le service extrait automatiquement l'IP depuis :

```http
X-Forwarded-For: 197.234.221.134, 10.0.0.1
X-Real-IP: 197.234.221.134
CF-Connecting-IP: 197.234.221.134
```

Si aucun header n'est présent, l'IP de connexion directe est utilisée.

### Pays détectables

Le système convertit automatiquement les codes ISO en noms complets :

| Code ISO | Pays |
|----------|------|
| CI | Côte d'Ivoire |
| FR | France |
| US | États-Unis |
| CA | Canada |
| GB | Royaume-Uni |
| DE | Allemagne |
| IT | Italie |
| ES | Espagne |
| BE | Belgique |
| CH | Suisse |
| ML | Mali |
| SN | Sénégal |
| BF | Burkina Faso |
| ... | (voir code source) |

## Requêtes additionnelles

### Filtrer les consultations par pays

```http
GET /consultations?search=France
```

### Obtenir une consultation spécifique

```http
GET /consultations/:id
```

**Réponse :**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Ma consultation",
  "country": "France",
  ...
}
```

## Exemples d'utilisation

### Frontend React

```typescript
const createConsultation = async (consultationData: any) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('http://localhost:3000/consultations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(consultationData)
  });
  
  const result = await response.json();
  console.log('Pays détecté:', result.country);
  return result;
};
```

### Frontend Angular

```typescript
import { HttpClient, HttpHeaders } from '@angular/common/http';

createConsultation(data: any) {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  });
  
  return this.http.post('http://localhost:3000/consultations', data, { headers })
    .pipe(
      tap((response: any) => {
        console.log('Pays détecté:', response.country);
      })
    );
}
```

### Postman

1. Créer une nouvelle requête POST
2. URL: `http://localhost:3000/consultations`
3. Headers:
   - `Authorization`: `Bearer <votre_token>`
   - `Content-Type`: `application/json`
4. Body (raw JSON):
   ```json
   {
     "title": "Test consultation",
     "type": "NUMEROLOGIE",
     "rubriqueId": "...",
     "formData": { ... }
   }
   ```
5. Envoyer la requête
6. Vérifier le champ `country` dans la réponse

## Notes importantes

### En développement local

- L'IP sera probablement `127.0.0.1` ou `::1`
- Ces IPs locales ne sont pas géolocalisables
- Le système utilisera le fallback sur `formData`
- Ou la valeur par défaut "Côte d'Ivoire"

### En production (avec reverse proxy)

Assurez-vous que votre reverse proxy (Nginx, Apache, Cloudflare) transmet les headers d'IP :

**Nginx :**
```nginx
location / {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://backend;
}
```

**Apache :**
```apache
ProxyPass / http://backend/
ProxyPassReverse / http://backend/
RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"
```

### Confidentialité

- L'adresse IP n'est **jamais stockée** en base de données
- Seul le **nom du pays** est enregistré
- Conforme RGPD (pas de données personnelles sensibles)

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Consultation créée |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

## Support et débogage

Pour investiguer les problèmes de détection :

1. Vérifier les logs serveur :
   ```
   [GeolocationService] IP extraite: 197.234.221.134
   [GeolocationService] Pays détecté: Côte d'Ivoire
   ```

2. Tester avec curl et forcer l'IP :
   ```bash
   curl -X POST ... -H "X-Forwarded-For: 8.8.8.8"
   ```

3. Vérifier la base de données :
   ```javascript
   db.consultations.findOne({ _id: ObjectId("...") }, { country: 1 })
   ```

---

**Version API :** 1.0  
**Dernière mise à jour :** Février 2026  
**Base URL :** `http://localhost:3000` (dev) | `https://api.votre-domaine.com` (prod)
