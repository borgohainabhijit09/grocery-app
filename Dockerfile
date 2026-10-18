FROM node:22-alpine AS base

# ─── Stage 1: install deps ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN npm ci

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Prisma generate only reads the schema file — no real DB needed here
ENV DATABASE_URL="postgresql://x:x@x:5432/x"

RUN npm run build -w web

# ─── Stage 3: migrations (used as a one-shot service in compose) ──────────────
# Uses db push because no migration history exists yet. Once the first
# `prisma migrate dev --name init` is committed, switch to migrate deploy.
FROM builder AS migrate
CMD ["npx", "prisma", "db", "push", "--schema=./packages/database/prisma/schema.prisma", "--accept-data-loss"]

# ─── Stage 4: production runner ───────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# next build --output=standalone copies everything the server needs into .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
