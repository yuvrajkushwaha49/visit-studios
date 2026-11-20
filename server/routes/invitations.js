const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { generateQRCodeDataURL } = require('../services/qrService');
const whatsappService = require('../services/whatsappService');
const config = require('../config');

// ==========================================
// 1. PUBLIC INVITATION ENDPOINTS (NO AUTH)
// ==========================================

// GET /api/invitations/public/:token - Customer opens invitation link
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const inv = db.get(`
      SELECT i.*,
        c.full_name as customer_name,
        c.email as customer_email,
        p.name as project_name,
        p.project_logo as project_logo,
        p.description as project_description,
        p.banner_image as project_banner,
        p.location as project_location,
        p.google_maps_url as project_maps_url,
        p.amenities as project_amenities,
        d.name as developer_name,
        d.company_logo as developer_logo,
        u.name as advisor_name,
        u.phone as advisor_phone,
        u.email as advisor_email,
        os.agency_name,
        os.agency_subtitle,
        os.logo_url as agency_logo,
        os.brand_color,
        os.accent_color,
        sv.id as site_visit_id,
        sv.status as visit_status
      FROM invitations i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN developers d ON i.developer_id = d.id
      LEFT JOIN users u ON i.associate_id = u.id
      LEFT JOIN organization_settings os ON i.organization_id = os.organization_id
      LEFT JOIN site_visits sv ON sv.invitation_id = i.id
      WHERE i.token = ?
         OR LOWER(i.short_code) = LOWER(?)
         OR LOWER(i.id) = LOWER(?)
         OR LOWER(i.id) = LOWER('inv-' || ?)
      LIMIT 1
    `, [token, token, token, token]);

    if (!inv) {
      return res.status(404).json({ error: 'This invitation link is invalid or has expired.' });
    }

    if (inv.status === 'cancelled') {
      return res.status(410).json({ error: 'This property visit invitation has been cancelled.' });
    }

    // Update status to 'opened' if it was merely 'sent'
    if (inv.status === 'sent') {
      db.run("UPDATE invitations SET status = 'opened' WHERE id = ?", [inv.id]);
    }

    // Generate fresh high-res QR code for contactless check-in
    const checkInPayload = JSON.stringify({
      token: inv.token,
      invitation_id: inv.id,
      customer_id: inv.customer_id,
      visit_date: inv.visit_date
    });
    const qrCodeData = await generateQRCodeDataURL(checkInPayload);

    return res.json({
      invitation: {
        id: inv.id,
        token: inv.token,
        customer_name: inv.customer_name,
        project_name: inv.project_name,
        project_logo: inv.project_logo,
        developer_name: inv.developer_name,
        developer_logo: inv.developer_logo,
        project_location: inv.location || inv.project_location,
        project_maps_url: inv.maps_url || inv.project_maps_url,
        project_banner: inv.project_banner,
        project_amenities: inv.project_amenities,
        project_description: inv.project_description,
        apartment_size: inv.size,
        discussed_price: inv.price,
        visit_date: inv.visit_date,
        visit_time: inv.visit_time,
        duration: inv.duration,
        notes: inv.notes,
        advisor_name: inv.advisor_name,
        advisor_phone: inv.advisor_phone,
        agency_name: inv.agency_name || 'Visit Studio Realty',
        agency_subtitle: inv.agency_subtitle || 'A personal property invitation',
        agency_logo: inv.agency_logo,
        brand_color: inv.brand_color || '#29244d',
        accent_color: inv.accent_color || '#f59e0b',
        status: inv.status,
        visit_status: inv.visit_status,
        site_visit_id: inv.site_visit_id,
        qr_code_data: qrCodeData
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/invitations/:id/card-image - Save client-rendered HD pass card image for WhatsApp & OpenGraph preview
router.post('/:id/card-image', (req, res) => {
  try {
    const { id } = req.params;
    const { image_base64 } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'No image data provided' });

    const fs = require('fs');
    const path = require('path');
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const cardsDir = path.join(__dirname, '..', '..', 'public', 'cards');
    if (!fs.existsSync(cardsDir)) {
      fs.mkdirSync(cardsDir, { recursive: true });
    }
    const filePath = path.join(cardsDir, `${id}.png`);
    fs.writeFileSync(filePath, buffer);

    return res.json({ success: true, url: `/cards/${id}.png` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/invitations/public/:token/confirm - Customer confirms visit
router.post('/public/:token/confirm', async (req, res) => {
  try {
    const { token } = req.params;
    const inv = db.get('SELECT * FROM invitations WHERE token = ?', [token]);
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    db.run("UPDATE invitations SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);
    db.run("UPDATE site_visits SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE invitation_id = ?", [inv.id]);

    // Dispatch confirmation WhatsApp
    const cust = db.get('SELECT full_name, mobile_number FROM customers WHERE id = ?', [inv.customer_id]);
    const proj = db.get('SELECT name FROM projects WHERE id = ?', [inv.project_id]);
    const advisor = db.get('SELECT name, phone FROM users WHERE id = ?', [inv.associate_id]);

    if (cust) {
      const baseUrl = config.getBaseUrl(req);
      const inviteUrl = `${baseUrl}/#invite=${inv.token}`;
      whatsappService.notifyVisitConfirmed({
        organizationId: inv.organization_id,
        customerName: cust.full_name,
        customerPhone: cust.mobile_number,
        projectName: proj?.name || 'Your Residence',
        visitDate: inv.visit_date,
        visitTime: inv.visit_time,
        advisorName: advisor?.name || 'Property Host',
        advisorPhone: advisor?.phone || '',
        invitationLink: inviteUrl
      }).catch(err => console.error('WA Confirmation error:', err));
    }

    logActivity(
      { user: { id: null, name: cust?.full_name || 'Customer', role: 'customer', organization_id: inv.organization_id } },
      'CUSTOMER_CONFIRMED_VISIT',
      'invitations',
      inv.id,
      'Customer confirmed their scheduled site visit attendance.'
    );

    return res.json({ success: true, message: 'Your site visit is confirmed! We look forward to welcoming you.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/invitations/public/:token/reschedule - Customer requests reschedule
router.post('/public/:token/reschedule', (req, res) => {
  try {
    const { token } = req.params;
    const { requested_date, requested_time, notes } = req.body;

    const inv = db.get('SELECT * FROM invitations WHERE token = ?', [token]);
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    db.run("UPDATE invitations SET status = 'reschedule_requested', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);
    db.run(
      `UPDATE site_visits SET status = 'reschedule_requested', staff_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE invitation_id = ?`,
      [`Customer requested reschedule to: ${requested_date || 'Anytime'} ${requested_time || ''}. Reason: ${notes || 'No reason provided'}`, inv.id]
    );

    // Add customer timeline note
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, interaction_type, notes)
       VALUES (?, ?, 'Reschedule Requested', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), inv.customer_id, `Customer requested visit reschedule for ${requested_date} at ${requested_time}. Notes: ${notes || ''}`]
    );

    // Create high-priority follow-up for the associate
    db.run(
      `INSERT INTO followups (id, organization_id, customer_id, associate_id, sales_head_id, follow_up_date, follow_up_type, priority, notes, status)
       VALUES (?, ?, ?, ?, ?, date('now'), 'call', 'urgent', ?, 'pending')`,
      [
        'fol-' + crypto.randomUUID().slice(0, 8),
        inv.organization_id,
        inv.customer_id,
        inv.associate_id,
        inv.sales_head_id,
        `Customer requested reschedule for visit. Proposed date: ${requested_date} ${requested_time}. Call to align.`
      ]
    );

    return res.json({ success: true, message: 'Reschedule request submitted. Your advisor will connect with you shortly.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// POST /api/invitations/public/:token/cancel - Customer cancels visit
router.post('/public/:token/cancel', (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const inv = db.get('SELECT * FROM invitations WHERE token = ?', [token]);
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    db.run("UPDATE invitations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);
    db.run("UPDATE site_visits SET status = 'cancelled', staff_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE invitation_id = ?", [reason || 'Cancelled by customer', inv.id]);

    db.run(
      `INSERT INTO customer_interactions (id, customer_id, interaction_type, notes)
       VALUES (?, ?, 'Visit Cancelled', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), inv.customer_id, `Visit cancelled by customer. Reason: ${reason || 'Not specified'}`]
    );

    return res.json({ success: true, message: 'Your visit has been cancelled.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// ==========================================
// 2. PROTECTED STAFF INVITATION ENDPOINTS
// ==========================================
router.use(authenticate);

// GET /api/invitations - List staff invitations according to RBAC
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const { status, project_id, search } = req.query;

    let sql = `
      SELECT i.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        p.project_logo as project_logo,
        d.name as developer_name,
        d.company_logo as developer_logo,
        u.name as associate_name,
        sv.status as visit_status
      FROM invitations i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN developers d ON i.developer_id = d.id
      LEFT JOIN users u ON i.associate_id = u.id
      LEFT JOIN site_visits sv ON sv.invitation_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'admin') {
      sql += ' AND i.organization_id = ?';
      params.push(user.organization_id);
    } else if (user.role === 'sales_head') {
      sql += ' AND i.organization_id = ? AND (i.sales_head_id = ? OR i.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.organization_id, user.id, user.id);
    } else if (user.role === 'sales_associate') {
      sql += ' AND i.organization_id = ? AND i.associate_id = ?';
      params.push(user.organization_id, user.id);
    }

    if (status) {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    if (project_id) {
      sql += ' AND i.project_id = ?';
      params.push(project_id);
    }

    if (search) {
      sql += ' AND (c.full_name LIKE ? OR p.name LIKE ? OR u.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY i.created_at DESC';

    const baseUrl = config.getBaseUrl(req);
    const invitations = db.all(sql, params).map(inv => ({
      ...inv,
      short_code: inv.short_code || inv.id.replace('inv-', ''),
      shortUrl: `${baseUrl}/i/${inv.short_code || inv.id.replace('inv-', '')}`,
      inviteUrl: `${baseUrl}/#invite=${inv.token}`
    }));
    return res.json({ invitations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// POST /api/invitations - Create new digital invitation
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const {
      customer_id, customer_name, customer_phone,
      project_id, developer_id, size, price,
      visit_date, visit_time, duration, location, maps_url, notes
    } = req.body;

    if (!project_id || !visit_date || !visit_time) {
      return res.status(400).json({ error: 'Project, visit date and visit time are required' });
    }

    const orgId = user.organization_id;
    let targetCustomerId = customer_id;

    // If new customer details provided inline, create customer record first
    if (!targetCustomerId && customer_name && customer_phone) {
      const cleanPhone = customer_phone.replace(/[^\d+]/g, '');
      let existingCust = db.get('SELECT id FROM customers WHERE organization_id = ? AND mobile_number = ?', [orgId, cleanPhone]);
      if (existingCust) {
        targetCustomerId = existingCust.id;
      } else {
        targetCustomerId = 'cust-' + crypto.randomUUID().slice(0, 8);
        const count = db.get('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [orgId]).cnt;
        db.run(
          `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, interested_project_id, assigned_associate_id, assigned_sales_head_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'visit_scheduled')`,
          [targetCustomerId, orgId, 'CUST-' + String(1001 + count), customer_name.trim(), cleanPhone, project_id, user.id, user.sales_head_id || null]
        );
      }
    }

    if (!targetCustomerId) {
      return res.status(400).json({ error: 'Valid customer is required' });
    }

    const cust = db.get('SELECT * FROM customers WHERE id = ?', [targetCustomerId]);
    const proj = db.get('SELECT * FROM projects WHERE id = ?', [project_id]);
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const invId = 'inv-' + crypto.randomUUID().slice(0, 8);
    const shortCode = crypto.randomBytes(4).toString('base64url').replace(/[-_]/g, 'x').slice(0, 6).toUpperCase();
    // Secure unguessable token
    const token = 'inv_' + crypto.randomBytes(18).toString('hex');
    const visitLocation = location || proj.location;
    const mapsLink = maps_url || proj.google_maps_url || '';
    const baseUrl = config.getBaseUrl(req);
    const shortUrl = `${baseUrl}/i/${shortCode}`;
    const inviteUrl = `${baseUrl}/#invite=${token}`;

    // Generate initial QR code encoded with short URL for fastest instant mobile scan
    const checkInPayload = JSON.stringify({ token, invitation_id: invId, customer_id: targetCustomerId, visit_date, short_code: shortCode, short_url: shortUrl });
    const qrCodeData = await generateQRCodeDataURL(checkInPayload);

    // Insert invitation
    db.run(
      `INSERT INTO invitations (
        id, organization_id, token, short_code, customer_id, project_id, developer_id, associate_id, sales_head_id,
        visit_date, visit_time, duration, location, maps_url, size, price, notes, qr_code_data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [
        invId, orgId, token, shortCode, targetCustomerId, project_id, developer_id || proj.developer_id,
        user.id, user.sales_head_id || null, visit_date, visit_time, duration || 60,
        visitLocation, mapsLink, size || proj.super_built_up_area || '', price || proj.starting_price || '',
        notes || '', qrCodeData
      ]
    );

    // Create synchronized site_visit entry
    const visitId = 'vis-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO site_visits (
        id, organization_id, invitation_id, customer_id, project_id, associate_id, sales_head_id,
        scheduled_date, scheduled_time, duration, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')`,
      [
        visitId, orgId, invId, targetCustomerId, project_id,
        user.id, user.sales_head_id || null, visit_date, visit_time, duration || 60
      ]
    );

    // Update customer status to visit_scheduled
    db.run("UPDATE customers SET status = 'visit_scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [targetCustomerId]);

    // Timeline entry
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Invitation Sent', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), targetCustomerId, user.id, `Created site visit invitation for ${proj.name} on ${visit_date} at ${visit_time}`]
    );

    // Automated WhatsApp trigger with short link
    const orgSettings = db.get('SELECT agency_name FROM organization_settings WHERE organization_id = ?', [orgId]);

    whatsappService.notifyInvitationCreated({
      organizationId: orgId,
      customerName: cust.full_name,
      customerPhone: cust.mobile_number,
      projectName: proj.name,
      visitDate: visit_date,
      visitTime: visit_time,
      invitationLink: shortUrl,
      agencyName: orgSettings?.agency_name || 'Visit Studio Realty'
    }).catch(err => console.error('Automated WA error:', err));

    logActivity(req, 'CREATE_INVITATION', 'invitations', invId, `Created invitation for ${cust.full_name} to ${proj.name}`);

    const devRecord = (developer_id || proj.developer_id)
      ? db.get('SELECT name FROM developers WHERE id = ?', [developer_id || proj.developer_id])
      : null;

    return res.status(201).json({
      message: 'Invitation created and dispatched successfully',
      invitation: {
        id: invId,
        token,
        short_code: shortCode,
        shortUrl,
        inviteUrl,
        customer_name: cust.full_name,
        customer_phone: cust.mobile_number,
        project_name: proj.name,
        developer_name: devRecord?.name || 'Luxury Developer',
        size: size || proj.super_built_up_area || '',
        price: price || proj.starting_price || '',
        location: visitLocation,
        maps_url: mapsLink,
        visit_date,
        visit_time,
        duration: Number(duration || 60),
        notes: notes || '',
        advisor_name: user.name,
        advisor_phone: user.phone || '',
        agency_name: orgSettings?.agency_name || 'Visit Studio Realty',
        qr_code_data: qrCodeData
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// PATCH /api/invitations/:id/reschedule - Staff reschedules visit
router.patch('/:id/reschedule', (req, res) => {
  try {
    const { visit_date, visit_time, notes } = req.body;
    if (!visit_date || !visit_time) {
      return res.status(400).json({ error: 'New visit date and time are required' });
    }

    const inv = db.get('SELECT * FROM invitations WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    db.run(
      `UPDATE invitations SET visit_date = ?, visit_time = ?, notes = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [visit_date, visit_time, notes || inv.notes, inv.id]
    );

    db.run(
      `UPDATE site_visits SET scheduled_date = ?, scheduled_time = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE invitation_id = ?`,
      [visit_date, visit_time, inv.id]
    );

    const cust = db.get('SELECT full_name, mobile_number FROM customers WHERE id = ?', [inv.customer_id]);
    const proj = db.get('SELECT name FROM projects WHERE id = ?', [inv.project_id]);

    if (cust && proj) {
      const baseUrl = config.getBaseUrl(req);
      const inviteUrl = `${baseUrl}/#invite=${inv.token}`;
      whatsappService.notifyVisitRescheduled({
        organizationId: inv.organization_id,
        customerName: cust.full_name,
        customerPhone: cust.mobile_number,
        projectName: proj.name,
        newDate: visit_date,
        newTime: visit_time,
        invitationLink: inviteUrl
      }).catch(err => console.error('WA Reschedule notification error:', err));
    }

    logActivity(req, 'RESCHEDULE_INVITATION', 'invitations', inv.id, `Rescheduled to ${visit_date} at ${visit_time}`);

    return res.json({ success: true, message: 'Visit rescheduled and customer notified' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// GET /api/invitations/:id - Get single invitation details
router.get('/:id', (req, res) => {
  try {
    const inv = db.get(`
      SELECT i.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        p.project_logo as project_logo,
        d.name as developer_name,
        d.company_logo as developer_logo,
        u.name as associate_name
      FROM invitations i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN developers d ON i.developer_id = d.id
      LEFT JOIN users u ON i.associate_id = u.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (!inv) return res.status(404).json({ error: 'Invitation not found' });
    const shortCode = inv.short_code || inv.id.replace('inv-', '');
    const baseUrl = config.getBaseUrl(req);
    return res.json({
      invitation: {
        ...inv,
        short_code: shortCode,
        shortUrl: `${baseUrl}/i/${shortCode}`,
        inviteUrl: `${baseUrl}/#invite=${inv.token}`
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// PUT /api/invitations/:id - Edit invitation details
router.put('/:id', (req, res) => {
  try {
    const { visit_date, visit_time, duration, size, price, location, maps_url, notes, status } = req.body;
    const inv = db.get('SELECT * FROM invitations WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    db.run(
      `UPDATE invitations SET
        visit_date = COALESCE(?, visit_date),
        visit_time = COALESCE(?, visit_time),
        duration = COALESCE(?, duration),
        size = COALESCE(?, size),
        price = COALESCE(?, price),
        location = COALESCE(?, location),
        maps_url = COALESCE(?, maps_url),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        visit_date ?? null,
        visit_time ?? null,
        duration ?? null,
        size ?? null,
        price ?? null,
        location ?? null,
        maps_url ?? null,
        notes ?? null,
        status ?? null,
        req.params.id
      ]
    );

    // Sync site_visit if date/time or status changed
    if (visit_date || visit_time || status) {
      db.run(
        `UPDATE site_visits SET
          scheduled_date = COALESCE(?, scheduled_date),
          scheduled_time = COALESCE(?, scheduled_time),
          duration = COALESCE(?, duration),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
         WHERE invitation_id = ?`,
        [visit_date ?? null, visit_time ?? null, duration ?? null, status ?? null, req.params.id]
      );
    }

    logActivity(req, 'UPDATE_INVITATION', 'invitations', req.params.id, 'Updated invitation details');
    return res.json({ success: true, message: 'Invitation updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




// DELETE /api/invitations/:id - Revoke or permanently delete invitation
router.delete('/:id', (req, res) => {
  try {
    const { permanent } = req.query;
    const inv = db.get('SELECT * FROM invitations WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    if (permanent === 'true') {
      db.run('DELETE FROM site_visits WHERE invitation_id = ?', [inv.id]);
      db.run('DELETE FROM invitations WHERE id = ?', [inv.id]);
      logActivity(req, 'DELETE_INVITATION', 'invitations', inv.id, 'Permanently deleted invitation');
      return res.json({ success: true, message: 'Invitation deleted permanently' });
    } else {
      db.run("UPDATE invitations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);
      db.run("UPDATE site_visits SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE invitation_id = ?", [inv.id]);
      logActivity(req, 'REVOKE_INVITATION', 'invitations', inv.id, 'Revoked customer invitation link');
      return res.json({ success: true, message: 'Invitation link revoked' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});




module.exports = router;
