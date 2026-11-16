#!/usr/bin/env bash
# One-time preparation of a fresh Amazon Linux 2023 EC2 instance for CertiVault.
# Run as ec2-user:   bash infrastructure/deployment/setup-ec2.sh
set -euo pipefail

echo "==> 1/5  Adding 1 GB swap (helps npm install / builds on 1 GB micro instances)"
if ! sudo swapon --show | grep -q /swapfile; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> 2/5  Installing git, Nginx and build tools"
sudo dnf install -y git nginx gcc-c++ make python3 >/dev/null

echo "==> 3/5  Installing Node.js 22 LTS"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v22'; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - >/dev/null
  sudo dnf install -y nodejs >/dev/null
fi
node -v && npm -v

echo "==> 4/5  Installing PM2 process manager"
sudo npm install -g pm2 >/dev/null
pm2 -v

echo "==> 5/5  Enabling Nginx"
# Amazon Linux's stock nginx.conf declares its own default server on port 80.
# Remove that flag so /etc/nginx/conf.d/certivault.conf becomes the default site.
sudo sed -i 's/ default_server//g' /etc/nginx/nginx.conf
sudo systemctl enable --now nginx

echo
echo "Done. Next: create backend/.env (see documentation/deployment.md), then run"
echo "  bash infrastructure/deployment/deploy.sh"
