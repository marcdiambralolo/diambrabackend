# Installation et Configuration MongoDB pour le Développement

## 📥 Installation sur Windows

### Option 1 : Installer MongoDB Community (recommandé)

1. **Télécharger l'installateur**
   - Allez sur : https://www.mongodb.com/try/download/community
   - Sélectionnez "Windows" et téléchargez le fichier `.msi`

2. **Lancer l'installation**
   - Exécutez le fichier `.msi`
   - Acceptez les conditions
   - Installez MongoDB en tant que service Windows
   - Cela créera un utilisateur par défaut

3. **Vérifier l'installation**
   ```powershell
   mongosh
   ```

### Option 2 : Installer avec Chocolatey (plus rapide)

```powershell
# Si vous avez Chocolatey
choco install mongodb-community -y

# Vérifier l'installation
mongosh
```

## 🔐 Créer l'utilisateur MongoDB pour le développement

Après l'installation, créer un utilisateur avec authentification :

```powershell
# Se connecter à MongoDB (par défaut sans authentification)
mongosh

# Dans le shell MongoDB :
use admin
db.createUser({
  user: "monetoile",
  pwd: "vJqeFY7KjTi3Gd.",
  roles: [
    { role: "readWrite", db: "monetoile" },
    { role: "dbAdmin", db: "monetoile" }
  ]
})

# Vérifier la création
db.getUsers()

# Quitter
exit
```

## ✅ Configurer MongoDB pour démarrer automatiquement

### Windows Service (déjà configuré lors de l'installation)

```powershell
# Vérifier le statut du service
Get-Service MongoDB | Select-Object Name, Status

# Démarrer le service
Start-Service MongoDB

# Arrêter le service
Stop-Service MongoDB

# Redémarrer le service
Restart-Service MongoDB
```

## 🧪 Tester la connexion

```powershell
# Connexion avec authentification
mongosh "mongodb://monetoile:vJqeFY7KjTi3Gd.@localhost:27017/monetoile?authSource=monetoile"

# Ou directement
mongosh
use monetoile
db.auth("monetoile", "vJqeFY7KjTi3Gd.")
```

## 🏃 Démarrer le développement

Une fois MongoDB installé et l'utilisateur créé :

```powershell
# Terminal 1 : Vérifier que MongoDB tourne
mongosh

# Terminal 2 : Lancer l'application NestJS
npm run dev
```

## 🐳 Alternative : Docker MongoDB

Si vous préférez utiliser Docker (plus simple) :

```powershell
# Installer Docker Desktop (si pas déjà fait)
choco install docker-desktop -y

# Lancer MongoDB dans un conteneur
docker run -d `
  --name monetoile-mongodb `
  -e MONGO_INITDB_ROOT_USERNAME=monetoile `
  -e MONGO_INITDB_ROOT_PASSWORD=vJqeFY7KjTi3Gd. `
  -e MONGO_INITDB_DATABASE=monetoile `
  -p 27017:27017 `
  mongo:latest

# Vérifier que c'est en cours d'exécution
docker ps | findstr monetoile-mongodb

# Arrêter le conteneur
docker stop monetoile-mongodb

# Redémarrer le conteneur
docker start monetoile-mongodb
```

## 📊 Commandes MongoDB utiles

```powershell
mongosh

# Se connecter avec authentification
use monetoile
db.auth("monetoile", "vJqeFY7KjTi3Gd.")

# Voir les collections
show collections

# Compter les documents
db.users.countDocuments()

# Voir un document
db.users.findOne()

# Vider une collection
db.users.deleteMany({})

# Quitter
exit
```

## ❌ Dépannage

### MongoDB ne démarre pas
```powershell
# Redémarrer le service
Restart-Service MongoDB

# Vérifier les logs (Windows Event Viewer)
# Ou regarder dans MongoDB log file
```

### Erreur d'authentification
```powershell
# Double-vérifier l'URI MongoDB
# mongodb://USERNAME:PASSWORD@localhost:27017/DATABASE?authSource=admin
```

### Port 27017 déjà utilisé
```powershell
# Trouver le processus
Get-NetTCPConnection -LocalPort 27017 | Select-Object -ExpandProperty OwningProcess

# Tuer le processus (attention!)
Stop-Process -Id <PID> -Force
```

---

**Après installation, relancer :**
```powershell
npm run dev
```

Le backend se connectera normalement à MongoDB ! ✅
