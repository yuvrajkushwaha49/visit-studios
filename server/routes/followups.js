const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

router.use(authenticate);

// GET /api/followups - List followups according to RBAC
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const { status, priority, associate_id } = req.query;

    let sql = `
      SELECT f.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        u.name as associate_name,
        CASE
          WHEN f.status = 'pending' AND f.follow_up_date < date('now') THEN 'overdue'
          ELSE f.status
        END as calculated_status
      FROM followups f
      JOIN customers c ON f.customer_id = c.id
      LEFT JOIN projects p ON c.interested_project_id = p.id
      JOIN users u ON f.associate_id = u.id
      WHERE 1=1
    `;
    const params = [];

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

    if (status) {
      if (status === 'overdue') {
        sql += " AND f.status = 'pending' AND f.follow_up_date < date('now')";
      } else {
        sql += ' AND f.status = ?';
        params.push(status);
      }
    }

    if (priority) {
      sql += ' AND f.priority = ?';
      params.push(priority);
    }

    if (associate_id) {
      sql += ' AND f.associate_id = ?';
      params.push(associate_id);
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
    const { customer_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, associate_id } = req.body;

    if (!customer_id || !follow_up_date || !notes) {
      return res.status(400).json({ error: 'Customer, date and discussion notes are required' });
    }

    const assignedAssociateId = (user.role === 'sales_associate' || !associate_id) ? user.id : associate_id;
    const assocUser = db.get('SELECT sales_head_id FROM users WHERE id = ?', [assignedAssociateId]);

    const folId = 'fol-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO followups (id, organization_id, customer_id, associate_id, sales_head_id, follow_up_date, follow_up_time, follow_up_type, priority, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        folId, user.organization_id, customer_id, assignedAssociateId,
        assocUser?.sales_head_id || null, follow_up_date, follow_up_time || '11:00',
        follow_up_type || 'call', priority || 'medium', notes.trim()
      ]
    );

    // Record interaction in customer timeline
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Follow-up Scheduled', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), customer_id, user.id, `Scheduled ${follow_up_type || 'call'} for ${follow_up_date}. Note: ${notes}`]
    );

    logActivity(req, 'SCHEDULE_FOLLOWUP', 'followups', folId, `Scheduled follow-up for customer ${customer_id}`);
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

    if (status === 'completed') {
      db.run(
        `UPDATE followups SET status = 'completed', notes = notes || ' | Outcome: ' || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
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

// PUT /api/followups/:id - Edit follow-up
router.put('/:id', (req, res) => {
  try {
    const { follow_up_date, follow_up_time, follow_up_type, priority, notes, status } = req.body;
    const fol = db.get('SELECT * FROM followups WHERE id = ?', [req.params.id]);
    if (!fol) return res.status(404).json({ error: 'Follow-up not found' });

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

    db.run('DELETE FROM followups WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_FOLLOWUP', 'followups', req.params.id, 'Deleted follow-up');
    return res.json({ success: true, message: 'Follow-up deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
