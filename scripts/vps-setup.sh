#!/bin/bash
# One-time setup for a fresh Ubuntu 24.04 VPS.
# Run as root: bash scripts/vps-setup.sh <YOUR_DOMAIN> <GITHUB_REPO_URL>
# Example: bash scripts/vps-setup.sh app.example.com https://github.com/you/grocery-app.git

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <github-repo-url>}"
REPO_URL="${2:?Usage: $0 <domain> <github-repo-url>}"
APP_DIR="/srv/grocery-app"
EMAIL="admin@${DOMAIN}"   # used for Let's Encrypt expiry notices

echo "===== [1/6] System update ====="
apt-get update -y && apt-get upgrade -y

echo "===== [2/6] Install Docker ====="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

echo "===== [3/6] Install Nginx + Certbot ====="
apt-get install -y nginx certbot python3-certbot-nginx

echo "===== [4/6] Clone repository ====="
if [ -d "$APP_DIR/.git" ]; then
  echo "  Repo already exists — pulling latest"
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "===== [5/6] Configure Nginx ====="
cp "$APP_DIR/nginx/app.conf" /etc/nginx/sites-available/grocery-app
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/grocery-app
ln -sf /etc/nginx/sites-available/grocery-app /etc/nginx/sites-enabled/grocery-app
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "===== [6/6] SSL certificate (Let's Encrypt) ====="
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo ""
echo "======================================================"
echo "  VPS setup complete!"
echo "======================================================"
echo ""
echo "Next steps:"
echo "  1. cd $APP_DIR"
echo "  2. cp .env.example .env"
echo "  3. nano .env   ← fill in POSTGRES_PASSWORD, NEXTAUTH_SECRET, AUTH_SECRET,"
echo "                     NEXTAUTH_URL=https://$DOMAIN, NEXT_PUBLIC_APP_URL=https://$DOMAIN"
echo "  4. bash scripts/deploy.sh"
echo ""
