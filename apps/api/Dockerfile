# Production Dockerfile for @fundedgiants/api
FROM node:20-alpine AS base

# Install OpenSSL and dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Step 1: Dependencies Cache
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json ./apps/api/

RUN npm ci

# Step 2: Build Shared Packages & API
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client and build shared packages
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@fundedgiants/database
RUN npm run build --workspace=@fundedgiants/shared-types
RUN npm run build --workspace=@fundedgiants/api

# Step 3: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copy node modules and built artifacts
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
