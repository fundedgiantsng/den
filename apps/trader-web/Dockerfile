# Production Dockerfile for @fundedgiants/trader-web
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Step 1: Dependencies Cache
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/trader-web/package*.json ./apps/trader-web/

RUN npm ci

# Step 2: Builder
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build shared types & Trader Web
RUN npm run build --workspace=@fundedgiants/shared-types

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://api.fundedgiants.ng

RUN cd apps/trader-web && npm run build

# Step 3: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/trader-web ./apps/trader-web
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/apps/trader-web
EXPOSE 3000

CMD ["npm", "run", "start"]
