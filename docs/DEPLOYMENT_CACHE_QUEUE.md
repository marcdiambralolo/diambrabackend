# Déploiement Redis et Systèmes de Cache/Queue pour monetoile.org

## Objectif
Mettre en place les services nécessaires pour la gestion du cache et des files d'attente (queue) sur le VPS hébergeant monetoile.org.

---

## 1. Redis (Cache & Queue)

### Déploiement rapide avec Docker
Si vous préférez utiliser Docker pour Redis :
```bash
docker run -d --name monetoile-redis -p 6379:6379 redis:7
```
Vous pouvez ajouter un mot de passe avec :
```bash
docker run -d --name monetoile-redis -p 6379:6379 redis:7 --requirepass <motdepassefort>
```

### Utilisation
- **Cache applicatif** (sessions, données temporaires)
- **Queue** pour la gestion des tâches asynchrones (ex: jobs de génération d'analyse, notifications, etc.)

### Installation (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install redis-server
```

### Configuration
- Fichier principal : `/etc/redis/redis.conf`
- Pour usage production, modifier :
  - `supervised systemd`
  - `bind 127.0.0.1 ::1` (ou IP privée du VPS)
  - `requirepass <motdepassefort>`
- Activer le service :
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Sécurisation
- Changer le mot de passe par défaut
- Désactiver les commandes dangereuses si non utilisées
- Limiter l'accès réseau (firewall)

### Vérification
```bash
redis-cli -a <motdepassefort> ping
# Réponse attendue : PONG
```

---

## 2. Worker d'analyse (queue analysis-generation)

### Lancement du worker
Pour que le système de génération d'analyses fonctionne, il faut lancer le worker dédié :

```bash
npm run worker
# ou
node dist/worker.js
```

### Log attendu dans la console
Lorsque le worker est bien lancé, la console doit afficher :

```bash
[analysis-worker] En écoute sur la queue analysis-generation
```

Cela confirme que le worker est connecté à Redis et prêt à traiter les jobs d'analyse.

## 2. Autres systèmes de cache/queue (optionnel)

### RabbitMQ (si besoin de file d'attente avancée)
```bash
sudo apt install rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo systemctl start rabbitmq-server
```
- Interface web : http://<vps-ip>:15672 (activer avec `rabbitmq-plugins enable rabbitmq_management`)

### Memcached (cache simple, optionnel)
```bash
sudo apt install memcached
sudo systemctl enable memcached
sudo systemctl start memcached
```

---

## 3. Bonnes pratiques
- Sauvegarder régulièrement les données Redis (RDB/AOF)
- Monitorer l'utilisation mémoire et la persistance
- Restreindre l'accès aux ports (firewall, fail2ban)
- Documenter les mots de passe et accès dans un gestionnaire sécurisé

---

## 4. Références
- [Redis Quick Start](https://redis.io/docs/getting-started/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Memcached Documentation](https://memcached.org/)

---

**Contact DevOps si besoin d'intégration avec l'application Node.js/NestJS (voir .env pour les variables de connexion).**
