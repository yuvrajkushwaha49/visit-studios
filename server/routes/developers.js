const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

router.use(authenticate);

// GET /api/developers - List developers for current org
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const orgId = user.role === 'super_admin' ? (req.query.organization_id || user.organization_id) : user.organization_id;

    const devs = db.all(`
      SELECT d.*,
        (SELECT COUNT(*) FROM projects p WHERE p.developer_id = d.id) as total_projects
      FROM developers d
      WHERE d.organization_id = ?
      ORDER BY d.name
    `, [orgId]);

    // Attach projects summary for each developer
    for (const dev of devs) {
      dev.projects = db.all('SELECT id, name, starting_price, location, status FROM projects WHERE developer_id = ?', [dev.id]);
    }

    return res.json({ developers: devs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/developers - Create new developer
router.post('/', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const user = req.user;
    const { name, company_logo, contact_name, contact_phone, contact_email, website, address, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Developer name is required' });
    }

    const orgId = user.role === 'super_admin' ? (req.body.organization_id || user.organization_id) : user.organization_id;
    const devId = 'dev-' + crypto.randomUUID().slice(0, 8);

    db.run(
      `INSERT INTO developers (id, organization_id, name, company_logo, contact_name, contact_phone, contact_email, website, address, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [devId, orgId, name.trim(), company_logo || null, contact_name || '', contact_phone || '', contact_email || '', website || '', address || '', description || '']
    );

    logActivity(req, 'CREATE_DEVELOPER', 'developers', devId, `Added developer ${name}`);

    return res.status(201).json({ message: 'Developer created successfully', id: devId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/developers/:id - Update developer
router.put('/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const { name, company_logo, contact_name, contact_phone, contact_email, website, address, description, status } = req.body;
    
    const existing = db.get('SELECT * FROM developers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Developer not found' });

    db.run(
      `UPDATE developers SET name = ?, company_logo = ?, contact_name = ?, contact_phone = ?, contact_email = ?, website = ?, address = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        name ?? existing.name,
        company_logo ?? existing.company_logo,
        contact_name ?? existing.contact_name,
        contact_phone ?? existing.contact_phone,
        contact_email ?? existing.contact_email,
        website ?? existing.website,
        address ?? existing.address,
        description ?? existing.description,
        status ?? existing.status ?? 'active',
        req.params.id
      ]
    );

    logActivity(req, 'UPDATE_DEVELOPER', 'developers', req.params.id, `Updated developer details`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/developers/:id
router.delete('/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    db.run('DELETE FROM developers WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_DEVELOPER', 'developers', req.params.id, 'Deleted developer and associated projects');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
