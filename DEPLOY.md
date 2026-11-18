# Deploying Fresh Basket to the VPS

Target URL: **https://fresh-basket.abhijitborgohain.online**

The stack in `docker-compose.prod.yml` is self-contained:

```
Internet ──► Caddy (80/443, HTTPS) ──► web (Next.js :3000) ──► db (Postgres 16)
                                          └─ migrate (one-shot, runs first)
```

Only Caddy publishes ports. Postgres is never reachable from outside Docker.

---

## 0. Prerequisites on the VPS

- Ubuntu/Debian (or similar) with sudo
- Docker Engine + Compose plugin (`docker compose version` must work)
- Git
- Ports **80** and **443** open in the VPS provider firewall *and* in `ufw` if enabled

```bash
sudo apt update
sudo apt install -y git
# Docker: https://docs.docker.com/engine/install/
```

---

## 1. DNS

At your domain registrar / DNS panel create:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `fresh-basket` | `<VPS public IPv4>` | 300 |
| AAAA | `fresh-basket` | `<VPS IPv6>` (only if you have one) | 300 |

> **Current state:** `fresh-basket.abhijitborgohain.online` resolves to
> `86.38.243.198`, which answers with Hostinger/LiteSpeed and returns **403**.
> That is Hostinger shared hosting, not your VPS — update the A record to the
> VPS IP before continuing.

Verify before deploying (must print the VPS IP):

```bash
dig +short fresh-basket.abhijitborgohain.online
```

Caddy cannot issue a Let's Encrypt certificate until this is correct.

---

## 2. Get the code

```bash
sudo mkdir -p /srv && cd /srv
git clone https://github.com/borgohainabhijit09/grocery-app.git
cd grocery-app
```

If the repository is private, use a **deploy key** or a fine-grained PAT:

```bash
git clone https://<USER>:<TOKEN>@github.com/borgohainabhijit09/grocery-app.git
```

Do **not** copy `node_modules`, `.next`, or your local `.env` — the image is
built on the server.

---

## 3. Configure environment

```bash
cp .env.production.example .env
nano .env
```

Fill at minimum:

- `APP_DOMAIN`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`
  (already set to the subdomain in the example)
- `POSTGRES_PASSWORD` — long random string
- `NEXTAUTH_SECRET` and `AUTH_SECRET` — the **same** random value:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — your real admin login
- `SEED_DEMO_USERS="false"` — avoids creating demo staff/delivery/customer accounts
- `RESEND_API_KEY` + `OTP_PROVIDER="resend"` if you want OTP login to work

Validate the compose file (catches missing required variables):

```bash
docker compose -f docker-compose.prod.yml config > /dev/null && echo OK
```

---

## 4. First deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This builds the image, starts Postgres, waits for it to be healthy, runs the
migrations, then starts the app and Caddy. First build takes a few minutes.

Watch progress:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f migrate web caddy
```

Seed the catalogue **once** (categories, products, slots, coupons, admin user):

```bash
docker compose -f docker-compose.prod.yml run --rm migrate npm run db:seed
```

The command prints the admin email it created. `SEED_ADMIN_PASSWORD` and
`SEED_DEMO_USERS` are read from `.env`.

---

## 5. Verify

```bash
curl -fsS https://fresh-basket.abhijitborgohain.online/api/health
# {"ok":true,"service":"grocery-web","version":"0.1.0","db":true,...}
```

Then in a browser:

1. `https://fresh-basket.abhijitborgohain.online` loads the storefront
2. Log in at `/login` with the seeded admin on `/admin/login`
3. `https://fresh-basket.abhijitborgohain.online/sw.js` returns `Cache-Control: no-cache, no-store, must-revalidate`

---

## 6. Updating the site

```bash
cd /srv/grocery-app
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Compose rebuilds the image, re-runs migrations, and restarts only what changed.
Existing data in the `pgdata` volume is preserved.

---

## 7. Rollback

```bash
git log --oneline -10          # find the previous good commit
git checkout <commit-sha>
docker compose -f docker-compose.prod.yml up -d --build
```

> Prisma migrations are forward-only. Rolling the code back across a migration
> may require restoring a database backup.

---

## 8. Backups

```bash
docker exec grocery-prod-db pg_dump -U postgres grocery > "grocery-$(date +%F).sql"
```

Restore:

```bash
cat grocery-YYYY-MM-DD.sql | docker exec -i grocery-prod-db psql -U postgres -d grocery
```

Put the dump command in a nightly cron job and copy the files off the server.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `network ... not found` | You are on an older compose file. This one uses an internal network only — `git pull`. |
| Caddy: `tls: no certificate` / ACME errors | DNS still points elsewhere, or port 80 is blocked. Check `dig +short <domain>` and the provider firewall. |
| `port is already allocated` on 80/443 | Another web server is running: `sudo ss -lptn 'sport = :80'`. Stop it, or put Caddy behind it. |
| Web container restarts repeatedly | `docker compose -f docker-compose.prod.yml logs web` — usually a missing/invalid env value. |
| Login redirects back to `/login` | `NEXTAUTH_URL` / `AUTH_URL` must be `https://fresh-basket.abhijitborgohain.online`; rebuild after changing `.env`. |
| OTP code never arrives | `OTP_PROVIDER` is `mock`; set `resend` + `RESEND_API_KEY` (mock only logs to the container). |
| Blank page / reload loop at first visit | Hard-refresh once; an old service worker from a previous host may still be installed in that browser. |

### Logs

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=200 web
docker compose -f docker-compose.prod.yml logs -f --tail=200 caddy
```
