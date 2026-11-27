const crypto = require('crypto');
const db = require('../db');
const emailService = require('./emailService');

const DEFAULT_EVENT_PREFS = {
  new_enquiry: true,
  lead_assigned: true,
  lead_reassigned: true,
  followup_due: true,
  overdue_followup: true,
  site_visit_scheduled: true,
  site_visit_completed: true,
  lead_converted: true,
  lead_marked_lost: true
};

function getUserPreferences(userId) {
  const row = db.get('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  if (!row) {
    return {
      user_id: userId,
      in_app_enabled: 1,
      email_enabled: 1,
      whatsapp_enabled: 0,
      events: { ...DEFAULT_EVENT_PREFS }
    };
  }
  let parsedEvents = { ...DEFAULT_EVENT_PREFS };
  try {
    if (row.events_json) {
      parsedEvents = { ...DEFAULT_EVENT_PREFS, ...JSON.parse(row.events_json) };
    }
  } catch (_) {}
  return {
    id: row.id,
    user_id: row.user_id,
    in_app_enabled: Number(row.in_app_enabled ?? 1),
    email_enabled: Number(row.email_enabled ?? 1),
    whatsapp_enabled: Number(row.whatsapp_enabled ?? 0),
    events: parsedEvents
  };
}

function saveUserPreferences(userId, { in_app_enabled, email_enabled, whatsapp_enabled, events }) {
  const existing = db.get('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  const mergedEvents = { ...DEFAULT_EVENT_PREFS, ...(events || {}) };
  const eventsJson = JSON.stringify(mergedEvents);

  if (existing) {
    db.run(
      `UPDATE notification_preferences
       SET in_app_enabled = ?, email_enabled = ?, whatsapp_enabled = ?, events_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        in_app_enabled !== undefined ? (in_app_enabled ? 1 : 0) : existing.in_app_enabled,
        email_enabled !== undefined ? (email_enabled ? 1 : 0) : existing.email_enabled,
        whatsapp_enabled !== undefined ? (whatsapp_enabled ? 1 : 0) : existing.whatsapp_enabled,
        eventsJson,
        userId
      ]
    );
  } else {
    db.run(
      `INSERT INTO notification_preferences (id, user_id, in_app_enabled, email_enabled, whatsapp_enabled, events_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'npref-' + crypto.randomUUID().slice(0, 8),
        userId,
        in_app_enabled !== undefined ? (in_app_enabled ? 1 : 0) : 1,
        email_enabled !== undefined ? (email_enabled ? 1 : 0) : 1,
        whatsapp_enabled !== undefined ? (whatsapp_enabled ? 1 : 0) : 0,
        eventsJson
      ]
    );
  }
  return getUserPreferences(userId);
}

function hasDedupeLog(dedupeKey) {
  if (!dedupeKey) return false;
  const existing = db.get(
    "SELECT id FROM notification_logs WHERE dedupe_key = ? AND status IN ('sent', 'pending', 'retrying') LIMIT 1",
    [dedupeKey]
  );
  return Boolean(existing);
}

async function deliverEmailNotification({ logId, user, subject, bodyText }) {
  try {
    const smtp = emailService.getSmtpConfig(user.organization_id);
    if (!smtp.isConfigured || !user.email) {
      db.run(
        `UPDATE notification_logs SET status = 'failed', attempts = attempts + 1, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        ['SMTP not configured or user email missing', logId]
      );
      return;
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.username, pass: smtp.password }
    });
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: user.email,
      subject,
      text: bodyText
    });
    db.run(
      `UPDATE notification_logs SET status = 'sent', attempts = attempts + 1, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [logId]
    );
  } catch (err) {
    const row = db.get('SELECT attempts, max_attempts FROM notification_logs WHERE id = ?', [logId]);
    const nextAttempt = (row?.attempts || 0) + 1;
    const maxAttempts = row?.max_attempts || 3;
    const isFinal = nextAttempt >= maxAttempts;
    const backoffMinutes = Math.pow(2, nextAttempt); // 2m, 4m, 8m
    db.run(
      `UPDATE notification_logs
       SET status = ?, attempts = ?, next_retry_at = ${isFinal ? 'NULL' : `datetime('now', '+${backoffMinutes} minutes')`},
           error_message = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [isFinal ? 'failed' : 'retrying', nextAttempt, String(err.message || 'Email delivery error').slice(0, 500), logId]
    );
  }
}

/**
 * Dispatch notifications to one or more authorized internal users.
 * Never exposes sensitive customer details unnecessarily and prevents duplicates via dedupeKey.
 */
async function notifyUsers({
  organizationId,
  recipientUserIds = [],
  eventType,
  title,
  message,
  entityType = 'leads',
  entityId = null,
  dedupeKeyPrefix = null
}) {
  const uniqueUserIds = [...new Set((recipientUserIds || []).filter(Boolean))];
  const createdIds = [];

  for (const userId of uniqueUserIds) {
    const user = db.get("SELECT id, organization_id, name, email, status FROM users WHERE id = ? AND status = 'active'", [userId]);
    if (!user) continue;

    const prefs = getUserPreferences(userId);
    if (prefs.events && prefs.events[eventType] === false) {
      continue;
    }

    const perUserDedupe = dedupeKeyPrefix ? `${dedupeKeyPrefix}:${userId}` : null;
    if (perUserDedupe && hasDedupeLog(perUserDedupe)) {
      continue;
    }

    let notifId = null;
    if (prefs.in_app_enabled) {
      notifId = 'ntf-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO notifications (id, organization_id, user_id, event_type, title, message, entity_type, entity_id, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [notifId, organizationId || user.organization_id || null, userId, eventType, title, message, entityType, entityId]
      );
      db.run(
        `INSERT INTO notification_logs (id, organization_id, notification_id, user_id, channel, event_type, dedupe_key, status, attempts, max_attempts)
         VALUES (?, ?, ?, ?, 'in_app', ?, ?, 'sent', 1, 1)`,
        ['nlog-' + crypto.randomUUID().slice(0, 8), organizationId || user.organization_id || null, notifId, userId, eventType, perUserDedupe]
      );
      createdIds.push(notifId);
    }

    if (prefs.email_enabled && user.email) {
      const smtp = emailService.getSmtpConfig(organizationId || user.organization_id);
      if (smtp.isConfigured) {
        const emailLogId = 'nlog-' + crypto.randomUUID().slice(0, 8);
        const emailDedupe = perUserDedupe ? `${perUserDedupe}:email` : null;
        if (!emailDedupe || !hasDedupeLog(emailDedupe)) {
          db.run(
            `INSERT INTO notification_logs (id, organization_id, notification_id, user_id, channel, event_type, dedupe_key, status, attempts, max_attempts, payload)
             VALUES (?, ?, ?, ?, 'email', ?, ?, 'pending', 0, 3, ?)`,
            [
              emailLogId,
              organizationId || user.organization_id || null,
              notifId,
              userId,
              eventType,
              emailDedupe,
              JSON.stringify({ subject: `[Visit Studio] ${title}`, bodyText: `${title}\n\n${message}` })
            ]
          );
          deliverEmailNotification({
            logId: emailLogId,
            user,
            subject: `[Visit Studio] ${title}`,
            bodyText: `${title}\n\n${message}`
          }).catch(() => {});
        }
      }
    }
  }

  return createdIds;
}

async function processRetryQueue() {
  const dueRetries = db.all(
    `SELECT nl.*, u.email, u.organization_id as user_org_id
     FROM notification_logs nl
     JOIN users u ON nl.user_id = u.id
     WHERE nl.channel = 'email'
       AND nl.status = 'retrying'
       AND nl.attempts < nl.max_attempts
       AND (nl.next_retry_at IS NULL OR nl.next_retry_at <= datetime('now'))
     LIMIT 20`
  );

  for (const row of dueRetries) {
    let payload = {};
    try { payload = JSON.parse(row.payload || '{}'); } catch (_) {}
    await deliverEmailNotification({
      logId: row.id,
      user: { id: row.user_id, email: row.email, organization_id: row.organization_id || row.user_org_id },
      subject: payload.subject || `[Visit Studio] Notification`,
      bodyText: payload.bodyText || ''
    });
  }
  return dueRetries.length;
}

module.exports = {
  DEFAULT_EVENT_PREFS,
  getUserPreferences,
  saveUserPreferences,
  notifyUsers,
  processRetryQueue
};
