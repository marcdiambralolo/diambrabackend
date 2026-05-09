# Guide d'enregistrement du pays de création d'une consultation

## Vue d'ensemble

Ce guide explique comment le système enregistre automatiquement le pays depuis lequel un utilisateur crée une consultation.

## Fonctionnalités

### 1. Détection automatique du pays

Le système détecte le pays de l'utilisateur lors de la création d'une consultation en utilisant plusieurs méthodes, par ordre de priorité :

1. **Géolocalisation par IP** (prioritaire)
   - Extrait l'adresse IP de la requête HTTP
   - Gère les en-têtes de proxy (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
   - Utilise la bibliothèque `geoip-lite` pour mapper l'IP vers un pays
   - Convertit les codes ISO en noms complets (ex: 'CI' → 'Côte d'Ivoire')

2. **Données du formulaire** (fallback)
   - `formData.country`
   - `formData.countryOfBirth`
   - `formData.paysNaissance`

3. **Valeur par défaut**
   - 'Côte d'Ivoire' si aucune détection n'est possible

### 2. Nouveau champ dans le schéma

Le schéma `Consultation` inclut maintenant un nouveau champ :

```typescript
@Prop({ type: String, default: null })
country: string; // Pays depuis lequel la consultation a été créée
```

## Architecture

### Services

#### GeolocationService

Situé dans : `src/common/services/geolocation.service.ts`

**Méthodes principales :**

- `extractIpAddress(request)` : Extrait l'IP en tenant compte des proxies
- `getCountryFromIp(ip)` : Convertit une IP en nom de pays
- `determineCountry(request, formData)` : Détermination intelligente du pays
- `getCountryName(countryCode)` : Mapping codes ISO → noms complets

**Pays supportés :**
- Côte d'Ivoire, France, États-Unis, Canada, Royaume-Uni
- Allemagne, Italie, Espagne, Belgique, Suisse
- Pays d'Afrique de l'Ouest : Mali, Sénégal, Burkina Faso, Bénin, Togo, Ghana, Nigeria
- Pays d'Afrique Centrale : Cameroun, Gabon, Congo, RDC
- Maghreb : Maroc, Algérie, Tunisie, Égypte

### Modifications dans ConsultationsService

**Signature modifiée :**
```typescript
async create(clientId: string, createConsultationDto: CreateConsultationDto, country?: string)
```

Le service enregistre maintenant le pays détecté dans la consultation :
```typescript
country: finalCountry,
```

### Modifications dans ConsultationsController

**Import ajouté :**
```typescript
import { GeolocationService } from '../common/services/geolocation.service';
```

**Méthode modifiée :**
```typescript
async create(@Body() body: any, @CurrentUser() user: UserDocument, @Req() request: any) {
  // Déterminer le pays depuis l'IP ou les données du formulaire
  const country = this.geolocationService.determineCountry(request, body.formData);
  
  const consultation = await this.consultationsService.create(user._id.toString(), body, country);
  // ...
}
```

## Utilisation

### Création d'une consultation

Lorsqu'un utilisateur crée une consultation via l'endpoint :

```
POST /consultations
```

Le système :
1. Capture automatiquement l'IP de la requête
2. Détermine le pays associé
3. Enregistre le pays dans le champ `country` de la consultation
4. Log l'information dans la console pour le débogage

### Logs

Des logs sont générés pour faciliter le débogage :

```
[GeolocationService] Pays détecté depuis IP 197.234.221.134: Côte d'Ivoire
[GeolocationService] Pays depuis formData.paysNaissance: France
[GeolocationService] Aucun pays détecté, utilisation de la valeur par défaut
```

## Exemples

### Exemple 1 : Détection via IP

Un utilisateur en Côte d'Ivoire crée une consultation :

```javascript
// IP de l'utilisateur : 197.234.221.134
// Le système détecte automatiquement : "Côte d'Ivoire"

{
  _id: "...",
  title: "Ma consultation",
  clientId: "...",
  country: "Côte d'Ivoire", // Détecté automatiquement
  // autres champs...
}
```

### Exemple 2 : Fallback sur formData

Si l'IP est locale ou non détectable :

```javascript
POST /consultations
{
  title: "Ma consultation",
  formData: {
    nom: "Dupont",
    prenoms: "Jean",
    paysNaissance: "France"
  }
}

// Résultat :
{
  _id: "...",
  country: "France", // Depuis formData
  // autres champs...
}
```

### Exemple 3 : Valeur par défaut

Si aucune détection n'est possible :

```javascript
{
  _id: "...",
  country: "Côte d'Ivoire", // Valeur par défaut
  // autres champs...
}
```

## Requêtes MongoDB

### Filtrer par pays

```javascript
// Toutes les consultations depuis la France
db.consultations.find({ country: "France" })

// Grouper par pays
db.consultations.aggregate([
  {
    $group: {
      _id: "$country",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
])
```

### Statistiques par pays

```javascript
// Nombre de consultations par pays
const stats = await consultationModel.aggregate([
  {
    $group: {
      _id: "$country",
      total: { $sum: 1 }
    }
  }
]);
```

## Tests

### Test local

Pour tester en local (où l'IP est 127.0.0.1) :

1. Le système détectera l'IP locale
2. Tentera le fallback sur formData
3. Utilisera la valeur par défaut : "Côte d'Ivoire"

### Test en production

Sur un serveur avec Nginx ou un reverse proxy, assurez-vous que les en-têtes suivants sont transmis :

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## Dépendances

```json
{
  "geoip-lite": "^1.4.10"
}
```

Installation :
```bash
npm install geoip-lite
```

## Configuration supplémentaire

### Ajouter plus de pays

Modifiez la méthode `getCountryName()` dans `GeolocationService` :

```typescript
private getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'CI': 'Côte d\'Ivoire',
    'FR': 'France',
    'YOUR_CODE': 'Votre Pays',
    // ...
  };
  return countryMap[countryCode] || countryCode;
}
```

### Désactiver la détection IP

Si vous souhaitez uniquement utiliser les données du formulaire :

```typescript
// Dans consultations.controller.ts
const country = body.formData?.paysNaissance || 'Côte d\'Ivoire';
```

## Sécurité et confidentialité

- L'adresse IP n'est **pas stockée** dans la base de données
- Seul le **nom du pays** est enregistré
- La géolocalisation est effectuée **côté serveur**
- Les IP locales sont automatiquement ignorées

## Migration des données existantes

Pour les consultations existantes sans champ `country`, vous pouvez exécuter :

```javascript
// Mettre à jour toutes les consultations sans pays
db.consultations.updateMany(
  { country: null },
  { 
    $set: { 
      country: "$formData.paysNaissance" 
    } 
  }
);

// Valeur par défaut pour celles sans paysNaissance
db.consultations.updateMany(
  { country: null },
  { 
    $set: { 
      country: "Côte d'Ivoire" 
    } 
  }
);
```

## Référence API

### Endpoint : POST /consultations

**Corps de la requête :**
```typescript
{
  title: string;
  description: string;
  type: ConsultationType;
  formData?: {
    country?: string;
    paysNaissance?: string;
    countryOfBirth?: string;
    // autres champs...
  };
  // autres champs...
}
```

**Réponse :**
```typescript
{
  success: true,
  message: "Consultation créée avec succès",
  id: string,
  consultationId: string,
  country: string, // Pays détecté/enregistré
  // autres champs...
}
```

## Maintenance

### Mise à jour de la base GeoIP

La bibliothèque `geoip-lite` met à jour automatiquement sa base de données. Pour une mise à jour manuelle :

```bash
npm update geoip-lite
```

### Logs de débogage

Pour activer plus de logs :

```typescript
// Dans geolocation.service.ts
console.log('[GeolocationService] IP extraite:', ip);
console.log('[GeolocationService] Données geo:', geo);
```

## Support

En cas de problème :
1. Vérifiez les logs du serveur
2. Vérifiez que `geoip-lite` est installé
3. Testez avec une IP publique (pas 127.0.0.1)
4. Vérifiez les en-têtes de la requête HTTP

---

**Dernière mise à jour :** Février 2026  
**Version :** 1.0
