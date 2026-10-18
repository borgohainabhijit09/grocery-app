#!/bin/bash
# Run on the VPS to pull the latest code and restart the app.
# Usage:  bash scripts/deploy.sh
# Or run remotely from your local machine:
#   ssh root@95.111.229.39 "cd /srv/grocery-app && bash scripts/deploy.sh"

set -euo pipefail

APP_DIR="/srv/grocery-app"
cd "$APP_DIR"

echo "===== [1/3] Pull latest code ====="
git pull

echo "===== [2/3] Build images ====="
docker compose -f docker-compose.prod.yml build

echo "===== [3/3] Start / restart services ====="
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo ""
echo "Deploy complete. Container status:"
docker compose -f docker-compose.prod.yml ps
