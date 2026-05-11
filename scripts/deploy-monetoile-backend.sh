
#!/bin/bash
set -euo pipefail
# 0. Vérification outils & espace disque
echo -e "${YELLOW}[0/9] Pré-check outils & espace disque...${NC}"
for cmd in git node npm pm2 mongosh curl; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "  ${RED}❌ $cmd n'est pas installé. Veuillez l'installer.${NC}"
        exit 1
    fi
done
# Vérification espace disque (min 500MB)
MIN_DISK_MB=500
AVAILABLE_MB=$(df "$APP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')
if [[ -z "$AVAILABLE_MB" ]] || (( AVAILABLE_MB < MIN_DISK_MB )); then
    echo -e "  ${RED}❌ Espace disque insuffisant (<${MIN_DISK_MB}MB)${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Pré-check OK${NC}"
echo ""

# Configuration
REPO_URL="https://github.com/ysprod/monetoilebackend.git"
APP_DIR="/var/www/clients/client0/web1/nestapp"
BRANCH="main"
PM2_APP_NAME="monetoile-api"
NODE_ENV="production"

# MongoDB - Utilisez vos identifiants existants
MONGODB_URI="mongodb://monetoile:vJqeFY7KjTi3Gd.@localhost:27017/monetoile?authSource=monetoile"
DEEPSEEK_API_KEY="sk-1203ab61ac8c477898f366625d5863a7"
JWT_SECRET="789cd9716fadb98f49da41076dd7f45a"
PORT="3001"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🚀 DÉPLOIEMENT DU BACKEND Diambra${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Vérification du répertoire
echo -e "${YELLOW}[1/9] Vérification du répertoire...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "  ${RED}❌ Le répertoire $APP_DIR n'existe pas${NC}"
    echo -e "  Création du répertoire..."
    mkdir -p $APP_DIR
else
    echo -e "  ${GREEN}✅ Répertoire trouvé${NC}"
fi
echo ""

# 2. Sauvegarde du .env.production s'il existe
echo -e "${YELLOW}[2/9] Sauvegarde des variables d'environnement...${NC}"
if [ -f "$APP_DIR/.env.production" ]; then
    cp $APP_DIR/.env.production /tmp/.env.backend.backup
    echo -e "  ${GREEN}✅ Fichier .env.production sauvegardé${NC}"
else
    echo -e "  ${YELLOW}⚠️  Pas de fichier .env.production trouvé${NC}"
fi
echo ""

# 3. Récupération du code depuis GitHub
echo -e "${YELLOW}[3/9] Récupération du code depuis GitHub (branche: $BRANCH)...${NC}"

# Sécuriser le dossier pour Git
git config --global --add safe.directory $APP_DIR 2>/dev/null || true

# Vérifier si le dépôt existe
REPO_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://github.com/ysprod/monetoilebackend.git)
if [ "$REPO_CHECK" = "404" ]; then
    echo -e "  ${RED}❌ Dépôt GitHub introuvable !${NC}"
    echo -e "  Vérifiez l'URL: https://github.com/ysprod/monetoilebackend.git"
    exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
    echo -e "  Clone du dépôt (branche $BRANCH)..."
    git clone -b $BRANCH $REPO_URL $APP_DIR
else
    echo -e "  Mise à jour du dépôt existant..."
    cd $APP_DIR
    
    # Forcer le remote à utiliser la bonne URL
    git remote set-url origin $REPO_URL
    
    echo -e "  Fetch des dernières modifications..."
    git fetch --all --prune
    
    echo -e "  Réinitialisation sur la branche $BRANCH..."
    git reset --hard origin/$BRANCH
    
    # Vérifier le dernier commit récupéré
    LATEST_COMMIT=$(git rev-parse --short HEAD)
    echo -e "  ${GREEN}✅ Dernier commit: $LATEST_COMMIT${NC}"
    
    # Afficher les derniers commits
    echo -e "  Derniers commits:"
    git log --oneline -3 | sed 's/^/    /'
fi
echo ""

# 4. Restauration du fichier .env.production
echo -e "${YELLOW}[4/9] Configuration des variables d'environnement...${NC}"
if [ -f "/tmp/.env.backend.backup" ]; then
    cp /tmp/.env.backend.backup $APP_DIR/.env.production
    rm /tmp/.env.backend.backup
    echo -e "  ${GREEN}✅ Fichier .env.production restauré${NC}"
else
    # Créer un fichier .env.production avec les variables actuelles
    cat > $APP_DIR/.env.production <<EOF
PORT=$PORT
MONGODB_URI=$MONGODB_URI
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
EOF
    echo -e "  ${GREEN}✅ Fichier .env.production créé avec les variables actuelles${NC}"
fi
echo ""

# 5. Installation des dépendances
echo -e "${YELLOW}[5/9] Installation des dépendances...${NC}"
cd $APP_DIR
echo -e "  ${YELLOW}🧹 Nettoyage node_modules et dist...${NC}"
rm -rf node_modules dist
if [ -f package-lock.json ]; then
    npm ci --only=production --no-audit --no-fund
else
    npm install --production --no-audit --no-fund
fi
if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✅ Dépendances installées${NC}"
        echo -e "  ${YELLOW}📦 Types installés :${NC}"
        npm list --depth=0 | grep "@types/" | sed 's/^/       /'
        echo -e "  ${YELLOW}🧹 Nettoyage du cache TypeScript...${NC}"
        rm -rf node_modules/.cache/typescript 2>/dev/null || true
else
        echo -e "  ${RED}❌ Erreur lors de l'installation des dépendances${NC}"
        exit 1
fi
TOTAL_PACKAGES=$(npm list --depth=0 | grep -c "@" || echo "0")
echo -e "  ${YELLOW}📦 $TOTAL_PACKAGES packages installés (total)${NC}"
echo ""

# 6. Build de l'application
echo -e "${YELLOW}[6/9] Build de l'application...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ Build réussi${NC}"
else
    echo -e "  ${RED}❌ Erreur lors du build${NC}"
    exit 1
fi
echo ""

# 7. Vérifier que le dossier dist existe
echo -e "${YELLOW}[7/9] Vérification du build...${NC}"
if [ -f "$APP_DIR/dist/src/main.js" ]; then
    echo -e "  ${GREEN}✅ Fichier main.js trouvé dans dist/src/${NC}"
    SCRIPT_PATH="dist/src/main.js"
elif [ -f "$APP_DIR/dist/main.js" ]; then
    echo -e "  ${GREEN}✅ Fichier main.js trouvé dans dist/${NC}"
    SCRIPT_PATH="dist/main.js"
else
    echo -e "  ${RED}❌ Fichier main.js introuvable après build${NC}"
    echo -e "  Contenu de dist:"
    ls -la dist/
    exit 1
fi
echo ""

# 8. Redémarrage avec PM2
echo -e "${YELLOW}[8/9] Redémarrage de l'application avec PM2...${NC}"
# Libérer le port si nécessaire
fuser -k $PORT/tcp 2>/dev/null || true
sleep 2
if pm2 list | grep -q $PM2_APP_NAME; then
    pm2 restart $PM2_APP_NAME --update-env
    echo -e "  ${GREEN}✅ Application redémarrée${NC}"
else
    cd $APP_DIR
    pm2 start $SCRIPT_PATH --name "$PM2_APP_NAME"
    pm2 save
    echo -e "  ${GREEN}✅ Application démarrée${NC}"
fi
echo ""

# 9. Vérification finale
echo -e "${YELLOW}[9/9] Vérification du déploiement...${NC}"
sleep 5

# Test de l'API locale
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/users)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✅ API accessible (HTTP $HTTP_CODE - le 401 est normal, authentification requise)${NC}"
else
    echo -e "  ${RED}❌ API non accessible (HTTP $HTTP_CODE)${NC}"
    pm2 logs $PM2_APP_NAME --lines 20
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ DÉPLOIEMENT DU BACKEND TERMINÉ AVEC SUCCÈS !${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "🌐 Backend: ${GREEN}https://diambra.net/api${NC}"
echo -e "📦 Version: $(cd $APP_DIR && git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
echo -e "📝 Logs: ${YELLOW}pm2 logs $PM2_APP_NAME${NC}"
echo -e "🔄 Re-déployer: ${YELLOW}./deploy-monetoile-backend.sh${NC}"
echo ""
