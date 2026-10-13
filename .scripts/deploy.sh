#!/bin/bash
set -e

# ==============================================================================
# Production Deployment Script (Docker + GitOps)
# MOT Reminder Management System Backend
# ==============================================================================

PROJECT_DIR="/var/www/mot/Multiple_MOT_Backend"
SSH_KEY="$HOME/.ssh/Multiple_MOT_Backend"

echo "=========================================================="
echo " Starting Dockerized Deployment..."
echo " Time: $(date)"
echo " Directory: $PROJECT_DIR"
echo "=========================================================="

cd "$PROJECT_DIR"

# 1. Update source code from production branch
echo "--> Pulling latest changes from production branch..."
if [ -f "$SSH_KEY" ]; then
    GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" git fetch origin production
    GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" git reset --hard origin/production
else
    git fetch origin production
    git reset --hard origin/production
fi

# 2. Check for required environment configuration file
if [ ! -f ".env" ]; then
    echo "ERROR: .env file is missing in $PROJECT_DIR!"
    echo "Please copy .env.example to .env and configure production credentials."
    exit 1
fi

# 3. Clean up legacy PM2 process if still active (free up memory and avoid port conflicts)
if command -v pm2 > /dev/null 2>&1; then
    if pm2 describe mot-backend > /dev/null 2>&1; then
        echo "--> Stopping legacy PM2 application 'mot-backend'..."
        pm2 stop mot-backend || true
        pm2 delete mot-backend || true
        pm2 save || true
        echo "Legacy PM2 application removed successfully."
    fi
fi

# 4. Prepare required directories & permissions
mkdir -p uploads certbot/conf certbot/www nginx/conf.d
chmod -R 755 uploads
chmod +x .scripts/*.sh || true

# 5. Build and launch Docker container for backend
echo "--> Building and starting Docker backend container..."
docker compose build backend
docker compose up -d backend --remove-orphans

# 6. Verify container health status
echo "--> Verifying service health..."
sleep 5
docker compose ps

# Check backend container health
STATUS=$(docker inspect --format='{{json .State.Health.Status}}' mot_backend_app 2>/dev/null || echo '"unknown"')
echo "Backend health status: $STATUS"

# 7. Clean up dangling images to keep server disk clean
echo "--> Cleaning up unused Docker images..."
docker image prune -f

echo "=========================================================="
echo " Deployment Finished Successfully!"
echo " Target Domain: https://api.ondoorcarservice.com"
echo " Health Endpoint: https://api.ondoorcarservice.com/health"
echo "=========================================================="
