const db = require('../db');
const notificationService = require('./notificationService');

let intervalHandle = null;

function getTodayInTimezone(tz = 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    return `${map.year}-${map.month}-${map.day}`;
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

async function runFollowupSweep() {
  try {
    const orgs = db.all("SELECT id FROM organizations WHERE status = 'active'");
    for (const org of orgs) {
      const settings = db.get('SELECT timezone FROM lead_settings WHERE organization_id = ?', [org.id]);
      const todayYmd = getTodayInTimezone(settings?.timezone || 'Asia/Kolkata');

      // Mark pending follow-ups past due date as overdue
      const overdueRows = db.all(
        `SELECT f.*, c.full_name as customer_name
         FROM followups f
         JOIN customers c ON f.customer_id = c.id
         WHERE f.organization_id = ?
           AND f.status = 'pending'
           AND f.follow_up_date < ?`,
        [org.id, todayYmd]
      );

      for (const row of overdueRows) {
        db.run("UPDATE followups SET status = 'overdue', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'", [row.id]);
        await notificationService.notifyUsers({
          organizationId: org.id,
          recipientUserIds: [row.associate_id, row.sales_head_id].filter(Boolean),
          eventType: 'overdue_followup',
          title: `Overdue Follow-up: ${row.customer_name}`,
          message: `Follow-up scheduled for ${row.follow_up_date} (${row.follow_up_type}) is overdue. Notes: ${row.notes}`,
          entityType: 'followups',
          entityId: row.id,
          dedupeKeyPrefix: `overdue_followup:${row.id}:${todayYmd}`
        });
      }

      // Send due-today reminder once per day
      const dueTodayRows = db.all(
        `SELECT f.*, c.full_name as customer_name
         FROM followups f
         JOIN customers c ON f.customer_id = c.id
         WHERE f.organization_id = ?
           AND f.status = 'pending'
           AND f.follow_up_date = ?
           AND (f.reminder_sent_at IS NULL OR date(f.reminder_sent_at) < ?)`,
        [org.id, todayYmd, todayYmd]
      );

      for (const row of dueTodayRows) {
        db.run('UPDATE followups SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);
        await notificationService.notifyUsers({
          organizationId: org.id,
          recipientUserIds: [row.associate_id].filter(Boolean),
          eventType: 'followup_due',
          title: `Follow-up Due Today: ${row.customer_name}`,
          message: `Reminder: ${row.follow_up_type.toUpperCase()} follow-up due today at ${row.follow_up_time || '11:00'}.`,
          entityType: 'followups',
          entityId: row.id,
          dedupeKeyPrefix: `followup_due:${row.id}:${todayYmd}`
        });
      }
    }

    await notificationService.processRetryQueue();
  } catch (err) {
    console.error('Background sweep error:', err.message);
  }
}

function startBackgroundJobs() {
  if (intervalHandle) return;
  // Run initial sweep shortly after startup, then every 60s without keeping Node alive during CLI tests
  const bootTimer = setTimeout(() => {
    runFollowupSweep().catch(() => {});
  }, 5000);
  if (bootTimer.unref) bootTimer.unref();

  intervalHandle = setInterval(() => {
    runFollowupSweep().catch(() => {});
  }, 60 * 1000);
  if (intervalHandle.unref) intervalHandle.unref();
}

function stopBackgroundJobs() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  getTodayInTimezone,
  runFollowupSweep,
  startBackgroundJobs,
  stopBackgroundJobs
};
