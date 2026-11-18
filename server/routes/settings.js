const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

router.use(authenticate);

// GET /api/settings - Fetch organization branding settings
router.get('/', (req, res) => {
  try {
    const orgId = req.user.organization_id;
    let settings = db.get('SELECT * FROM organization_settings WHERE organization_id = ?', [orgId]);

    if (!settings) {
      const id = 'sett-' + orgId;
      db.run(
        `INSERT INTO organization_settings (id, organization_id, agency_name, agency_subtitle, brand_color, accent_color)
         VALUES (?, ?, 'Visit Studio Realty', 'Luxury Real Estate Advisory', '#1e1b4b', '#f59e0b')`,
        [id, orgId]
      );
      settings = db.get('SELECT * FROM organization_settings WHERE organization_id = ?', [orgId]);
    }

    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings - Update organization branding settings
router.put('/', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const {
      agency_name,
      agency_subtitle,
      logo_url,
      brand_color,
      accent_color
    } = req.body;

    const existing = db.get('SELECT id FROM organization_settings WHERE organization_id = ?', [orgId]);

    if (existing) {
      db.run(
        `UPDATE organization_settings SET
          agency_name = COALESCE(?, agency_name),
          agency_subtitle = COALESCE(?, agency_subtitle),
          logo_url = COALESCE(?, logo_url),
          brand_color = COALESCE(?, brand_color),
          accent_color = COALESCE(?, accent_color),
          updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ?`,
        [agency_name, agency_subtitle, logo_url, brand_color, accent_color, orgId]
      );
    } else {
      db.run(
        `INSERT INTO organization_settings (
          id, organization_id, agency_name, agency_subtitle, logo_url, brand_color, accent_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'sett-' + orgId, orgId, agency_name || 'Visit Studio Realty', agency_subtitle || 'Luxury Real Estate Advisory',
          logo_url || null, brand_color || '#1e1b4b', accent_color || '#f59e0b'
        ]
      );
    }

    logActivity(req, 'UPDATE_SETTINGS', 'organization_settings', orgId, 'Updated organization branding settings');
    return res.json({ success: true, message: 'Organization brand settings updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
