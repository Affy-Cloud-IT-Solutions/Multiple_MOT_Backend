#!/bin/bash
set -e

APP_NAME="mot-backend"
SSH_KEY="$HOME/.ssh/Multiple_MOT_Backend"

echo "🚀 Deployment started..."

# Ensure we are in the correct directory
cd /var/www/mot/Multiple_MOT_Backend

# Reset local changes and pull the latest version of the app from production branch
echo "📦 Pulling latest code from production branch..."
GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" git fetch origin
GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" git reset --hard origin/production
GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no" git pull origin production
echo "✅ New changes copied to server!"

# Install Node.js dependencies
echo "📦 Installing dependencies..."
npm install --yes

# Restart or reload PM2 application
echo "🔁 Starting or restarting PM2 app..."
if pm2 describe $APP_NAME > /dev/null 2>&1; then
    echo "App already exists — restarting..."
    pm2 restart $APP_NAME --update-env
else
    echo "App not found — starting new instance..."
    pm2 start server.js --name $APP_NAME
fi

# Save PM2 process list
pm2 save

echo "✅ Deployment Finished Successfully!"
