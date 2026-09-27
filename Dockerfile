# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable

# ---- Install workspace dependencies -----------------------------------------
FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tooling/package.json tooling/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/cms-core/package.json packages/cms-core/package.json
COPY packages/web-core/package.json packages/web-core/package.json
COPY apps/tuyba/package.json apps/tuyba/package.json
RUN pnpm install --frozen-lockfile

# ---- Build the TUYBA application --------------------------------------------
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/tooling/node_modules ./tooling/node_modules
COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /repo/packages/cms-core/node_modules ./packages/cms-core/node_modules
COPY --from=deps /repo/packages/web-core/node_modules ./packages/web-core/node_modules
COPY --from=deps /repo/apps/tuyba/node_modules ./apps/tuyba/node_modules
COPY . .

# The frontend and admin routes are rendered per request rather than
# statically generated (see apps/tuyba/src/app/(frontend)/page.tsx), so the
# build needs no database connection or real secrets.
RUN pnpm --filter @nero/tuyba run build

# ---- Runtime image (Next.js standalone output) ------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /repo/apps/tuyba/public ./apps/tuyba/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/tuyba/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/tuyba/.next/static ./apps/tuyba/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/tuyba/server.js"]
