#!/bin/bash
# ==============================================================================
# FundedGiants Production Deployment Script
# Execute this on your OVHcloud production server:
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
# ==============================================================================

set -e

echo "🚀 Starting FundedGiants Production Deployment..."

# 1. Ensure .env.production exists
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production file not found!"
  echo "Please copy .env.production.example to .env.production and populate your live credentials."
  exit 1
fi

# 2. Pull latest code
echo "📥 Pulling latest Git updates..."
git pull origin main

# 3. Build & start database and cache first
echo "🐘 Starting PostgreSQL & Redis..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# 4. Wait for database readiness
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec fg-postgres pg_isready -U "${POSTGRES_USER:-fg_prod_admin}" > /dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL is ready."

# 5. Build and deploy API, Trader Web, Admin Web, and Nginx
echo "🏗️ Building application containers..."
docker compose -f docker-compose.prod.yml build --parallel

echo "🔄 Starting application services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 6. Apply Prisma database schema & initial seeds
echo "📦 Applying database migrations..."
docker exec fg-api npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss
docker exec fg-api npx tsx packages/database/prisma/seed.ts || true

echo "✨ FundedGiants Production Deployment Complete!"
docker compose -f docker-compose.prod.yml ps
