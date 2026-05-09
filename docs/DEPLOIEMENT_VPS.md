# Guide de Déploiement VPS - Mon Étoile Backend

Guide complet pour déployer le backend Mon Étoile sur un VPS LWS avec MongoDB local et PM2.

## 📋 Prérequis sur le VPS

### 1. Node.js et npm
```bash
# Vérifier l'installation
node --version  # v18.x ou supérieur
npm --version
```

### 2. PM2 (Process Manager)
```bash
# Installer PM2 globalement
npm install -g pm2

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

### 3. MongoDB
```bash
# Vérifier que MongoDB est en cours d'exécution
systemctl status mongod

# Démarrer MongoDB si nécessaire
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 4. Nginx (si utilisé comme reverse proxy)
```bash
# Configuration suggérée pour /etc/nginx/sites-available/monetoile.org
server {
    listen 80;
    server_name monetoile.org;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🚀 Installation Initiale

### Étape 1 : Cloner le repository
```bash
# Se connecter au VPS en SSH
ssh user@monetoile.org

# Créer le dossier de l'application
mkdir -p /var/www/mon-etoile-backend
cd /var/www/mon-etoile-backend

# Cloner le repository
git clone https://github.com/ysprod/monetoilebackend.git .
```

### Étape 2 : Configuration de l'environnement
```bash
# Créer le fichier .env
nano .env
```

Variables d'environnement minimales requises :
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/monetoile

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3001
NODE_OPTIONS=--max-old-space-size=512

# API Keys (si nécessaire)
DEEPSEEK_API_KEY=votre_cle_deepseek
OPENAI_API_KEY=votre_cle_openai

# Autres configurations...
```

### Étape 3 : Installation et Build
```bash
# Installer les dépendances de production
npm ci --omit=dev

# Build du projet
npm run build

# Créer le dossier logs
mkdir -p logs
```

### Étape 4 : Démarrage avec PM2
```bash
# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Vérifier le statut
pm2 status
pm2 logs mon-etoile-backend
```

## 🔄 Déploiement des Mises à Jour

### Méthode automatique (recommandée)
```bash
# Sur le VPS, se positionner dans le dossier du projet
cd /var/www/mon-etoile-backend

# Exécuter le script de déploiement
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Méthode manuelle
```bash
cd /var/www/mon-etoile-backend

# 1. Pull les dernières modifications
git pull origin main

# 2. Installer les dépendances
npm ci --omit=dev

# 3. Build
npm run build

# 4. Redémarrer PM2
pm2 reload ecosystem.config.js --update-env

# 5. Vérifier
pm2 status
pm2 logs mon-etoile-backend --lines 50
```

## 📊 Commandes PM2 Utiles

### Gestion de l'application
```bash
# Démarrer
npm run pm2:start

# Arrêter
npm run pm2:stop

# Redémarrer (avec downtime)
npm run pm2:restart

# Recharger (zero-downtime)
npm run pm2:reload

# Supprimer
npm run pm2:delete

# Voir les logs
npm run pm2:logs

# Voir le statut
npm run pm2:status

# Monitoring en temps réel
npm run pm2:monit
```

### Commandes PM2 avancées
```bash
# Voir les logs en temps réel
pm2 logs mon-etoile-backend --lines 100

# Voir les métriques
pm2 show mon-etoile-backend

# Effacer les logs
pm2 flush mon-etoile-backend

# Redémarrer automatiquement si l'app crash
pm2 resurrect
```

## 🔍 Vérification du Déploiement

### Test de l'API
```bash
# Vérifier que l'API répond
curl http://localhost:3001/api/v1/config/stats

# Depuis l'extérieur
curl https://monetoile.org/api/v1/config/stats
```

### Vérifier MongoDB
```bash
# Se connecter à MongoDB
mongosh

# Dans le shell MongoDB
use monetoile
show collections
db.users.countDocuments()
```

### Logs système
```bash
# Logs PM2
tail -f logs/pm2-out.log
tail -f logs/pm2-error.log

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔒 Sécurité

### Firewall
```bash
# Autoriser uniquement les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### SSL avec Let's Encrypt
```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat
sudo certbot --nginx -d monetoile.org -d www.monetoile.org

# Le renouvellement automatique est configuré
sudo certbot renew --dry-run
```

### Permissions
```bash
# S'assurer que les permissions sont correctes
cd /var/www/mon-etoile-backend
chown -R $USER:$USER .
chmod -R 755 .
```

## 📈 Monitoring et Maintenance

### Monitoring avec PM2 Plus (optionnel)
```bash
pm2 link <secret> <public>
```

### Backup MongoDB
```bash
# Créer un script de backup
nano /usr/local/bin/backup-mongodb.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mongodump --db monetoile --out $BACKUP_DIR/backup_$DATE
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Garder uniquement les 7 derniers backups
ls -t $BACKUP_DIR/*.tar.gz | tail -n +8 | xargs -r rm
```

```bash
# Rendre le script exécutable
chmod +x /usr/local/bin/backup-mongodb.sh

# Ajouter un cron job (backup quotidien à 2h du matin)
crontab -e
# Ajouter : 0 2 * * * /usr/local/bin/backup-mongodb.sh
```

### Rotation des logs
PM2 gère automatiquement la rotation des logs, mais vous pouvez configurer :
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
pm2 logs mon-etoile-backend --err

# Vérifier le fichier .env
cat .env

# Vérifier la connexion MongoDB
mongosh mongodb://localhost:27017/monetoile
```

### Erreur de mémoire
```bash
# Le NODE_OPTIONS est déjà configuré dans ecosystem.config.js
# Vérifier la configuration :
cat ecosystem.config.js
```

### Port déjà utilisé
```bash
# Trouver le processus qui utilise le port 3001
sudo lsof -i :3001
sudo netstat -tulpn | grep :3001

# Arrêter PM2 et redémarrer
pm2 delete all
pm2 start ecosystem.config.js
```

## 📞 Support

Pour plus d'informations :
- Documentation NestJS : https://docs.nestjs.com
- Documentation PM2 : https://pm2.keymetrics.io
- Support LWS : https://aide.lws.fr

---

**Dernière mise à jour** : 14 février 2026
**Version** : 1.0.0
