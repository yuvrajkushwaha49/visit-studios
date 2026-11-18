const path = require('path');
require('dotenv').config();

function getBaseUrl(req) {
  if (process.env.BASE_URL && process.env.BASE_URL !== 'http://localhost:3000') {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  if (req && req.get) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host) return `${proto}://${host}`;
  }
  return (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'visit_studio_jwt_secret_key_2026_super_secure',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, 'data', 'visit_studio.db'),
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0',
  ENV: process.env.NODE_ENV || 'development',
  getBaseUrl
};
