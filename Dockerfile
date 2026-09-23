# Proof the app is not tied to Vercel: `output: 'standalone'` bundles the server and only the
# node_modules it actually needs. Build: docker build -t lend-lens . ; run: docker run -p 3000:3000 lend-lens
# Optional runtime env: -e RPC_URL=... -e REVALIDATE_SECRET=... (.env files are not copied in).
# Note: caches here belong to this one container. `'use cache'` entries live in the default
# in-memory LRU handler; prerendered pages live on this container's disk
# (https://nextjs.org/docs/app/guides/self-hosting). On Vercel both are shared across instances.

FROM node:22-alpine AS base
# pnpm comes from the "packageManager" field in package.json via corepack.
RUN corepack enable

FROM base AS deps
WORKDIR /app
# pnpm-workspace.yaml carries `ignoredBuiltDependencies`; without it pnpm 10 warns about build scripts.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build prerenders pages from the live Aave API, so it needs network access.
# `public/` is optional in this repo; make sure it exists so the runner COPY never fails.
RUN pnpm build && mkdir -p public

FROM node:22-alpine AS runner
WORKDIR /app
# HOSTNAME=0.0.0.0: server.js binds to HOSTNAME, and the container's default hostname is not
# reachable through the published port.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# standalone/ holds server.js + traced node_modules; public/ and .next/static are not copied
# into it by `next build` and must be added next to server.js by hand.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
