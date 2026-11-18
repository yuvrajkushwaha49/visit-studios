#!/usr/bin/env bash
# ==============================================================================
# VISIT STUDIO — ALL-IN-ONE 100% CLEAN DEPLOY FROM ZERO (AWS EC2)
# ==============================================================================
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN} 🚀 VISIT STUDIO — CLEAN DEPLOY FROM ZERO (AWS EC2)${NC}"
echo -e "${CYAN}======================================================================${NC}"

# Check for root/sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy_from_zero.sh"
  exit 1
fi

echo -e "${YELLOW}>>> [1/6] Cleaning up old temporary files, broken packages & disk cache...${NC}"
apt-get clean >/dev/null 2>&1 || true
swapoff -a >/dev/null 2>&1 || true
rm -f /swapfile /tmp/node* /tmp/*.tar.gz

echo -e "${YELLOW}>>> [2/6] Configuring 1.5GB Swap Memory (Prevents memory kills)...${NC}"
fallocate -l 1536M /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1536
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10 >/dev/null 2>&1 || true
echo -e "${GREEN}✓ Swap memory enabled.${NC}"

echo -e "${YELLOW}>>> [3/6] Installing Node.js LTS v22 (with built-in node:sqlite) & NPM...${NC}"
curl -fsSL https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.gz -o /tmp/node.tar.gz
tar -xzf /tmp/node.tar.gz -C /usr/local --strip-components=1
rm -f /tmp/node.tar.gz
echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) ready.${NC}"

echo -e "${YELLOW}>>> [4/6] Setting up project directory freshly from GitHub...${NC}"
TARGET_DIR="/home/ubuntu/visit-studios"
if [ ! -d "/home/ubuntu" ]; then
  TARGET_DIR="/var/www/visit-studio"
fi

rm -rf "$TARGET_DIR"
git clone https://github.com/yuvrajkushwaha49/visit-studios.git "$TARGET_DIR"
cd "$TARGET_DIR"

if id -u ubuntu >/dev/null 2>&1; then
  chown -R ubuntu:ubuntu "$TARGET_DIR"
fi

echo -e "${YELLOW}>>> [5/6] Installing dependencies and populating projects & logos...${NC}"
npm install --production --no-audit --no-fund
node server/db/seed.js

echo -e "${YELLOW}>>> [6/6] Setting up PM2 & forwarding Port 80 -> 3000...${NC}"
npm install -g pm2 --no-audit --no-fund -q
pm2 delete all >/dev/null 2>&1 || true
pm2 start server/index.js --name "visit-studio"
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 save >/dev/null 2>&1 || true

# Port 80 direct redirect to 3000
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000 >/dev/null 2>&1 || true

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || curl -s https://api.ipify.org || echo "localhost")

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN} 🎉 CONGRATULATIONS! VISIT STUDIO IS 100% LIVE ON YOUR AWS EC2!       ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "🌐 ${CYAN}App Public URL:${NC}       http://${PUBLIC_IP}"
echo -e "🌐 ${CYAN}Alternative URL:${NC}    http://${PUBLIC_IP}:3000"
echo -e "🔑 ${CYAN}Super Admin Login:${NC}  superadmin@visitstudio.com"
echo -e "🔑 ${CYAN}Default Password:${NC}   Password@123"
echo -e "${GREEN}======================================================================${NC}"
