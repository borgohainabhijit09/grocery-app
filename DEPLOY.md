# Deploying Fresh Basket

Live at **https://fresh-basket.abhijitborgohain.online**

There are two supported ways to run this stack. The VPS uses the **shared-host**
setup below; the standalone compose file is kept for single-purpose servers.

| | Shared host (current VPS) | Standalone |
|---|---|---|
| Compose file | `deploy/vps/compose.yml` | `docker-compose.prod.yml` |
| Owner of :80/:443 | existing `edge-caddy` | bundled `caddy` service |
| Networks | `grocery-app-internal` + external `edge` | internal only |

---

# 1. Shared host (`/opt/stacks`)

The VPS hosts several projects under `/opt/stacks`, with one shared reverse
proxy (`edge-caddy`) that owns ports 80/443 and terminates TLS for every domain.

```
/opt/stacks/
├── edge/                 # shared ingress — owns :80/:443
│   ├── compose.yml
│   └── caddy/Caddyfile   # one block per domain
├── easy-stay/
├── hasty-tasty/
└── grocery-app/          # this project
    ├── compose.yml       # = deploy/vps/compose.yml
    ├── .env              # secrets, chmod 600
    ├── ADMIN_CREDENTIALS.txt
    └── app/              # git checkout of this repository
```

Isolation rules (non-negotiable on this host):

- **Only `edge-caddy` publishes host ports.** This stack publishes none — it
  exposes `3000` on the internal Docker network only.
- Each project gets its own private network (`grocery-app-internal`), its own
  volume (`grocery-app_pgdata`), and its own containers
  (`grocery-app-web`, `grocery-app-db`).
- The web container joins the shared external `edge` network so Caddy can reach
  it by name. The database never joins `edge`.

## 1.1 One-time server setup

```bash
# repo checkout
mkdir -p /opt/stacks/grocery-app && cd /opt/stacks/grocery-app
git clone https://github.com/borgohainabhijit09/grocery-app.git app

# stack definition + secrets
cp app/deploy/vps/compose.yml ./compose.yml
cp app/.env.production.example ./.env    # then edit (see below)
chmod 600 .env
```

`.env` must contain at minimum:

```ini
DB_USER="postgres"
DB_PASSWORD="<openssl rand -hex 24>"
DB_NAME="grocery"

NEXTAUTH_URL="https://fresh-basket.abhijitborgohain.online"
NEXT_PUBLIC_APP_URL="https://fresh-basket.abhijitborgohain.online"
NEXT_PUBLIC_API_URL="https://fresh-basket.abhijitborgohain.online"
NEXTAUTH_SECRET="<openssl rand -base64 32>"   # also used as AUTH_SECRET

SEED_ADMIN_EMAIL="admin@abhijitborgohain.online"
SEED_ADMIN_PASSWORD="<strong password>"
SEED_DEMO_USERS="false"
```

Validate before starting anything:

```bash
docker compose config -q && echo OK
```

## 1.2 Build the image (not on the VPS)

The VPS has **~900 MiB RAM**, which is not enough for `next build`. Build on a
machine with Docker and transfer the image:

```bash
# on the build machine
docker buildx build --platform linux/amd64 --provenance=false --sbom=false \
  --target runner \
  --build-arg NEXT_PUBLIC_APP_URL=https://fresh-basket.abhijitborgohain.online \
  --build-arg NEXT_PUBLIC_API_URL=https://fresh-basket.abhijitborgohain.online \
  -t grocery-app/web:2026.11.18 --load .

docker save grocery-app/web:2026.11.18 -o grocery-web.tar
gzip -k grocery-web.tar
scp grocery-web.tar.gz ubuntu@<vps>:/tmp/

# on the VPS
gunzip -c /tmp/grocery-web.tar.gz | docker load
rm -f /tmp/grocery-web.tar*
```

> `NEXT_PUBLIC_*` values are inlined at build time (`robots.txt`, `sitemap`,
> metadata), so rebuild if the domain ever changes.

## 1.3 Database, migrations, seed

Migrations are not run from the server (the `migrate` service is profile-gated
as `tools` and needs the memory-heavy builder stage). Run them from a machine
that can reach the DB through an SSH tunnel:

```bash
# terminal 1 — tunnel to the database container
DB_IP=$(ssh ubuntu@<vps> "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' grocery-app-db" | tr -d ' ')
ssh -N -L 15460:$DB_IP:5432 ubuntu@<vps>

# terminal 2 — from the repo root
export DATABASE_URL="postgresql://postgres:<DB_PASSWORD from .env>@localhost:15460/grocery?schema=public"
export DIRECT_URL="$DATABASE_URL"

npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

export SEED_ADMIN_EMAIL="admin@abhijitborgohain.online"
export SEED_ADMIN_PASSWORD="<same value as in .env>"
export SEED_DEMO_USERS="false"
npm run db:seed
```

The seed is idempotent: it upserts categories, products, variants, delivery
slots, coupons and store settings, and (re)sets the admin account. Re-running it
with a new `SEED_ADMIN_PASSWORD` rotates the admin password.

