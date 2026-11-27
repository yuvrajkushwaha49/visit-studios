const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { getTodayInTimezone } = require('../services/backgroundJobs');

router.use(authenticate);

function canAccessFollowup(user, fol) {
  if (!user || !fol) return false;
  if (user.role === 'super_admin') return true;
  if (fol.organization_id !== user.organization_id) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'sales_head') {
    if (fol.sales_head_id === user.id || fol.associate_id === user.id) return true;
    const assoc = db.get('SELECT sales_head_id FROM users WHERE id = ?', [fol.associate_id]);
    return Boolean(assoc && assoc.sales_head_id === user.id);
  }
  if (user.role === 'sales_associate') {
    return fol.associate_id === user.id;
  }
  return false;
}

// GET /api/followups/overdue - Overdue follow-ups using org timezone
router.get('/overdue', (req, res) => {
  try {
    const user = req.user;
    const settings = user.organization_id
      ? db.get('SELECT timezone FROM lead_settings WHERE organization_id = ?', [user.organization_id])
      : null;
    const todayYmd = getTodayInTimezone(settings?.timezone || 'Asia/Kolkata');

    let sql = `
      SELECT f.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        u.name as associate_name,
        l.enquiry_ref,
        'overdue' as calculated_status
      FROM followups f
      JOIN customers c ON f.customer_id = c.id
      LEFT JOIN leads l ON f.lead_id = l.id
      LEFT JOIN projects p ON COALESCE(l.project_id, c.interested_project_id) = p.id
      JOIN users u ON f.associate_id = u.id
      WHERE ((f.status = 'pending' AND f.follow_up_date < ?) OR f.status = 'overdue')
    `;
    const params = [todayYmd];

    if (user.role === 'admin') {
      sql += ' AND f.organization_id = ?';
      params.push(user.organization_id);
    } else if (user.role === 'sales_head') {
      sql += ' AND f.organization_id = ? AND (f.sales_head_id = ? OR f.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.organization_id, user.id, user.id);
    } else if (user.role === 'sales_associate') {
      sql += ' AND f.organization_id = ? AND f.associate_id = ?';
      params.push(user.organization_id, user.id);
    }

    sql += ' ORDER BY f.follow_up_date ASC, f.priority DESC';
    const followups = db.all(sql, params);
    return res.json({ followups, todayYmd });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/followups - List followups according to RBAC
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const { status, priority, associate_id, team_id, sales_head_id, developer_id, project_id, date_from, date_to, search, lead_id } = req.query;
    const settings = user.organization_id
      ? db.get('SELECT timezone FROM lead_settings WHERE organization_id = ?', [user.organization_id])
      : null;
    const todayYmd = getTodayInTimezone(settings?.timezone || 'Asia/Kolkata');

    let sql = `
      SELECT f.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        COALESCE(l.project_id, c.interested_project_id) as project_id,
        p.name as project_name,
        p.developer_id as developer_id,
        d.name as developer_name,
        u.name as associate_name,
        COALESCE(f.sales_head_id, u.sales_head_id) as team_id,
        sh.name as team_name,
        l.enquiry_ref,
        CASE
          WHEN f.status = 'pending' AND f.follow_up_date < ? THEN 'overdue'
          ELSE f.status
        END as calculated_status
      FROM followups f
      JOIN customers c ON f.customer_id = c.id
      LEFT JOIN leads l ON f.lead_id = l.id
      LEFT JOIN projects p ON COALESCE(l.project_id, c.interested_project_id) = p.id
      LEFT JOIN developers d ON p.developer_id = d.id
      JOIN users u ON f.associate_id = u.id
      LEFT JOIN users sh ON COALESCE(f.sales_head_id, u.sales_head_id) = sh.id
      WHERE 1=1
    `;
    const params = [todayYmd];

    // RBAC
    if (user.role === 'admin') {
      sql += ' AND f.organization_id = ?';
      params.push(user.organization_id);
    } else if (user.role === 'sales_head') {
      sql += ' AND f.organization_id = ? AND (f.sales_head_id = ? OR f.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.organization_id, user.id, user.id);
    } else if (user.role === 'sales_associate') {
      sql += ' AND f.organization_id = ? AND f.associate_id = ?';
      params.push(user.organization_id, user.id);
    }

    if (lead_id) {
      sql += ' AND f.lead_id = ?';
      params.push(lead_id);
    }

    if (status) {
      if (status === 'overdue') {
        sql += " AND ((f.status = 'pending' AND f.follow_up_date < ?) OR f.status = 'overdue')";
        params.push(todayYmd);
      } else {
        sql += ' AND f.status = ?';
        params.push(status);
      }
    }

    if (priority) {
      sql += ' AND f.priority = ?';
      params.push(priority);
    }

    const filterTeamId = team_id || sales_head_id;
    if (filterTeamId && user.role !== 'sales_associate') {
      sql += ' AND (f.sales_head_id = ? OR u.sales_head_id = ?)';
      params.push(filterTeamId, filterTeamId);
    }

    if (associate_id && user.role !== 'sales_associate') {
      sql += ' AND f.associate_id = ?';
      params.push(associate_id);
    }

    if (developer_id) {
      sql += ' AND p.developer_id = ?';
      params.push(developer_id);
    }

    if (project_id) {
      sql += ' AND COALESCE(l.project_id, c.interested_project_id) = ?';
      params.push(project_id);
    }

    if (date_from && /^\d{4}-\d{2}-\d{2}$/.test(date_from)) {
      sql += ' AND f.follow_up_date >= ?';
      params.push(date_from);
    }

    if (date_to && /^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
      sql += ' AND f.follow_up_date <= ?';
      params.push(date_to);
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      sql += " AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR f.notes LIKE ? OR u.name LIKE ? OR COALESCE(p.name, '') LIKE ?)";
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY f.follow_up_date ASC, f.priority DESC';

    const followups = db.all(sql, params);
    return res.json({ followups });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/followups - Schedule new follow-up
router.post('/', (req, res) => {
  try {
    const user = req.user;
    const { customer_id, lead_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, associate_id } = req.body;

    let targetCustomerId = customer_id;
    if (!targetCustomerId && lead_id) {
      const lead = db.get('SELECT customer_id, organization_id FROM leads WHERE id = ?', [lead_id]);
      if (lead) targetCustomerId = lead.customer_id;
    }

    if (!targetCustomerId || !follow_up_date || !notes) {
      return res.status(400).json({ error: 'Customer, date and discussion notes are required' });
    }

    const cust = db.get('SELECT id, organization_id FROM customers WHERE id = ?', [targetCustomerId]);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    if (user.role !== 'super_admin' && cust.organization_id !== user.organization_id) {
      return res.status(403).json({ error: 'Unauthorized customer access' });
    }

    const assignedAssociateId = (user.role === 'sales_associate' || !associate_id) ? user.id : associate_id;
    const assocUser = db.get('SELECT id, organization_id, sales_head_id FROM users WHERE id = ?', [assignedAssociateId]);
    if (!assocUser || assocUser.organization_id !== cust.organization_id) {
      return res.status(400).json({ error: 'Target associate not found in organization' });
    }
    if (user.role === 'sales_head' && assocUser.sales_head_id !== user.id && assocUser.id !== user.id) {
      return res.status(403).json({ error: 'Sales Head can only schedule follow-ups for their own team' });
    }

    const folId = 'fol-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO followups (id, organization_id, customer_id, lead_id, associate_id, sales_head_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        folId, cust.organization_id, targetCustomerId, lead_id || null, assignedAssociateId,
        assocUser?.sales_head_id || null, follow_up_date, follow_up_time || '11:00',
        follow_up_type || 'call', priority || 'medium', notes.trim()
      ]
    );

    // Record interaction in customer timeline
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Follow-up Scheduled', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), targetCustomerId, user.id, `Scheduled ${follow_up_type || 'call'} for ${follow_up_date}. Note: ${notes}`]
    );

    logActivity(req, 'SCHEDULE_FOLLOWUP', 'followups', folId, `Scheduled follow-up for customer ${targetCustomerId}`);
    return res.status(201).json({ success: true, message: 'Follow-up scheduled successfully', id: folId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/followups/:id/status - Mark completed, reschedule, or cancel
router.patch('/:id/status', (req, res) => {
  try {
    const { status, completion_notes, new_date, new_time } = req.body;
    const fol = db.get('SELECT * FROM followups WHERE id = ?', [req.params.id]);
    if (!fol) return res.status(404).json({ error: 'Follow-up not found' });
    if (!canAccessFollowup(req.user, fol)) return res.status(403).json({ error: 'Unauthorized' });

    if (status === 'completed') {
      db.run(
        `UPDATE followups SET status = 'completed', completed_at = CURRENT_TIMESTAMP, notes = notes || ' | Outcome: ' || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [completion_notes || 'Completed successfully', fol.id]
      );
      db.run(
        `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
         VALUES (?, ?, ?, 'Follow-up Completed', ?)`,
        ['int-' + crypto.randomUUID().slice(0, 8), fol.customer_id, req.user.id, completion_notes || 'Follow-up completed']
      );
    } else if (status === 'rescheduled') {
      db.run(
        `UPDATE followups SET status = 'rescheduled', follow_up_date = ?, follow_up_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [new_date || fol.follow_up_date, new_time || fol.follow_up_time, fol.id]
      );
    } else {
      db.run('UPDATE followups SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, fol.id]);
    }

    logActivity(req, 'UPDATE_FOLLOWUP_STATUS', 'followups', fol.id, `Status updated to ${status}`);
    return res.json({ success: true, message: `Follow-up updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/followups/:id - Update follow-up status or fields
router.patch('/:id', (req, res) => {
  try {
    const { follow_up_date, follow_up_time, follow_up_type, priority, notes, status, completion_notes } = req.body;
    const fol = db.get('SELECT * FROM followups WHERE id = ?', [req.params.id]);
    if (!fol) return res.status(404).json({ error: 'Follow-up not found' });
    if (!canAccessFollowup(req.user, fol)) return res.status(403).json({ error: 'Unauthorized' });

    const finalNotes = status === 'completed' && completion_notes
      ? `${fol.notes} | Outcome: ${completion_notes}`
      : (notes ?? fol.notes);

    db.run(
      `UPDATE followups SET
        follow_up_date = COALESCE(?, follow_up_date),
        follow_up_time = COALESCE(?, follow_up_time),
        follow_up_type = COALESCE(?, follow_up_type),
        priority = COALESCE(?, priority),
        notes = ?,
        status = COALESCE(?, status),
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        follow_up_date ?? null,
        follow_up_time ?? null,
        follow_up_type ?? null,
        priority ?? null,
        finalNotes,
        status ?? null,
        status ?? null,
        req.params.id
      ]
    );

    logActivity(req, 'UPDATE_FOLLOWUP', 'followups', req.params.id, 'Patched follow-up');
    return res.json({ success: true, message: 'Follow-up updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/followups/:id - Edit follow-up
router.put('/:id', (req, res) => {
  try {
    const { follow_up_date, follow_up_time, follow_up_type, priority, notes, status } = req.body;
    const fol = db.get('SELECT * FROM followups WHERE id = ?', [req.params.id]);
    if (!fol) return res.status(404).json({ error: 'Follow-up not found' });
    if (!canAccessFollowup(req.user, fol)) return res.status(403).json({ error: 'Unauthorized' });

    db.run(
      `UPDATE followups SET
        follow_up_date = COALESCE(?, follow_up_date),
        follow_up_time = COALESCE(?, follow_up_time),
        follow_up_type = COALESCE(?, follow_up_type),
        priority = COALESCE(?, priority),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        follow_up_date ?? null,
        follow_up_time ?? null,
        follow_up_type ?? null,
        priority ?? null,
        notes ?? null,
        status ?? null,
        req.params.id
      ]
    );

    logActivity(req, 'UPDATE_FOLLOWUP', 'followups', req.params.id, 'Updated follow-up details');
    return res.json({ success: true, message: 'Follow-up updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/followups/:id - Delete follow-up
router.delete('/:id', (req, res) => {
  try {
    const fol = db.get('SELECT * FROM followups WHERE id = ?', [req.params.id]);
    if (!fol) return res.status(404).json({ error: 'Follow-up not found' });
    if (!canAccessFollowup(req.user, fol)) return res.status(403).json({ error: 'Unauthorized' });

    db.run('DELETE FROM followups WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_FOLLOWUP', 'followups', req.params.id, 'Deleted follow-up');
    return res.json({ success: true, message: 'Follow-up deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
