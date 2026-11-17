#!/bin/bash
# ==============================================================================
# Automated Let's Encrypt SSL Setup for FundedGiants Subdomains
# Run once on server initialisation:
#   chmod +x deploy/setup-ssl.sh
#   ./deploy/setup-ssl.sh your-email@fundedgiants.ng
# ==============================================================================

set -e

EMAIL=$1
if [ -z "$EMAIL" ]; then
  echo "Usage: ./deploy/setup-ssl.sh <your-email-address>"
  exit 1
fi

DOMAINS=("api.fundedgiants.ng" "trader.fundedgiants.ng" "admin.fundedgiants.ng")

echo "🔐 Initialising SSL Certificates for FundedGiants domains: ${DOMAINS[*]}..."

# Create certbot directories
mkdir -p /var/www/certbot
mkdir -p ./deploy/nginx/conf.d

for DOMAIN in "${DOMAINS[@]}"; do
  echo "Issuing certificate for $DOMAIN..."
  certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive || true
done

echo "✅ SSL certificate generation complete."