Seed contents: 7 categories, 16 products, 20 variants, 1 admin user, store
settings. `SEED_DEMO_USERS=false` skips the staff/delivery/demo-customer accounts
that ship with publicly known passwords.

## 1.4 Start the app

```bash
cd /opt/stacks/grocery-app
docker compose up -d db          # wait for healthy
docker compose up -d web         # uses the imported image; does not rebuild
docker compose ps
```

## 1.5 Publish the domain

Add one block to the shared Caddyfile — nothing else on the host changes:

```bash
sudo cp /opt/stacks/edge/caddy/Caddyfile /opt/stacks/edge/caddy/Caddyfile.bak
sudo tee -a /opt/stacks/edge/caddy/Caddyfile >/dev/null <<'EOF'

# ── Fresh Basket ─────────────────────────────────────────────
fresh-basket.abhijitborgohain.online {
    encode zstd gzip
    reverse_proxy grocery-app-web:3000
}
EOF

docker exec edge-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec -w /etc/caddy edge-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

`caddy reload` is graceful — the existing sites keep serving during the swap.
Certificates are issued automatically over TLS-ALPN-01 (requires DNS → this VPS
and port 443 open).

---

# 2. Standalone host (`docker-compose.prod.yml`)

For a VPS that does **not** already have a reverse proxy:

```bash
git clone https://github.com/borgohainabhijit09/grocery-app.git
cd grocery-app
cp .env.production.example .env      # fill in every value
docker compose -f docker-compose.prod.yml config > /dev/null && echo OK
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm migrate npm run db:seed
```

```
Internet ──► Caddy (80/443) ──► web (Next.js :3000) ──► db (Postgres 16)
                                   └─ migrate (one-shot, runs first)
```

---

# 3. Verification

```bash
curl -fsS https://fresh-basket.abhijitborgohain.online/api/health
# {"ok":true,"service":"grocery-web","version":"0.1.0","db":true,...}

# every route the storefront needs
for p in / /shop /login /admin/login /api/health /robots.txt /sitemap.xml /sw.js; do
  curl -sS -o /dev/null -w "$p -> %{http_code}\n" "https://fresh-basket.abhijitborgohain.online$p"
done

# the service worker must never be cacheable (an old one caused a reload loop)
curl -sSI https://fresh-basket.abhijitborgohain.online/sw.js | grep -i cache-control

# TLS
echo | openssl s_client -servername fresh-basket.abhijitborgohain.online \
  -connect fresh-basket.abhijitborgohain.online:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

Admin login: `https://fresh-basket.abhijitborgohain.online/admin/login`
(credentials in `/opt/stacks/grocery-app/ADMIN_CREDENTIALS.txt`, chmod 600).
Change that password after the first login.

---

# 4. Updating the site

```bash
# on the build machine
git pull
docker buildx build --platform linux/amd64 --provenance=false --sbom=false \
  --target runner \
  --build-arg NEXT_PUBLIC_APP_URL=https://fresh-basket.abhijitborgohain.online \
  --build-arg NEXT_PUBLIC_API_URL=https://fresh-basket.abhijitborgohain.online \
  -t grocery-app/web:<new-tag> --load .
# save → gzip → scp → docker load (as in 1.2)

# on the VPS
cd /opt/stacks/grocery-app
git -C app pull
# write the new tag into compose.yml (image: grocery-app/web:<new-tag>)
docker compose up -d web
```

Tag each release with a date (`2026.11.18`) and keep the previous image so you
can roll back by pointing `image:` at the old tag and re-running
`docker compose up -d web`.

Migrations are forward-only: apply them before starting the new image. Rolling
code back across a migration may need a database restore.

---

# 5. Backups

```bash
docker exec grocery-app-db pg_dump -U postgres grocery | gzip > grocery-$(date +%F).sql.gz
# restore
gunzip -c grocery-YYYY-MM-DD.sql.gz | docker exec -i grocery-app-db psql -U postgres -d grocery
```

Schedule nightly and copy the dumps off the server.

---

# 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| TLS handshake fails right after reload | Certificate still being issued — wait ~10 s: `docker logs edge-caddy \| grep -i obtain` |
| `tls: no certificate` / ACME failures | DNS not pointing at this host, or port 443 blocked. Check `dig +short <domain>` |
| Web container restart loop | `docker compose logs web` — usually a missing env value; `docker compose config -q` |
| Login bounces back to `/login` | `NEXTAUTH_URL` / `AUTH_URL` must be `https://fresh-basket.abhijitborgohain.online`; recreate the container after editing `.env` |
| `next build` OOM-killed | Expected on this VPS — build the image elsewhere and transfer it |
| Blank page / reload loop on first visit | An old service worker from another host is cached in that browser; hard-refresh once |
| OTP code never arrives | `OTP_PROVIDER=mock` only logs the code inside the container; set `resend` + `RESEND_API_KEY` |

Useful commands:

```bash
cd /opt/stacks/grocery-app
docker compose ps
docker compose logs -f --tail=200 web
docker logs --tail=200 edge-caddy
docker stats --no-stream
```
