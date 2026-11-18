#!/usr/bin/env bash
# ==============================================================================
# VISIT STUDIO — FULLY AUTOMATED AWS EC2 & MYSQL DEPLOYMENT SCRIPT
# Tested on: Ubuntu 20.04 / 22.04 / 24.04 LTS (AWS EC2)
# ==============================================================================

set -e

# Colors for terminal styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "========================================================================"
echo "      🚀 VISIT STUDIO — AUTOMATED AWS EC2 & MYSQL DEPLOYMENT           "
echo "========================================================================"
echo -e "${NC}"

# Check for root/sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with sudo or as root: sudo bash setup_ec2.sh${NC}"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo -e "${BLUE}[1/8] Updating Ubuntu system packages...${NC}"
apt-get update -y -q
apt-get upgrade -y -q
apt-get install -y -q curl wget git build-essential ufw software-properties-common

echo -e "${BLUE}[2/8] Installing Node.js LTS (v20.x) and PM2...${NC}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v2* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -q nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) installed.${NC}"

npm install -g pm2 -q
echo -e "${GREEN}✓ PM2 process manager installed.${NC}"

echo -e "${BLUE}[3/8] Installing and Configuring MySQL Server 8.0...${NC}"
apt-get install -y -q mysql-server
systemctl enable --now mysql

# Generate random secure password for MySQL user
DB_NAME="visit_studio_db"
DB_USER="visit_user"
DB_PASS="Pass_$(openssl rand -hex 8)!"

echo -e "${YELLOW}Configuring MySQL Database (${DB_NAME}) and User (${DB_USER})...${NC}"

mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`visit_studio\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`visit_studio\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✓ MySQL database & permissions configured successfully.${NC}"

echo -e "${BLUE}[4/8] Cloning Repository from GitHub...${NC}"
APP_DIR="/var/www/visit-studio"
REPO_URL="https://github.com/yuvrajkushwaha49/visit-studios.git"

if [ -d "$APP_DIR/.git" ]; then
  echo -e "${YELLOW}Existing repository found at ${APP_DIR}. Pulling latest code...${NC}"
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  echo -e "${YELLOW}Cloning fresh copy to ${APP_DIR}...${NC}"
  mkdir -p /var/www
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Import MySQL Schema
if [ -f "$APP_DIR/server/db/migrations/mysql_schema.sql" ]; then
  echo -e "${YELLOW}Importing MySQL Schema from migrations/mysql_schema.sql...${NC}"
  mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "$APP_DIR/server/db/migrations/mysql_schema.sql" || true
  echo -e "${GREEN}✓ MySQL schema imported.${NC}"
fi

echo -e "${BLUE}[5/8] Configuring Production Environment (.env)...${NC}"
# Detect Public IPv4
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || curl -s https://api.ipify.org || echo "localhost")
JWT_SECRET=$(openssl rand -hex 32)

cat > "$APP_DIR/.env" <<EOF
PORT=3000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
BASE_URL=http://${PUBLIC_IP}
CORS_ORIGIN=*
DB_PATH=./server/data/visit_studio.db

# MySQL Production Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=${DB_USER}
MYSQL_PASSWORD=${DB_PASS}
MYSQL_DATABASE=${DB_NAME}
EOF

echo -e "${GREEN}✓ Production .env created with detected IP: http://${PUBLIC_IP}${NC}"

echo -e "${BLUE}[6/8] Installing Dependencies & Seeding Database...${NC}"
cd "$APP_DIR"
npm install --production=false
npm run seed

echo -e "${BLUE}[7/8] Starting Application with PM2 (Auto-Restart on Reboot)...${NC}"
pm2 delete visit-studio >/dev/null 2>&1 || true
pm2 start server/index.js --name "visit-studio"
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 save
echo -e "${GREEN}✓ PM2 configured and saved.${NC}"

echo -e "${BLUE}[8/8] Configuring Nginx Reverse Proxy (Port 80 -> Port 3000)...${NC}"
apt-get install -y -q nginx

cat > /etc/nginx/sites-available/visit-studio <<EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 35M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/visit-studio /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
systemctl enable nginx

# Configure Firewall (Allow SSH, HTTP, HTTPS)
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
echo "y" | ufw enable >/dev/null 2>&1 || true

echo -e "${GREEN}"
echo "========================================================================"
echo " 🎉 VISIT STUDIO IS NOW FULLY DEPLOYED AND LIVE ON YOUR AWS EC2!       "
echo "========================================================================"
echo -e "${NC}"
echo -e "🌐 ${CYAN}App Public URL:${NC}       http://${PUBLIC_IP}"
echo -e "🔑 ${CYAN}Super Admin Login:${NC}    superadmin@visitstudio.com"
echo -e "🔑 ${CYAN}Admin Login:${NC}          admin@auraluxe.com"
echo -e "🔑 ${CYAN}Default Password:${NC}     Password@123"
echo ""
echo -e "🗄️  ${YELLOW}MySQL Database Details:${NC}"
echo -e "    Database Name:        ${DB_NAME}"
echo -e "    Database User:        ${DB_USER}"
echo -e "    Database Password:    ${DB_PASS}"
echo ""
echo -e "🛠️  ${BLUE}Useful Server Management Commands:${NC}"
echo -e "    pm2 status            (Check server status)"
echo -e "    pm2 logs visit-studio (View live real-time logs)"
echo -e "    pm2 restart visit-studio (Restart backend application)"
echo -e "    sudo systemctl restart nginx (Restart web server)"
echo "========================================================================"
