const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const whatsappService = require('../services/whatsappService');
const config = require('../config');

router.use(authenticate);

// GET /api/visits - List visits with filters and RBAC
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const { status, project_id, associate_id, date, range, search } = req.query;

    let sql = `
      SELECT sv.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        d.name as developer_name,
        u_assoc.name as associate_name,
        u_assoc.phone as associate_phone,
        u_staff.name as staff_name,
        i.token as invitation_token,
        fb.rating as feedback_rating,
        fb.notes as feedback_notes
      FROM site_visits sv
      JOIN customers c ON sv.customer_id = c.id
      JOIN projects p ON sv.project_id = p.id
      LEFT JOIN developers d ON p.developer_id = d.id
      JOIN users u_assoc ON sv.associate_id = u_assoc.id
      LEFT JOIN users u_staff ON sv.authorized_staff_id = u_staff.id
      LEFT JOIN invitations i ON sv.invitation_id = i.id
      LEFT JOIN feedback fb ON fb.site_visit_id = sv.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC
    if (user.role === 'admin') {
      sql += ' AND sv.organization_id = ?';
      params.push(user.organization_id);
    } else if (user.role === 'sales_head') {
      sql += ' AND sv.organization_id = ? AND (sv.sales_head_id = ? OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.organization_id, user.id, user.id);
    } else if (user.role === 'sales_associate') {
      sql += ' AND sv.organization_id = ? AND sv.associate_id = ?';
      params.push(user.organization_id, user.id);
    }

    if (status) {
      sql += ' AND sv.status = ?';
      params.push(status);
    }

    if (project_id) {
      sql += ' AND sv.project_id = ?';
      params.push(project_id);
    }

    if (associate_id) {
      sql += ' AND sv.associate_id = ?';
      params.push(associate_id);
    }

    if (date) {
      sql += ' AND sv.scheduled_date = ?';
      params.push(date);
    }

    // Time ranges: today, tomorrow, week, month
    if (range === 'today') {
      sql += " AND sv.scheduled_date = date('now')";
    } else if (range === 'tomorrow') {
      sql += " AND sv.scheduled_date = date('now', '+1 day')";
    } else if (range === 'week') {
      sql += " AND sv.scheduled_date BETWEEN date('now', '-7 days') AND date('now', '+7 days')";
    } else if (range === 'month') {
      sql += " AND strftime('%Y-%m', sv.scheduled_date) = strftime('%Y-%m', 'now')";
    }

    if (search) {
      sql += ' AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR p.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY sv.scheduled_date DESC, sv.scheduled_time ASC';

    const visits = db.all(sql, params);
    return res.json({ visits });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/visits/check-in - QR Code or Manual Check-in
router.post('/check-in', (req, res) => {
  try {
    const user = req.user;
    const { token, visit_id, check_in_method = 'qr', staff_notes } = req.body;

    let visit;
    if (token) {
      // Find visit by invitation token from scanned QR code
      visit = db.get(`
        SELECT sv.*, c.full_name as customer_name, p.name as project_name
        FROM site_visits sv
        JOIN invitations i ON sv.invitation_id = i.id
        JOIN customers c ON sv.customer_id = c.id
        JOIN projects p ON sv.project_id = p.id
        WHERE i.token = ?
      `, [token]);
    } else if (visit_id) {
      visit = db.get(`
        SELECT sv.*, c.full_name as customer_name, p.name as project_name
        FROM site_visits sv
        JOIN customers c ON sv.customer_id = c.id
        JOIN projects p ON sv.project_id = p.id
        WHERE sv.id = ?
      `, [visit_id]);
    }

    if (!visit) {
      return res.status(404).json({ error: 'Valid visit record or QR token not found' });
    }

    if (visit.status === 'completed') {
      return res.status(400).json({ error: 'This visit has already been marked completed.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.run(
      `UPDATE site_visits SET
        status = 'checked_in',
        check_in_time = ?,
        check_in_method = ?,
        authorized_staff_id = ?,
        staff_notes = COALESCE(?, staff_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [now, check_in_method, user.id, staff_notes || `Checked in by ${user.name} via ${check_in_method.toUpperCase()}`, visit.id]
    );

    // Update customer status to visited
    db.run("UPDATE customers SET status = 'visited', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [visit.customer_id]);

    // Add timeline interaction
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Check-in Verified', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), visit.customer_id, user.id, `Customer checked in for ${visit.project_name} at ${now}. Method: ${check_in_method.toUpperCase()}`]
    );

    logActivity(req, 'CHECK_IN_VISIT', 'site_visits', visit.id, `Checked in customer ${visit.customer_name} via ${check_in_method}`);

    return res.json({
      success: true,
      message: `Check-in confirmed for ${visit.customer_name}`,
      checkInTime: now,
      visitId: visit.id
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/visits/:id/check-out - Complete visit and trigger feedback request
router.post('/:id/check-out', (req, res) => {
  try {
    const user = req.user;
    const { staff_notes, proceed_to_booking = false } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const visit = db.get(`
      SELECT sv.*, c.full_name as customer_name, c.mobile_number as customer_phone, p.name as project_name
      FROM site_visits sv
      JOIN customers c ON sv.customer_id = c.id
      JOIN projects p ON sv.project_id = p.id
      WHERE sv.id = ?
    `, [req.params.id]);

    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    db.run(
      `UPDATE site_visits SET
        status = 'completed',
        check_out_time = ?,
        staff_notes = COALESCE(?, staff_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [now, staff_notes || 'Visit concluded successfully', req.params.id]
    );

    const newCustomerStatus = proceed_to_booking ? 'negotiation' : 'visited';
    db.run(`UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newCustomerStatus, visit.customer_id]);

    // Dispatch feedback request WhatsApp
    const baseUrl = config.getBaseUrl(req);
    const feedbackUrl = `${baseUrl}/#feedback=${visit.id}`;
    whatsappService.notifyFeedbackRequest({
      organizationId: visit.organization_id,
      customerName: visit.customer_name,
      customerPhone: visit.customer_phone,
      projectName: visit.project_name,
      feedbackLink: feedbackUrl
    }).catch(err => console.error('Feedback request notification error:', err));

    logActivity(req, 'CHECK_OUT_VISIT', 'site_visits', req.params.id, `Completed visit for ${visit.customer_name}`);

    return res.json({ success: true, message: 'Visit marked as completed. Feedback request sent to customer.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/visits/:id/status - Update visit status (e.g. no_show, cancelled, in_progress)
router.patch('/:id/status', (req, res) => {
  try {
    const { status, staff_notes } = req.body;
    const allowed = ['draft', 'invitation_sent', 'pending_confirmation', 'confirmed', 'reschedule_requested', 'rescheduled', 'cancelled', 'upcoming', 'checked_in', 'in_progress', 'completed', 'no_show'];
    
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid visit status' });
    }

    db.run(
      `UPDATE site_visits SET status = ?, staff_notes = COALESCE(?, staff_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, staff_notes || null, req.params.id]
    );

    logActivity(req, 'UPDATE_VISIT_STATUS', 'site_visits', req.params.id, `Status updated to ${status}`);
    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/visits/:id/feedback - Submit customer feedback
router.post('/:id/feedback', (req, res) => {
  try {
    const { rating, interest_level, budget_fit, sales_experience, notes } = req.body;
    if (!rating) return res.status(400).json({ error: 'Rating is required' });

    const visit = db.get('SELECT * FROM site_visits WHERE id = ?', [req.params.id]);
    if (!visit) return res.status(404).json({ error: 'Visit record not found' });

    const fbId = 'fb-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT OR REPLACE INTO feedback (id, site_visit_id, customer_id, rating, interest_level, budget_fit, sales_experience, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fbId, visit.id, visit.customer_id, Number(rating),
        interest_level || 'high', budget_fit || 'within_budget',
        sales_experience ? Number(sales_experience) : 5, notes || ''
      ]
    );

    db.run('UPDATE site_visits SET feedback_submitted = 1 WHERE id = ?', [visit.id]);

    logActivity(req, 'SUBMIT_FEEDBACK', 'site_visits', visit.id, `Submitted feedback with rating ${rating}`);
    return res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/visits/:id - Get single visit details
router.get('/:id', (req, res) => {
  try {
    const visit = db.get(`
      SELECT sv.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        d.name as developer_name,
        u_assoc.name as associate_name
      FROM site_visits sv
      JOIN customers c ON sv.customer_id = c.id
      JOIN projects p ON sv.project_id = p.id
      LEFT JOIN developers d ON p.developer_id = d.id
      JOIN users u_assoc ON sv.associate_id = u_assoc.id
      WHERE sv.id = ?
    `, [req.params.id]);

    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    return res.json({ visit });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/visits - Direct Visit Creation (CRUD: Create)
router.post('/', (req, res) => {
  try {
    const user = req.user;
    const { customer_id, project_id, associate_id, scheduled_date, scheduled_time, duration, staff_notes } = req.body;

    if (!customer_id || !project_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({ error: 'Customer, project, scheduled date and time are required' });
    }

    const orgId = user.organization_id;
    const assignedAssociateId = associate_id || user.id;
    const visitId = 'vis-' + crypto.randomUUID().slice(0, 8);

    db.run(
      `INSERT INTO site_visits (
        id, organization_id, customer_id, project_id, associate_id, sales_head_id,
        scheduled_date, scheduled_time, duration, staff_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')`,
      [
        visitId, orgId, customer_id, project_id, assignedAssociateId,
        user.sales_head_id || null, scheduled_date, scheduled_time, duration || 60, staff_notes || ''
      ]
    );

    // Update customer status to visit_scheduled
    db.run("UPDATE customers SET status = 'visit_scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [customer_id]);

    logActivity(req, 'CREATE_VISIT', 'site_visits', visitId, `Scheduled visit for customer ${customer_id} on ${scheduled_date}`);
    return res.status(201).json({ success: true, message: 'Site visit scheduled successfully', id: visitId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/visits/:id - Edit visit details
router.put('/:id', (req, res) => {
  try {
    const { scheduled_date, scheduled_time, duration, staff_notes, status } = req.body;
    const visit = db.get('SELECT * FROM site_visits WHERE id = ?', [req.params.id]);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    db.run(
      `UPDATE site_visits SET
        scheduled_date = COALESCE(?, scheduled_date),
        scheduled_time = COALESCE(?, scheduled_time),
        duration = COALESCE(?, duration),
        staff_notes = COALESCE(?, staff_notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        scheduled_date ?? null,
        scheduled_time ?? null,
        duration ?? null,
        staff_notes ?? null,
        status ?? null,
        req.params.id
      ]
    );

    // If linked to invitation, sync date/time
    if (visit.invitation_id && (scheduled_date || scheduled_time)) {
      db.run(
        `UPDATE invitations SET visit_date = COALESCE(?, visit_date), visit_time = COALESCE(?, visit_time), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [scheduled_date ?? null, scheduled_time ?? null, visit.invitation_id]
      );
    }

    logActivity(req, 'UPDATE_VISIT', 'site_visits', req.params.id, 'Updated visit details');
    return res.json({ success: true, message: 'Visit updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/visits/:id - Delete visit
router.delete('/:id', (req, res) => {
  try {
    const visit = db.get('SELECT * FROM site_visits WHERE id = ?', [req.params.id]);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    db.run('DELETE FROM site_visits WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_VISIT', 'site_visits', req.params.id, 'Deleted site visit');
    return res.json({ success: true, message: 'Site visit deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
