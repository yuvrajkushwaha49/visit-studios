const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { generateQRCodeDataURL } = require('../services/qrService');
const { generateInvitationExcel } = require('../services/exportService');
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
        // Price is not shown on the public invitation link
        discussed_price: null,
        visit_date: inv.visit_date ? String(inv.visit_date).slice(0, 10) : inv.visit_date,
        visit_time: inv.visit_time,
        duration: inv.duration,
        notes: inv.notes,
        advisor_name: inv.advisor_name,
        advisor_phone: inv.advisor_phone,
        agency_name: '',
        agency_subtitle: '',
        agency_logo: null,
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

function invitationDateRange(preset, dateFrom, dateTo) {
  const ymd = (d) => {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };
  const now = new Date();
  const shift = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return ymd(d);
  };

  if (preset === 'today') {
    const d = ymd(now);
    return { from: d, to: d };
  }
  if (preset === 'tomorrow') {
    const d = shift(1);
    return { from: d, to: d };
  }
  if (preset === 'this_week') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + mondayOffset + 6);
    return { from: shift(mondayOffset), to: ymd(endDate) };
  }
  if (preset === 'this_month') {
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    };
  }
  if (preset === 'last_7_days') return { from: shift(-6), to: ymd(now) };
  if (preset === 'last_30_days') return { from: shift(-29), to: ymd(now) };
  if (preset === 'custom' || (!preset && (dateFrom || dateTo))) {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(dateFrom || '') ? dateFrom : '';
    const to = /^\d{4}-\d{2}-\d{2}$/.test(dateTo || '') ? dateTo : '';
    if (!from && !to) return null;
    return { from: from || '0000-01-01', to: to || '9999-12-31' };
  }
  return null;
}

