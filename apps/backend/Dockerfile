# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json turbo.json ./
COPY packages/ packages/
COPY apps/backend/ apps/backend/

# Install all deps (needed by turborepo)
RUN npm ci --ignore-scripts

# Build shared package first, then backend
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/backend

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps for backend
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

RUN npm ci --workspace=apps/backend --omit=dev --ignore-scripts

WORKDIR /app/apps/backend

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
