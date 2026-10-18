#!/bin/bash
# Add grocery-app to an existing VPS that already runs Docker + Nginx.
# Run as root: bash scripts/vps-setup.sh

set -euo pipefail

DOMAIN="grocery-app.sygmiainnovative.co.in"
REPO_URL="https://github.com/borgohainabhijit09/grocery-app.git"
APP_DIR="/srv/grocery-app"
EMAIL="admin@sygmiainnovative.co.in"

echo "===== [1/3] Clone repository ====="
if [ -d "$APP_DIR/.git" ]; then
  echo "  Repo already exists — pulling latest"
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "===== [2/3] Add Nginx site ====="
cp "$APP_DIR/nginx/app.conf" /etc/nginx/sites-available/grocery-app
ln -sf /etc/nginx/sites-available/grocery-app /etc/nginx/sites-enabled/grocery-app
nginx -t
systemctl reload nginx

echo "===== [3/3] SSL certificate (Let's Encrypt) ====="
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo ""
echo "======================================================"
echo "  Site added! grocery-app.sygmiainnovative.co.in"
echo "======================================================"
echo ""
echo "Next steps:"
echo "  1. cd $APP_DIR"
echo "  2. cp .env.example .env"
echo "  3. nano .env   <- fill in:"
echo "       POSTGRES_PASSWORD=<strong-password>"
echo "       NEXTAUTH_SECRET=<run: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\">"
echo "       AUTH_SECRET=<same or different 32-byte value>"
echo "       NEXTAUTH_URL=https://$DOMAIN"
echo "       NEXT_PUBLIC_APP_URL=https://$DOMAIN"
echo "       NEXT_PUBLIC_API_URL=https://$DOMAIN"
echo "  4. bash scripts/deploy.sh"
echo ""
