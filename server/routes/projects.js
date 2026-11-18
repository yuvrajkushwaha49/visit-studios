const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

router.use(authenticate);

// GET /api/projects - List projects with configurations
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const orgId = user.role === 'super_admin' ? (req.query.organization_id || user.organization_id) : user.organization_id;
    const developerId = req.query.developer_id;

    let sql = `
      SELECT p.*, d.name as developer_name, d.company_logo as developer_logo
      FROM projects p
      JOIN developers d ON p.developer_id = d.id
      WHERE p.organization_id = ?
    `;
    const params = [orgId];

    if (developerId) {
      sql += ' AND p.developer_id = ?';
      params.push(developerId);
    }

    sql += ' ORDER BY p.name';

    const projects = db.all(sql, params);

    for (const proj of projects) {
      proj.configurations = db.all('SELECT * FROM project_configurations WHERE project_id = ? ORDER BY bedrooms, price', [proj.id]);
    }

    return res.json({ projects });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  try {
    const proj = db.get(`
      SELECT p.*, d.name as developer_name, d.company_logo as developer_logo
      FROM projects p
      JOIN developers d ON p.developer_id = d.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!proj) return res.status(404).json({ error: 'Project not found' });
    proj.configurations = db.all('SELECT * FROM project_configurations WHERE project_id = ?', [proj.id]);

    return res.json({ project: proj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - Create project
router.post('/', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const user = req.user;
    const {
      developer_id, name, project_logo, banner_image, location, google_maps_url,
      description, carpet_area, built_up_area, super_built_up_area, starting_price,
      price_range, amenities, configurations = []
    } = req.body;

    if (!developer_id || !name || !location) {
      return res.status(400).json({ error: 'Developer, project name and location are required' });
    }

    const orgId = user.role === 'super_admin' ? (req.body.organization_id || user.organization_id) : user.organization_id;
    const projId = 'proj-' + crypto.randomUUID().slice(0, 8);

    db.run(
      `INSERT INTO projects (id, organization_id, developer_id, name, project_logo, banner_image, location, google_maps_url, description, carpet_area, built_up_area, super_built_up_area, starting_price, price_range, amenities, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        projId, orgId, developer_id, name.trim(), project_logo || null, banner_image || null,
        location.trim(), google_maps_url || '', description || '', carpet_area || '',
        built_up_area || '', super_built_up_area || '', starting_price || '',
        price_range || '', amenities || ''
      ]
    );

    // Insert configurations if provided
    if (Array.isArray(configurations)) {
      for (const cfg of configurations) {
        db.run(
          `INSERT INTO project_configurations (id, project_id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'cfg-' + crypto.randomUUID().slice(0, 8),
            projId,
            cfg.name || 'Standard Unit',
            cfg.carpet_area || '',
            cfg.super_built_up_area || '',
            cfg.price || '',
            cfg.bedrooms || 3,
            cfg.bathrooms || 3
          ]
        );
      }
    }

    logActivity(req, 'CREATE_PROJECT', 'projects', projId, `Added project ${name}`);
    return res.status(201).json({ message: 'Project created successfully', id: projId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const {
      developer_id, name, project_logo, banner_image, location, google_maps_url, description,
      carpet_area, super_built_up_area, starting_price, price_range, amenities, status
    } = req.body;

    const existing = db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    db.run(
      `UPDATE projects SET developer_id = ?, name = ?, project_logo = ?, banner_image = ?, location = ?, google_maps_url = ?, description = ?,
       carpet_area = ?, super_built_up_area = ?, starting_price = ?, price_range = ?, amenities = ?, status = ?
       WHERE id = ?`,
      [
        developer_id ?? existing.developer_id,
        name ?? existing.name,
        project_logo !== undefined ? project_logo : existing.project_logo,
        banner_image !== undefined ? banner_image : existing.banner_image,
        location ?? existing.location,
        google_maps_url ?? existing.google_maps_url,
        description ?? existing.description,
        carpet_area ?? existing.carpet_area,
        super_built_up_area ?? existing.super_built_up_area,
        starting_price ?? existing.starting_price,
        price_range ?? existing.price_range,
        amenities ?? existing.amenities,
        status ?? existing.status ?? 'active',
        req.params.id
      ]
    );

    logActivity(req, 'UPDATE_PROJECT', 'projects', req.params.id, `Updated project ${name || existing.name}`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_PROJECT', 'projects', req.params.id, `Deleted project`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
