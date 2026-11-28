const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { DEFAULT_LEAD_STAGES, sanitizeText } = require('../validators/leadValidators');
const { buildLeadWhereClause } = require('../services/leadReportService');
const {
  getLeadById,
  canAccessLead,
  createStaffLead,
  changeLeadStage,
  assignLead,
  createInvitationForLead
} = require('../services/leadService');

router.use(authenticate);

// GET /api/leads/stages - Configured lead stages
router.get('/stages', (req, res) => {
  return res.json({ stages: DEFAULT_LEAD_STAGES });
});

// GET /api/leads/duplicates - Authorized duplicate review queue
router.get('/duplicates', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const user = req.user;
    const { whereSql, params } = buildLeadWhereClause(user, req.query, 'l');
    const duplicates = db.all(
      `SELECT l.*,
         c.full_name as customer_name, c.mobile_number as customer_mobile, c.customer_code,
         p.name as project_name,
         ua.name as assigned_associate_name,
         oa.name as original_associate_name,
         orig.enquiry_ref as original_enquiry_ref
       FROM leads l
       JOIN customers c ON l.customer_id = c.id
       LEFT JOIN projects p ON l.project_id = p.id
       LEFT JOIN users ua ON l.assigned_associate_id = ua.id
       LEFT JOIN users oa ON l.original_associate_id = oa.id
       LEFT JOIN leads orig ON l.duplicate_of_lead_id = orig.id
       WHERE ${whereSql}
         AND l.duplicate_status IN ('duplicate_flagged', 'existing_customer_new_project')
       ORDER BY l.submitted_at DESC
       LIMIT 100`,
      params
    );
    return res.json({ duplicates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/leads - List leads with server-side RBAC, filtering & pagination
router.get('/', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { whereSql, params } = buildLeadWhereClause(req.user, req.query, 'l');

    const totalRow = db.get(
      `SELECT COUNT(*) as total
       FROM leads l
       JOIN customers c ON l.customer_id = c.id
       LEFT JOIN projects p ON l.project_id = p.id
       WHERE ${whereSql}`,
      params
    );
    const total = totalRow?.total || 0;

    const leads = db.all(
      `SELECT l.*,
         c.full_name as customer_name,
         c.mobile_number as customer_mobile,
         c.email as customer_email,
         c.customer_code,
         p.name as project_name,
         d.name as developer_name,
         camp.name as campaign_name,
         ua.name as assigned_associate_name,
         ua.role as assigned_associate_role,
         sh.name as assigned_associate_team_name,
         uh.name as assigned_sales_head_name,
         oa.name as original_associate_name,
         oh.name as original_sales_head_name,
         lo.name as original_link_owner_name,
         sv.status as site_visit_status,
         inv.short_code as invitation_short_code
       FROM leads l
       JOIN customers c ON l.customer_id = c.id
       LEFT JOIN projects p ON l.project_id = p.id
       LEFT JOIN developers d ON p.developer_id = d.id
       LEFT JOIN campaigns camp ON l.campaign_id = camp.id
       LEFT JOIN users ua ON l.assigned_associate_id = ua.id
       LEFT JOIN users sh ON ua.sales_head_id = sh.id
       LEFT JOIN users uh ON l.assigned_sales_head_id = uh.id
       LEFT JOIN users oa ON l.original_associate_id = oa.id
       LEFT JOIN users oh ON l.original_sales_head_id = oh.id
       LEFT JOIN users lo ON l.original_link_owner_id = lo.id
       LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
       LEFT JOIN invitations inv ON l.invitation_id = inv.id
       WHERE ${whereSql}
       ORDER BY l.submitted_at DESC, l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Stage summary counts for the same scope/filters (excluding stage filter if requested)
    const stageQuery = { ...req.query };
    delete stageQuery.stage;
    const stageClause = buildLeadWhereClause(req.user, stageQuery, 'l');
    const stageCounts = db.all(
      `SELECT l.stage, COUNT(*) as count
       FROM leads l
       JOIN customers c ON l.customer_id = c.id
       LEFT JOIN projects p ON l.project_id = p.id
       WHERE ${stageClause.whereSql}
       GROUP BY l.stage`,
      stageClause.params
    );

    return res.json({
      leads,
      stageCounts,
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

// POST /api/leads - Create lead manually
router.post('/', (req, res) => {
  try {
    const lead = createStaffLead({ user: req.user, body: req.body || {}, req });
    return res.status(201).json({ success: true, lead });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/leads/:id - Lead details with history and assignments
router.get('/:id', (req, res) => {
  try {
    const lead = getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    if (!canAccessLead(req.user, lead)) {
      return res.status(403).json({ error: 'Unauthorized to access this lead.' });
    }

    const stageHistory = db.all(
      `SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
       FROM lead_stage_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = ?
       ORDER BY h.created_at DESC`,
      [lead.id]
    );

    const assignments = db.all(
      `SELECT a.*,
         pu.name as previous_owner_name,
         nu.name as new_owner_name,
         ph.name as previous_sales_head_name,
         nh.name as new_sales_head_name,
         cb.name as changed_by_name
       FROM lead_assignments a
       LEFT JOIN users pu ON a.previous_owner_id = pu.id
       LEFT JOIN users nu ON a.new_owner_id = nu.id
       LEFT JOIN users ph ON a.previous_sales_head_id = ph.id
       LEFT JOIN users nh ON a.new_sales_head_id = nh.id
       LEFT JOIN users cb ON a.changed_by = cb.id
       WHERE a.lead_id = ?
       ORDER BY a.created_at DESC`,
      [lead.id]
    );

    const followups = db.all(
      `SELECT f.*, u.name as associate_name
       FROM followups f
       LEFT JOIN users u ON f.associate_id = u.id
       WHERE f.lead_id = ? OR f.customer_id = ?
       ORDER BY f.follow_up_date DESC`,
      [lead.id, lead.customer_id]
    );

    return res.json({ lead, stageHistory, assignments, followups });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id - Update editable lead preferences (never mutates original attribution)
router.patch('/:id', (req, res) => {
  try {
    const existing = db.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Lead not found.' });
    if (!canAccessLead(req.user, existing)) {
      return res.status(403).json({ error: 'Unauthorized to edit this lead.' });
    }

    const projectId = req.body.project_id !== undefined ? (sanitizeText(req.body.project_id, 64) || null) : existing.project_id;
    if (projectId && projectId !== existing.project_id) {
      const proj = db.get('SELECT id FROM projects WHERE id = ? AND organization_id = ?', [projectId, existing.organization_id]);
      if (!proj) return res.status(400).json({ error: 'Project does not belong to this organization.' });
    }

    db.run(
      `UPDATE leads SET
        project_id = ?,
        apartment_size = ?,
        budget = ?,
        purchase_timeline = ?,
        preferred_callback_time = ?,
        city = ?,
        requirements = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        projectId,
        req.body.apartment_size !== undefined ? sanitizeText(req.body.apartment_size, 120) : existing.apartment_size,
        req.body.budget !== undefined ? sanitizeText(req.body.budget, 120) : existing.budget,
        req.body.purchase_timeline !== undefined ? sanitizeText(req.body.purchase_timeline, 120) : existing.purchase_timeline,
        req.body.preferred_callback_time !== undefined ? sanitizeText(req.body.preferred_callback_time, 120) : existing.preferred_callback_time,
        req.body.city !== undefined ? sanitizeText(req.body.city, 100) : existing.city,
        req.body.requirements !== undefined ? sanitizeText(req.body.requirements, 1000) : existing.requirements,
        existing.id
      ]
    );

    logActivity(req, 'UPDATE_LEAD', 'leads', existing.id, `Updated lead ${existing.enquiry_ref}`);
    return res.json({ success: true, lead: getLeadById(existing.id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id/stage - Transition pipeline stage
router.patch('/:id/stage', (req, res) => {
  try {
    const lead = changeLeadStage({
      leadId: req.params.id,
      newStage: sanitizeText(req.body.stage, 40),
      notes: req.body.notes || '',
      lossReason: req.body.loss_reason || '',
      user: req.user,
      req
    });
    return res.json({ success: true, lead });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/leads/:id/history - Stage history
router.get('/:id/history', (req, res) => {
  try {
    const lead = db.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    if (!canAccessLead(req.user, lead)) return res.status(403).json({ error: 'Unauthorized.' });

    const history = db.all(
      `SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
       FROM lead_stage_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = ?
       ORDER BY h.created_at DESC`,
      [lead.id]
    );
    return res.json({ history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/assign - Assign or reassign lead
router.post('/:id/assign', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const lead = assignLead({
      leadId: req.params.id,
      associateId: req.body.associate_id || null,
      salesHeadId: req.body.sales_head_id || null,
      reason: req.body.reason || '',
      user: req.user,
      req
    });
    return res.json({ success: true, lead });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/leads/:id/assignments - Assignment history
router.get('/:id/assignments', (req, res) => {
  try {
    const lead = db.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    if (!canAccessLead(req.user, lead)) return res.status(403).json({ error: 'Unauthorized.' });

    const assignments = db.all(
      `SELECT a.*,
         pu.name as previous_owner_name,
         nu.name as new_owner_name,
         ph.name as previous_sales_head_name,
         nh.name as new_sales_head_name,
         cb.name as changed_by_name
       FROM lead_assignments a
       LEFT JOIN users pu ON a.previous_owner_id = pu.id
       LEFT JOIN users nu ON a.new_owner_id = nu.id
       LEFT JOIN users ph ON a.previous_sales_head_id = ph.id
       LEFT JOIN users nh ON a.new_sales_head_id = nh.id
       LEFT JOIN users cb ON a.changed_by = cb.id
       WHERE a.lead_id = ?
       ORDER BY a.created_at DESC`,
      [lead.id]
    );
    return res.json({ assignments });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/schedule-visit - Create Invitation + Site Visit linked to Lead
router.post('/:id/schedule-visit', async (req, res) => {
  try {
    const result = await createInvitationForLead({
      leadId: req.params.id,
      visitDate: req.body.visit_date,
      visitTime: req.body.visit_time,
      duration: req.body.duration || 60,
      notes: req.body.notes || '',
      theme: req.body.theme || null,
      user: req.user,
      req
    });
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/leads/:id/duplicate-resolve - Mark duplicate enquiry as reviewed
router.post('/:id/duplicate-resolve', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const lead = db.get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    if (!canAccessLead(req.user, lead)) return res.status(403).json({ error: 'Unauthorized.' });

    const resolution = req.body.resolution === 'reviewed_merged' ? 'reviewed_merged' : 'reviewed_kept';
    db.run('UPDATE leads SET duplicate_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [resolution, lead.id]);
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Duplicate Reviewed', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), lead.customer_id, req.user.id, `Lead ${lead.enquiry_ref} marked ${resolution}. ${sanitizeText(req.body.notes, 300)}`]
    );
    logActivity(req, 'RESOLVE_DUPLICATE_LEAD', 'leads', lead.id, `Marked ${resolution}`);
    return res.json({ success: true, lead: getLeadById(lead.id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
