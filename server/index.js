const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const config = require('./config');
const { authRateLimiter, publicRateLimiter } = require('./middleware/rateLimiter');

const app = express();

// Enable reverse proxy trust (Cloudflare, Nginx, AWS ALB, Caddy)
app.set('trust proxy', 1);

// Production Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Response-time telemetry tracking
app.use((req, res, next) => {
  const start = performance.now();
  const origEnd = res.end;
  res.end = function(...args) {
    if (!res.headersSent) {
      const ms = (performance.now() - start).toFixed(2);
      res.setHeader('X-Response-Time', `${ms}ms`);
    }
    return origEnd.apply(this, args);
  };
  next();
});

// CORS configuration with environment origin support
app.use(cors({
  origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
  credentials: true
}));

// High-speed GZIP compression for all responses
app.use(compression({ level: 6 }));

// Request body parsers with safety limits
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend assets with responsive cache headers & ETags
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// Health check endpoint (for monitoring, uptime probes, and load balancers)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Visit Studio',
    version: '2.0.0-production-ready',
    environment: config.ENV,
    timestamp: new Date().toISOString()
  });
});

// Apply rate limiting to sensitive routes
app.use('/api/auth/login', authRateLimiter);
app.use('/api/invitations/public', publicRateLimiter);

// Mount modular API routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/users', require('./routes/users'));
app.use('/api/developers', require('./routes/developers'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));

// On-demand QR Code Generator Endpoint (returns PNG directly)
app.get('/api/qr', async (req, res) => {
  try {
    const text = req.query.text || 'https://visitstudio.com';
    const QRCode = require('qrcode');
    const buf = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: { dark: '#102a45', light: '#ffffff' },
      width: 320
    });
    res.type('png').set('Cache-Control', 'public, max-age=86400').send(buf);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Short Invitation Link Redirect (/i/:code) protected by rate limiter
app.get('/i/:code', publicRateLimiter, (req, res) => {
  try {
    const { code } = req.params;
    const db = require('./db');
    const inv = db.get(
      `SELECT i.*, p.name as project_name, c.full_name as customer_name, d.name as developer_name 
       FROM invitations i 
       LEFT JOIN projects p ON i.project_id = p.id 
       LEFT JOIN customers c ON i.customer_id = c.id 
       LEFT JOIN developers d ON i.developer_id = d.id 
       WHERE i.short_code = ? OR i.id = ? OR i.token = ? LIMIT 1`,
      [code, code, code]
    );
    if (inv && inv.token) {
      const ua = req.headers['user-agent'] || '';
      const isBot = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot/i.test(ua);
      const baseUrl = config.getBaseUrl(req);
      const cardImageUrl = `${baseUrl}/cards/${inv.id}.png`;
      const inviteUrl = `${baseUrl}/?invite=${inv.token}`;

      if (isBot) {
        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>VIP Site Visit Pass · ${inv.project_name || 'Visit Studio'}</title>
  <meta property="og:title" content="VIP Site Visit Pass · ${inv.project_name || 'Exclusive Residence'}">
  <meta property="og:description" content="Exclusive private walkthrough invitation for ${inv.customer_name || 'Guest'}. Tap to view your contactless digital pass.">
  <meta property="og:image" content="${cardImageUrl}">
  <meta property="og:image:secure_url" content="${cardImageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1080">
  <meta property="og:image:height" content="1440">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}/i/${code}">
  <meta http-equiv="refresh" content="0;url=${inviteUrl}">
</head>
<body><script>location.replace(${JSON.stringify(inviteUrl)});</script></body>
</html>`);
      }

      return res.redirect(302, inviteUrl);
    }
    return res.redirect(302, '/');
  } catch (err) {
    return res.redirect(302, '/');
  }
});

// Fallback: route any direct SPA request to index.html
app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  res.status(404).json({ error: 'API endpoint not found' });
});

// Production error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err);
  const isProd = config.ENV === 'production';
  res.status(err.status || 500).json({
    error: 'Internal server error',
    ...(isProd ? {} : { details: err.message, stack: err.stack })
  });
});

// Start listening
const server = app.listen(config.PORT, () => {
  console.log(`====================================================`);
  console.log(` Visit Studio Platform Server running on port ${config.PORT}`);
  console.log(` Local URL: http://localhost:${config.PORT}`);
  console.log(` Database: SQLite WAL mode (${config.DB_PATH})`);
  console.log(` Environment: ${config.ENV}`);
  console.log(`====================================================`);
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down Visit Studio...`);
  server.close(async () => {
    try {
      const db = require('./db');
      if (db.db && typeof db.db.exec === 'function') {
        try {
          db.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
          console.log('✓ SQLite WAL checkpoint completed.');
        } catch (e) {
          console.warn('WAL checkpoint note:', e.message);
        }
      }
      console.log('✓ All active HTTP connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds timeout if still lingering
  setTimeout(() => {
    console.error('Force shutdown after 10s timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
