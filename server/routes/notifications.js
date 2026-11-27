const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getUserPreferences, saveUserPreferences } = require('../services/notificationService');

router.use(authenticate);

// GET /api/notifications - Current user's notifications
router.get('/', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const unreadOnly = req.query.unread_only === '1';

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];
    if (unreadOnly) sql += ' AND is_read = 0';
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const notifications = db.all(sql, params);
    const unreadCount = db.get('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id])?.cnt || 0;

    return res.json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/preferences - Current user's notification preferences
router.get('/preferences', (req, res) => {
  try {
    return res.json({ preferences: getUserPreferences(req.user.id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/preferences - Save preferences
router.put('/preferences', (req, res) => {
  try {
    const prefs = saveUserPreferences(req.user.id, req.body || {});
    return res.json({ success: true, preferences: prefs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/logs - Delivery audit logs for current user (or org if Admin)
router.get('/logs', (req, res) => {
  try {
    const user = req.user;
    let sql = 'SELECT * FROM notification_logs WHERE 1=1';
    const params = [];
    if (user.role === 'super_admin') {
      if (req.query.organization_id) {
        sql += ' AND organization_id = ?';
        params.push(req.query.organization_id);
      }
    } else if (user.role === 'admin') {
      sql += ' AND organization_id = ?';
      params.push(user.organization_id);
    } else {
      sql += ' AND user_id = ?';
      params.push(user.id);
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const logs = db.all(sql, params);
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', (req, res) => {
  try {
    const notif = db.get('SELECT id, user_id FROM notifications WHERE id = ?', [req.params.id]);
    if (!notif) return res.status(404).json({ error: 'Notification not found.' });
    if (notif.user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized.' });

    db.run('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?', [notif.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', (req, res) => {
  try {
    db.run('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0', [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
