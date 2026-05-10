#!/bin/bash

# Script de déploiement pour Mon Étoile Backend sur VPS LWS
# Usage: ./deploy-vps.sh

set -e

echo "=================================="
echo "Déploiement Mon Étoile Backend VPS"
echo "=================================="

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction d'erreur
error_exit() {
    echo -e "${RED}❌ Erreur: $1${NC}" 1>&2
    exit 1
}

# 1. Pull dernières modifications
echo -e "\n${BLUE}📥 Pull des dernières modifications...${NC}"
git pull origin main || error_exit "Échec du git pull"

# 2. Installation des dépendances
echo -e "\n${BLUE}📦 Installation des dépendances...${NC}"
npm ci --omit=dev || error_exit "Échec de l'installation des dépendances"

# 3. Build du projet
echo -e "\n${BLUE}🔨 Build du projet...${NC}"
npm run build || error_exit "Échec du build"

# 4. Créer le dossier logs s'il n'existe pas
echo -e "\n${BLUE}📁 Création du dossier logs...${NC}"
mkdir -p logs

# 5. Redémarrer PM2
echo -e "\n${BLUE}🔄 Redémarrage de l'application avec PM2...${NC}"
if pm2 describe mon-etoile-backend > /dev/null 2>&1; then
    echo "Application existante trouvée, redémarrage..."
    pm2 reload ecosystem.config.js --update-env || error_exit "Échec du reload PM2"
else
    echo "Première installation, démarrage de l'application..."
    pm2 start ecosystem.config.js || error_exit "Échec du start PM2"
fi

# 6. Sauvegarder la configuration PM2
echo -e "\n${BLUE}💾 Sauvegarde de la configuration PM2...${NC}"
pm2 save || error_exit "Échec de la sauvegarde PM2"

# 7. Afficher le statut
echo -e "\n${BLUE}📊 Statut de l'application:${NC}"
pm2 status

echo -e "\n${GREEN}✅ Déploiement terminé avec succès!${NC}"
echo -e "${GREEN}API disponible sur: https://diambra.net/api${NC}"

# 8. Afficher les logs
echo -e "\n${BLUE}📋 Derniers logs:${NC}"
pm2 logs mon-etoile-backend --lines 20 --nostream
