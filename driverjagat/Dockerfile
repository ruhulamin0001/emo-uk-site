# ──────────────────────────────────────────────────────────────
# DriverJagat - Hostinger VPS er jonno
#
# Vercel NA - malik er nijer VPS. Tai `output: 'standalone'`
# (next.config.ts), ar ei image ta nijei node chalay.
#
# Tin dhap, ar seta icchakrito: sesh image e npm, source code,
# ba build tool kichhu i thake na - sudhu ja cholte lage.
# ──────────────────────────────────────────────────────────────

# ── 1 · Package ──
FROM node:22-alpine AS deps
WORKDIR /app

# SUDHU package file duita age copy kori.
# Source code copy korle protita code bodole npm install abar
# cholto - 2 minute er jaygay 20 second e kaj sesh hoy.
COPY package.json package-lock.json ./
RUN npm ci

# ── 2 · Build ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* ghor gulo BUILD ER SOMOY lage - ei gulo
# browser er javascript er bhitore dhuke jay. Run er somoy dile
# ar kaj kore na.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ALLOW_INDEXING
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── 3 · Cholar image ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# root diye chalanо HOY NA. Container bhangleo oi manush
# host er kichhu korte parbe na.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Traefik jate jane container ta sotti cholche kina
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
