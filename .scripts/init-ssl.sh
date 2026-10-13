#!/bin/bash
set -e

# ==============================================================================
# Initial SSL Certificate Setup for api.ondoorcarservice.com
# Resolves the Nginx + Certbot bootstrap dependency loop
# ==============================================================================

DOMAIN="api.ondoorcarservice.com"
EMAIL="${1:-admin@ondoorcarservice.com}"
RSA_KEY_SIZE=4096
CERT_PATH="./certbot/conf/live/$DOMAIN"

echo "=========================================================="
echo " Starting SSL Certificate Setup for: $DOMAIN"
echo " Contact Email: $EMAIL"
echo "=========================================================="

mkdir -p "$CERT_PATH"
mkdir -p "./certbot/www"

# Step 1: Check if genuine certificates already exist
if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    echo "SSL Certificate already exists at $CERT_PATH."
    read -p "Do you want to re-issue/renew anyway? (y/N) " decision
    if [ "$decision" != "y" ] && [ "$decision" != "Y" ]; then
        echo "Keeping existing certificate. Exiting."
        exit 0
    fi
fi

# Step 2: Create temporary self-signed dummy certificate so Nginx can start
echo "Creating dummy certificate for $DOMAIN..."
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$CERT_PATH/privkey.pem" \
  -out "$CERT_PATH/fullchain.pem" \
  -subj "/CN=localhost"

# Step 3: Start Nginx container to serve the ACME challenge
echo "Starting Nginx in background..."
docker compose up -d nginx

# Step 4: Request real Let's Encrypt certificate
echo "Requesting genuine Let's Encrypt SSL certificate..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    -d $DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

# Step 5: Reload Nginx to load the genuine certificates
echo "Reloading Nginx with new certificate..."
docker compose exec nginx nginx -s reload

echo "=========================================================="
echo " SSL Certificate Setup Completed Successfully!"
echo " Domain: https://$DOMAIN"
echo "=========================================================="
