const crypto = require('crypto');
const db = require('../db');

function logActivity(req, action, entityType, entityId, details) {
  try {
    const user = req?.user || {};
    const orgId = user.organization_id || (req?.body && req.body.organization_id) || null;
    const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';

    db.run(
      `INSERT INTO activity_logs (id, organization_id, user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'act-' + crypto.randomUUID(),
        orgId,
        user.id || null,
        user.name || 'System / Public',
        user.role || 'guest',
        action,
        entityType,
        entityId || null,
        typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
        ip
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logActivity };
