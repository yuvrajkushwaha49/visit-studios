const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { getOrgLeadSettings } = require('../services/trackingLinkService');
const { DEFAULT_LEAD_STAGES, sanitizeText } = require('../validators/leadValidators');

router.use(authenticate);

// GET /api/lead-settings - Fetch lead module settings for organization
router.get('/', (req, res) => {
  try {
    const orgId = req.user.role === 'super_admin'
      ? (req.query.organization_id || req.user.organization_id)
      : req.user.organization_id;

    if (!orgId) {
      return res.json({
        settings: {
          campaigns_enabled: 1,
          admin_link_assignment_policy: 'unassigned',
          sales_head_link_assignment_policy: 'team_pool',
          duplicate_policy: 'link_existing_customer_preserve_owner',
          timezone: 'Asia/Kolkata',
          strict_stage_transitions: 1,
          stages: DEFAULT_LEAD_STAGES
        }
      });
    }

    const row = getOrgLeadSettings(orgId);
    let stages = DEFAULT_LEAD_STAGES;
    if (row.stages_json) {
      try { stages = JSON.parse(row.stages_json); } catch (_) {}
    }

    return res.json({
      settings: {
        ...row,
        stages
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/lead-settings - Update lead module settings (Admin / Super Admin)
router.put('/', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const orgId = req.user.role === 'super_admin'
      ? (req.body.organization_id || req.user.organization_id)
      : req.user.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });

    const existing = getOrgLeadSettings(orgId);
    const campaignsEnabled = req.body.campaigns_enabled !== undefined ? (req.body.campaigns_enabled ? 1 : 0) : existing.campaigns_enabled;
    const adminPolicy = ['unassigned', 'round_robin'].includes(req.body.admin_link_assignment_policy)
      ? req.body.admin_link_assignment_policy
      : existing.admin_link_assignment_policy;
    const headPolicy = ['team_pool', 'round_robin'].includes(req.body.sales_head_link_assignment_policy)
      ? req.body.sales_head_link_assignment_policy
      : existing.sales_head_link_assignment_policy;
    const dupPolicy = ['link_existing_customer_preserve_owner', 'flag_for_review'].includes(req.body.duplicate_policy)
      ? req.body.duplicate_policy
      : existing.duplicate_policy;
    const timezone = sanitizeText(req.body.timezone, 64) || existing.timezone || 'Asia/Kolkata';
    const strictTransitions = req.body.strict_stage_transitions !== undefined
      ? (req.body.strict_stage_transitions ? 1 : 0)
      : existing.strict_stage_transitions;

    let stagesJson = existing.stages_json || JSON.stringify(DEFAULT_LEAD_STAGES);
    if (Array.isArray(req.body.stages) && req.body.stages.length > 0) {
      stagesJson = JSON.stringify(req.body.stages);
    }

    db.run(
      `UPDATE lead_settings SET
        campaigns_enabled = ?,
        admin_link_assignment_policy = ?,
        sales_head_link_assignment_policy = ?,
        duplicate_policy = ?,
        timezone = ?,
        strict_stage_transitions = ?,
        stages_json = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = ?`,
      [campaignsEnabled, adminPolicy, headPolicy, dupPolicy, timezone, strictTransitions, stagesJson, orgId]
    );

    logActivity(req, 'UPDATE_LEAD_SETTINGS', 'lead_settings', orgId, 'Updated Lead Management settings');
    const updated = getOrgLeadSettings(orgId);
    let stages = DEFAULT_LEAD_STAGES;
    try { stages = JSON.parse(updated.stages_json || '[]'); if (!stages.length) stages = DEFAULT_LEAD_STAGES; } catch (_) {}

    return res.json({ success: true, settings: { ...updated, stages } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
