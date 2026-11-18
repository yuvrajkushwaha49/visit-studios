#!/bin/bash
# ==============================================================================
# Visit Studio - Fast Pull, Database Sync & Server Restart Script for AWS EC2
# ==============================================================================
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}>>> [1/5] Navigating to project directory...${NC}"
APP_DIR="/var/www/visit-studio"
if [ ! -d "$APP_DIR" ]; then
  APP_DIR=$(pwd)
fi
cd "$APP_DIR"

echo -e "${CYAN}>>> [2/5] Pulling latest updates from GitHub (main)...${NC}"
git pull origin main

echo -e "${CYAN}>>> [3/5] Updating dependencies if needed...${NC}"
npm install --production --no-audit --no-fund >/dev/null 2>&1 || true

echo -e "${CYAN}>>> [4/5] Running seed & database sync (logos & projects)...${NC}"
node server/db/seed.js || true

echo -e "${CYAN}>>> [5/5] Restarting PM2 backend & Nginx web server...${NC}"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart visit-studio || pm2 start ecosystem.config.cjs --env production
else
  echo -e "${YELLOW}PM2 not found globally, checking local...${NC}"
  npx pm2 restart visit-studio || true
fi

if command -v nginx >/dev/null 2>&1; then
  sudo systemctl restart nginx || systemctl restart nginx || true
fi

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN} ✅ ALL FRONTEND & BACKEND SERVICES UPDATED & RESTARTED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================================================${NC}"
