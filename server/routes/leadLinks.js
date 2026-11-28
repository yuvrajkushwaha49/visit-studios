const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { sanitizeText } = require('../validators/leadValidators');
const {
  getOrgLeadSettings,
  createTrackingLink,
  getTrackingLinkById,
  canAccessTrackingLink,
  buildLinkShareUrls
} = require('../services/trackingLinkService');

router.use(authenticate);

// GET /api/lead-links/campaigns - List campaigns for organization
router.get('/campaigns', (req, res) => {
  try {
    const user = req.user;
    const orgId = user.role === 'super_admin' ? (req.query.organization_id || user.organization_id) : user.organization_id;
    const settings = orgId ? getOrgLeadSettings(orgId) : null;

    let sql = `
      SELECT c.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM tracking_links tl WHERE tl.campaign_id = c.id) as links_count,
        (SELECT COUNT(*) FROM leads l WHERE l.campaign_id = c.id) as leads_count
      FROM campaigns c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (orgId) {
      sql += ' AND c.organization_id = ?';
      params.push(orgId);
    } else if (user.role !== 'super_admin') {
      sql += ' AND 1=0';
    }
    sql += ' ORDER BY c.created_at DESC';

    const campaigns = db.all(sql, params);
    return res.json({
      campaigns,
      campaignsEnabled: settings ? Boolean(settings.campaigns_enabled) : true
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-links/campaigns - Create campaign (Admin, Sales Head, Super Admin)
router.post('/campaigns', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const user = req.user;
    const orgId = user.role === 'super_admin' ? (req.body.organization_id || user.organization_id) : user.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });

    const name = sanitizeText(req.body.name, 160);
    if (!name) return res.status(400).json({ error: 'Campaign name is required.' });

    const campId = 'camp-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO campaigns (id, organization_id, name, code, source_channel, description, status, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        campId,
        orgId,
        name,
        sanitizeText(req.body.code, 60) || name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 24),
        sanitizeText(req.body.source_channel, 80) || 'Digital',
        sanitizeText(req.body.description, 500),
        sanitizeText(req.body.start_date, 32) || null,
        sanitizeText(req.body.end_date, 32) || null,
        user.id
      ]
    );

    logActivity(req, 'CREATE_CAMPAIGN', 'campaigns', campId, `Created campaign ${name}`);
    const campaign = db.get('SELECT * FROM campaigns WHERE id = ?', [campId]);
    return res.status(201).json({ success: true, campaign });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/lead-links - List tracking links scoped by role hierarchy + pagination
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const clauses = ['1=1'];
    const params = [];

    if (user.role === 'super_admin') {
      if (req.query.organization_id) {
        clauses.push('tl.organization_id = ?');
        params.push(sanitizeText(req.query.organization_id, 64));
      }
    } else if (user.role === 'admin') {
      clauses.push('tl.organization_id = ?');
      params.push(user.organization_id);
    } else if (user.role === 'sales_head') {
      clauses.push('tl.organization_id = ? AND (tl.creator_user_id = ? OR tl.owner_sales_head_id = ? OR tl.owner_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))');
      params.push(user.organization_id, user.id, user.id, user.id);
    } else if (user.role === 'sales_associate') {
      clauses.push('tl.organization_id = ? AND (tl.creator_user_id = ? OR tl.owner_associate_id = ?)');
      params.push(user.organization_id, user.id, user.id);
    } else {
      clauses.push('1=0');
    }

    if (req.query.project_id) {
      clauses.push('tl.project_id = ?');
      params.push(sanitizeText(req.query.project_id, 64));
    }
    if (req.query.developer_id) {
      clauses.push('p.developer_id = ?');
      params.push(sanitizeText(req.query.developer_id, 64));
    }
    if (req.query.campaign_id) {
      clauses.push('tl.campaign_id = ?');
      params.push(sanitizeText(req.query.campaign_id, 64));
    }
    const teamId = sanitizeText(req.query.sales_head_id || req.query.team_id, 64);
    if (teamId && user.role !== 'sales_associate') {
      clauses.push('(tl.owner_sales_head_id = ? OR tl.creator_user_id = ? OR tl.owner_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))');
      params.push(teamId, teamId, teamId);
    }
    const assocId = sanitizeText(req.query.associate_id, 64);
    if (assocId && user.role !== 'sales_associate') {
      clauses.push('(tl.owner_associate_id = ? OR tl.creator_user_id = ?)');
      params.push(assocId, assocId);
    }
    if (req.query.date_from && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date_from)) {
      clauses.push('date(tl.created_at) >= ?');
      params.push(req.query.date_from);
    }
    if (req.query.date_to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date_to)) {
      clauses.push('date(tl.created_at) <= ?');
      params.push(req.query.date_to);
    }
    if (req.query.is_active === '1' || req.query.is_active === '0') {
      clauses.push('tl.is_active = ?');
      params.push(Number(req.query.is_active));
    }
    if (req.query.search && String(req.query.search).trim()) {
      const term = `%${String(req.query.search).trim()}%`;
      clauses.push(`(COALESCE(tl.title, '') LIKE ? OR tl.short_code LIKE ? OR COALESCE(p.name, '') LIKE ? OR COALESCE(ua.name, '') LIKE ? OR COALESCE(uc.name, '') LIKE ?)`);
      params.push(term, term, term, term, term);
    }

    const whereSql = clauses.join(' AND ');
    const totalRow = db.get(
      `SELECT COUNT(*) as total
       FROM tracking_links tl
       LEFT JOIN projects p ON tl.project_id = p.id
       LEFT JOIN users uc ON tl.creator_user_id = uc.id
       LEFT JOIN users ua ON tl.owner_associate_id = ua.id
       WHERE ${whereSql}`,
      params
    );
    const total = totalRow?.total || 0;

    const rows = db.all(
      `SELECT tl.*,
         p.name as project_name,
         p.location as project_location,
         d.name as developer_name,
         c.name as campaign_name,
         uc.name as creator_name,
         ua.name as owner_associate_name,
         uh.name as owner_sales_head_name,
         (SELECT COUNT(*) FROM campaign_events ce WHERE ce.tracking_link_id = tl.id AND ce.event_type = 'link_opened') as total_opens,
         (SELECT COUNT(DISTINCT ce.visitor_hash) FROM campaign_events ce WHERE ce.tracking_link_id = tl.id AND ce.event_type = 'link_opened' AND ce.visitor_hash IS NOT NULL) as unique_opens,
         (SELECT COUNT(*) FROM campaign_events ce WHERE ce.tracking_link_id = tl.id AND ce.event_type = 'form_started') as form_starts,
         (SELECT COUNT(*) FROM leads l WHERE l.tracking_link_id = tl.id) as total_submissions,
         (SELECT COUNT(DISTINCT l.customer_id) FROM leads l WHERE l.tracking_link_id = tl.id) as unique_submissions
       FROM tracking_links tl
       LEFT JOIN projects p ON tl.project_id = p.id
       LEFT JOIN developers d ON p.developer_id = d.id
       LEFT JOIN campaigns c ON tl.campaign_id = c.id
       LEFT JOIN users uc ON tl.creator_user_id = uc.id
       LEFT JOIN users ua ON tl.owner_associate_id = ua.id
       LEFT JOIN users uh ON tl.owner_sales_head_id = uh.id
       WHERE ${whereSql}
       ORDER BY tl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const links = rows.map(link => ({
      ...link,
      ...buildLinkShareUrls(req, link)
    }));

    return res.json({
      links,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-links - Generate a new secure trackable enquiry link
router.post('/', (req, res) => {
  try {
    const link = createTrackingLink({
      user: req.user,
      organizationId: req.body.organization_id,
      projectId: req.body.project_id || null,
      campaignId: req.body.campaign_id || null,
      title: req.body.title || '',
      sourceName: req.body.source_name || 'Enquiry Link',
      linkType: req.body.link_type || 'advisor',
      advisorDisplayName: req.body.advisor_display_name || null,
      advisorDisplayPhone: req.body.advisor_display_phone || null,
      expiresAt: req.body.expires_at || null,
      ownerAssociateId: req.body.owner_associate_id || null
    });

    logActivity(req, 'CREATE_TRACKING_LINK', 'tracking_links', link.id, `Generated enquiry link ${link.short_code}`);

    return res.status(201).json({
      success: true,
      message: 'Trackable enquiry link generated successfully.',
      link: {
        ...link,
        ...buildLinkShareUrls(req, link)
      }
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/lead-links/:id - Get link details
router.get('/:id', (req, res) => {
  try {
    const link = getTrackingLinkById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Tracking link not found.' });
    if (!canAccessTrackingLink(req.user, link)) {
      return res.status(403).json({ error: 'Unauthorized to view this tracking link.' });
    }
    return res.json({
      link: {
        ...link,
        ...buildLinkShareUrls(req, link)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/lead-links/:id - Update link title, project, campaign, source, expiration, or active status
router.patch('/:id', (req, res) => {
  try {
    const existing = getTrackingLinkById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tracking link not found.' });
    if (!canAccessTrackingLink(req.user, existing)) {
      return res.status(403).json({ error: 'Unauthorized to update this tracking link.' });
    }

    const title = req.body.title !== undefined ? sanitizeText(req.body.title, 180) : existing.title;
    const linkType = req.body.link_type !== undefined
      ? (sanitizeText(req.body.link_type, 40) === 'bulk_whatsapp' ? 'bulk_whatsapp' : 'advisor')
      : (existing.link_type || 'advisor');
    if (req.body.link_type !== undefined && linkType === 'bulk_whatsapp' && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin users can set Bulk WhatsApp Marketing link type.' });
    }
    const sourceName = req.body.source_name !== undefined ? (sanitizeText(req.body.source_name, 100) || existing.source_name) : existing.source_name;
    const advisorDisplayName = linkType === 'bulk_whatsapp'
      ? ((req.body.advisor_display_name !== undefined ? sanitizeText(req.body.advisor_display_name, 120) : existing.advisor_display_name) || 'Aiswarya')
      : (req.body.advisor_display_name !== undefined ? (sanitizeText(req.body.advisor_display_name, 120) || null) : (req.body.link_type === 'advisor' ? null : existing.advisor_display_name));
    const advisorDisplayPhone = linkType === 'bulk_whatsapp'
      ? ((req.body.advisor_display_phone !== undefined ? sanitizeText(req.body.advisor_display_phone, 32) : existing.advisor_display_phone) || '9289846060')
      : (req.body.advisor_display_phone !== undefined ? (sanitizeText(req.body.advisor_display_phone, 32) || null) : (req.body.link_type === 'advisor' ? null : existing.advisor_display_phone));
    const isActive = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : existing.is_active;

    let projectId = existing.project_id;
    if (req.body.project_id !== undefined) {
      const nextProjId = sanitizeText(req.body.project_id, 64) || null;
      if (nextProjId) {
        const proj = db.get('SELECT id FROM projects WHERE id = ? AND organization_id = ?', [nextProjId, existing.organization_id]);
        if (!proj) return res.status(400).json({ error: 'Selected project does not belong to this organization.' });
      }
      projectId = nextProjId;
    }

    let campaignId = existing.campaign_id;
    if (req.body.campaign_id !== undefined) {
      const nextCampId = sanitizeText(req.body.campaign_id, 64) || null;
      if (nextCampId) {
        const camp = db.get('SELECT id FROM campaigns WHERE id = ? AND organization_id = ?', [nextCampId, existing.organization_id]);
        if (!camp) return res.status(400).json({ error: 'Selected campaign does not belong to this organization.' });
      }
      campaignId = nextCampId;
    }

    let expiresAt = existing.expires_at;
    if (req.body.expires_at !== undefined) {
      if (!req.body.expires_at) {
        expiresAt = null;
      } else {
        const dt = new Date(req.body.expires_at);
        if (Number.isNaN(dt.getTime())) {
          return res.status(400).json({ error: 'Invalid expiration timestamp.' });
        }
        expiresAt = dt.toISOString().replace('T', ' ').slice(0, 19);
      }
    }

    db.run(
      `UPDATE tracking_links
       SET title = ?, project_id = ?, campaign_id = ?, source_name = ?, link_type = ?, advisor_display_name = ?, advisor_display_phone = ?, is_active = ?, expires_at = ?,
           deactivated_at = CASE WHEN ? = 0 AND is_active = 1 THEN CURRENT_TIMESTAMP WHEN ? = 1 THEN NULL ELSE deactivated_at END,
           deactivated_by = CASE WHEN ? = 0 AND is_active = 1 THEN ? WHEN ? = 1 THEN NULL ELSE deactivated_by END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, projectId, campaignId, sourceName, linkType, advisorDisplayName, advisorDisplayPhone, isActive, expiresAt, isActive, isActive, isActive, req.user.id, isActive, existing.id]
    );

    logActivity(req, 'UPDATE_TRACKING_LINK', 'tracking_links', existing.id, `Updated link ${existing.short_code} (active=${isActive})`);
    const updated = getTrackingLinkById(existing.id);
    return res.json({
      success: true,
      link: {
        ...updated,
        ...buildLinkShareUrls(req, updated)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-links/:id/deactivate - Deactivate tracking link
router.post('/:id/deactivate', (req, res) => {
  try {
    const existing = getTrackingLinkById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tracking link not found.' });
    if (!canAccessTrackingLink(req.user, existing)) {
      return res.status(403).json({ error: 'Unauthorized to deactivate this tracking link.' });
    }

    db.run(
      `UPDATE tracking_links SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP, deactivated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.user.id, existing.id]
    );
    logActivity(req, 'DEACTIVATE_TRACKING_LINK', 'tracking_links', existing.id, `Deactivated link ${existing.short_code}`);
    const updated = getTrackingLinkById(existing.id);
    return res.json({ success: true, link: { ...updated, ...buildLinkShareUrls(req, updated) } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/lead-links/:id/analytics - Performance funnel and recent submissions for a link
router.get('/:id/analytics', (req, res) => {
  try {
    const link = getTrackingLinkById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Tracking link not found.' });
    if (!canAccessTrackingLink(req.user, link)) {
      return res.status(403).json({ error: 'Unauthorized to view analytics for this tracking link.' });
    }

    const eventCounts = db.all(
      `SELECT event_type, COUNT(*) as total, COUNT(DISTINCT visitor_hash) as unique_visitors
       FROM campaign_events
       WHERE tracking_link_id = ?
       GROUP BY event_type`,
      [link.id]
    );

    const dailyTrend = db.all(
      `SELECT date(created_at) as date,
         SUM(CASE WHEN event_type = 'link_opened' THEN 1 ELSE 0 END) as opens,
         SUM(CASE WHEN event_type = 'form_started' THEN 1 ELSE 0 END) as starts,
         SUM(CASE WHEN event_type = 'submission_successful' THEN 1 ELSE 0 END) as submissions,
         SUM(CASE WHEN event_type = 'duplicate_detected' THEN 1 ELSE 0 END) as duplicates
       FROM campaign_events
       WHERE tracking_link_id = ?
       GROUP BY date(created_at)
       ORDER BY date(created_at) ASC
       LIMIT 30`,
      [link.id]
    );

    const recentLeads = db.all(
      `SELECT l.id, l.enquiry_ref, l.stage, l.apartment_size, l.duplicate_status, l.submitted_at,
         c.full_name as customer_name, p.name as project_name
       FROM leads l
       JOIN customers c ON l.customer_id = c.id
       LEFT JOIN projects p ON l.project_id = p.id
       WHERE l.tracking_link_id = ?
       ORDER BY l.submitted_at DESC
       LIMIT 20`,
      [link.id]
    );

    const opens = Number(link.total_opens || 0);
    const uniqueOpens = Number(link.unique_opens || 0);
    const submissions = Number(link.total_submissions || 0);
    const uniqueSubmissions = Number(link.unique_submissions || 0);

    return res.json({
      link: { ...link, ...buildLinkShareUrls(req, link) },
      metrics: {
        totalOpens: opens,
        uniqueOpens,
        formStarts: Number(link.form_starts || 0),
        totalSubmissions: submissions,
        uniqueSubmissions,
        visitToSubmissionRate: opens > 0 ? Number(((submissions / opens) * 100).toFixed(1)) : 0,
        uniqueVisitToSubmissionRate: uniqueOpens > 0 ? Number(((uniqueSubmissions / uniqueOpens) * 100).toFixed(1)) : 0
      },
      eventCounts,
      dailyTrend,
      recentLeads
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