function listInvitations(user, query) {
    const { status, project_id, developer_id, search, period, date_from, date_to } = query;
    const allowedStatuses = new Set(['draft', 'sent', 'opened', 'confirmed', 'reschedule_requested', 'cancelled', 'expired']);
    const cleanList = (value) => String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(item => /^[A-Za-z0-9_-]{1,80}$/.test(item))
      .slice(0, 50);
    const unique = (items) => [...new Set(items)];
    const teamIds = unique(cleanList(query.team_ids || query.team_id || query.sales_head_id));
    const associateIds = unique(cleanList(query.associate_ids || query.associate_id));
    const projectIds = unique([...cleanList(query.project_ids), ...cleanList(project_id)]);
    const developerIds = unique([...cleanList(query.developer_ids), ...cleanList(developer_id)]);
    const statuses = unique([...cleanList(query.statuses), ...cleanList(status)].filter(item => allowedStatuses.has(item)));

    let sql = `
      SELECT i.*,
        c.full_name as customer_name,
        c.mobile_number as customer_phone,
        p.name as project_name,
        p.project_logo as project_logo,
        d.name as developer_name,
        d.company_logo as developer_logo,
        u.name as associate_name,
        u.role as associate_role,
        CASE
          WHEN u.role = 'sales_head' THEN u.id
          ELSE COALESCE(i.sales_head_id, u.sales_head_id)
        END as team_id,
        sh.name as team_name,
        sv.status as visit_status
      FROM invitations i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN developers d ON i.developer_id = d.id
      LEFT JOIN users u ON i.associate_id = u.id
      LEFT JOIN users sh ON sh.id = CASE
        WHEN u.role = 'sales_head' THEN u.id
        ELSE COALESCE(i.sales_head_id, u.sales_head_id)
      END
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

    const addIn = (expression, values) => {
      if (!values.length) return;
      sql += ` AND ${expression} IN (${values.map(() => '?').join(',')})`;
      params.push(...values);
    };

    addIn(`CASE WHEN u.role = 'sales_head' THEN u.id ELSE COALESCE(i.sales_head_id, u.sales_head_id) END`, teamIds);
    addIn('i.associate_id', associateIds);
    addIn('i.project_id', projectIds);
    addIn('COALESCE(i.developer_id, p.developer_id)', developerIds);
    addIn('i.status', statuses);

    const range = invitationDateRange(period, date_from, date_to);
    if (range) {
      sql += ' AND i.visit_date >= ? AND i.visit_date <= ?';
      params.push(range.from, range.to);
    }

    if (search && String(search).trim()) {
      sql += ' AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR p.name LIKE ? OR u.name LIKE ? OR sh.name LIKE ?)';
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY i.created_at DESC';

    return db.all(sql, params);
}

function invitationDirectory(user, query) {
  let sql = `
    SELECT u.id, u.name, u.role, u.sales_head_id,
      CASE WHEN u.role = 'sales_head' THEN u.name ELSE sh.name END as team_name
    FROM users u
    LEFT JOIN users sh ON sh.id = u.sales_head_id
    WHERE u.status = 'active' AND u.role IN ('sales_head', 'sales_associate')
  `;
  const params = [];

  if (user.role === 'admin') {
    sql += ' AND u.organization_id = ?';
    params.push(user.organization_id);
  } else if (user.role === 'sales_head') {
    sql += ' AND u.organization_id = ? AND (u.id = ? OR u.sales_head_id = ?)';
    params.push(user.organization_id, user.id, user.id);
  } else if (user.role === 'sales_associate') {
    sql += ' AND (u.id = ? OR u.id = ?)';
    params.push(user.id, user.sales_head_id || '');
  }

  sql += ' ORDER BY u.name';
  let people = db.all(sql, params);

  const cleanList = (value) => [...new Set(String(value || '').split(',').map(item => item.trim()).filter(item => /^[A-Za-z0-9_-]{1,80}$/.test(item)))];
  const teamIds = cleanList(query.team_ids);
  const associateIds = cleanList(query.associate_ids);

  if (teamIds.length) {
    people = people.filter(person => teamIds.includes(person.role === 'sales_head' ? person.id : person.sales_head_id));
  }
  if (associateIds.length) {
    const selected = new Set(associateIds);
    const headIds = new Set(people.filter(person => person.role === 'sales_associate' && selected.has(person.id)).map(person => person.sales_head_id).filter(Boolean));
    people = people.filter(person => selected.has(person.id) || (person.role === 'sales_head' && headIds.has(person.id)));
  }

  return people;
}

// GET /api/invitations - List staff invitations according to RBAC
router.get('/', (req, res) => {
  try {
    const baseUrl = config.getBaseUrl(req);
    const invitations = listInvitations(req.user, req.query).map(inv => ({
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

// GET /api/invitations/export/excel - Multi-sheet invitation workbook
router.get('/export/excel', async (req, res) => {
  try {
    const invitations = listInvitations(req.user, req.query);
    const range = invitationDateRange(req.query.period, req.query.date_from, req.query.date_to);
    const buffer = await generateInvitationExcel(invitations, {
      generatedBy: req.user.name,
      role: req.user.role,
      period: req.query.period || 'all',
      dateFrom: range?.from || null,
      dateTo: range?.to || null,
      directory: invitationDirectory(req.user, req.query)
    });
    const filename = `digital_invitations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
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
      visit_date, visit_time, duration, location, maps_url, notes, theme
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

    // Insert invitation (with self-healing auto-migration if theme column is missing on older databases)
    try {
      db.run(
        `INSERT INTO invitations (
          id, organization_id, token, short_code, customer_id, project_id, developer_id, associate_id, sales_head_id,
          visit_date, visit_time, duration, location, maps_url, size, price, notes, qr_code_data, theme, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
        [
          invId, orgId, token, shortCode, targetCustomerId, project_id, developer_id || proj.developer_id,
          user.id, user.sales_head_id || null, visit_date, visit_time, duration || 60,
          visitLocation, mapsLink, size || proj.super_built_up_area || '', price || proj.starting_price || '',
          notes || '', qrCodeData, theme || null
        ]
      );
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('has no column named theme')) {
        try { db.exec('ALTER TABLE invitations ADD COLUMN theme TEXT;'); } catch (_) {}
        db.run(
          `INSERT INTO invitations (
            id, organization_id, token, short_code, customer_id, project_id, developer_id, associate_id, sales_head_id,
            visit_date, visit_time, duration, location, maps_url, size, price, notes, qr_code_data, theme, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
          [
            invId, orgId, token, shortCode, targetCustomerId, project_id, developer_id || proj.developer_id,
            user.id, user.sales_head_id || null, visit_date, visit_time, duration || 60,
            visitLocation, mapsLink, size || proj.super_built_up_area || '', price || proj.starting_price || '',
            notes || '', qrCodeData, theme || null
          ]
        );
      } else {
        throw insertErr;
      }
    }

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
