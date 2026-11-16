#!/usr/bin/env bash
# Builds and (re)deploys CertiVault on the EC2 instance.
# Run from anywhere as ec2-user:   bash ~/certiVault/infrastructure/deployment/deploy.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_ROOT=/var/www/certivault
cd "$REPO_DIR"

if [ ! -f backend/.env ]; then
  echo "✖ backend/.env not found. Create it from backend/.env.example first (documentation/deployment.md, step 4)."
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only || echo "   (skipped: not on a tracking branch)"

echo "==> Backend: install + compile TypeScript"
cd "$REPO_DIR/backend"
npm ci --no-audit --no-fund
npm run build

echo "==> Frontend: install + build"
cd "$REPO_DIR/frontend"
npm ci --no-audit --no-fund
npm run build

echo "==> Publishing frontend to $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r dist/. "$WEB_ROOT/"

echo "==> Installing Nginx site config"
sudo cp "$REPO_DIR/infrastructure/nginx/certivault.conf" /etc/nginx/conf.d/certivault.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> (Re)starting API with PM2"
cd "$REPO_DIR"
pm2 startOrReload infrastructure/deployment/ecosystem.config.cjs --update-env
pm2 save

echo
echo "✔ Deployed. Health check:"
sleep 2
curl -s http://127.0.0.1/api/health || true
echo
