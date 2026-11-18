const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

// All organization routes require super_admin
router.use(authenticate, authorizeRoles('super_admin'));

// GET /api/organizations - List all organizations with stats
router.get('/', (req, res) => {
  try {
    const orgs = db.all(`
      SELECT o.*,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'sales_head') as total_sales_heads,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'sales_associate') as total_associates,
        (SELECT COUNT(*) FROM customers c WHERE c.organization_id = o.id) as total_customers,
        (SELECT COUNT(*) FROM invitations i WHERE i.organization_id = o.id) as total_invitations,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.organization_id = o.id) as total_visits
      FROM organizations o
      ORDER BY o.created_at DESC
    `);
    return res.json({ organizations: orgs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations - Create a new organization and primary Admin
router.post('/', async (req, res) => {
  try {
    const { name, slug, phone, email, address, adminName, adminEmail, adminPassword, adminPhone } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Organization name and unique slug are required' });
    }

    const existingSlug = db.get('SELECT id FROM organizations WHERE slug = ?', [slug.trim().toLowerCase()]);
    if (existingSlug) {
      return res.status(400).json({ error: 'An organization with this slug already exists' });
    }

    const orgId = 'org-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO organizations (id, name, slug, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [orgId, name.trim(), slug.trim().toLowerCase(), phone || '', email || '', address || '']
    );

    // Create default organization settings
    db.run(
      `INSERT INTO organization_settings (id, organization_id, agency_name, agency_subtitle) VALUES (?, ?, ?, ?)`,
      ['sett-' + crypto.randomUUID().slice(0, 8), orgId, name.trim(), 'Property Advisory & Site Visits']
    );

    // If initial admin details provided, create admin
    let createdAdmin = null;
    if (adminName && adminEmail && adminPassword) {
      const existingUser = db.get('SELECT id FROM users WHERE email = ?', [adminEmail.trim().toLowerCase()]);
      if (existingUser) {
        return res.status(400).json({ error: 'A user with this admin email already exists' });
      }

      const adminId = 'usr-admin-' + crypto.randomUUID().slice(0, 8);
      const hash = await bcrypt.hash(adminPassword, 10);
      db.run(
        `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status) VALUES (?, ?, 'admin', ?, ?, ?, ?, 'active')`,
        [adminId, orgId, adminName.trim(), adminEmail.trim().toLowerCase(), adminPhone || '', hash]
      );
      createdAdmin = { id: adminId, name: adminName, email: adminEmail };
    }

    logActivity(req, 'CREATE_ORGANIZATION', 'organizations', orgId, `Created organization ${name}`);

    return res.status(201).json({
      message: 'Organization created successfully',
      organization: { id: orgId, name, slug },
      admin: createdAdmin
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/organizations/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.run('UPDATE organizations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    logActivity(req, 'UPDATE_ORG_STATUS', 'organizations', req.params.id, `Status updated to ${status}`);
    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/global-kpis - Global Super Admin metrics
router.get('/global-kpis', (req, res) => {
  try {
    const totalOrgs = db.get("SELECT COUNT(*) as count FROM organizations WHERE status = 'active'").count;
    const totalAdmins = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'").count;
    const totalSalesHeads = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'sales_head' AND status = 'active'").count;
    const totalAssociates = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'sales_associate' AND status = 'active'").count;
    const totalCustomers = db.get("SELECT COUNT(*) as count FROM customers").count;
    const totalInvitations = db.get("SELECT COUNT(*) as count FROM invitations").count;
    const totalSiteVisits = db.get("SELECT COUNT(*) as count FROM site_visits").count;
    const completedVisits = db.get("SELECT COUNT(*) as count FROM site_visits WHERE status = 'completed'").count;
    const activeUsers = db.get("SELECT COUNT(*) as count FROM users WHERE status = 'active'").count;

    return res.json({
      kpis: {
        totalOrganizations: totalOrgs,
        totalAdmins,
        totalSalesHeads,
        totalSalesAssociates: totalAssociates,
        totalCustomers,
        totalInvitations,
        totalSiteVisits,
        completedVisits,
        activeUsers
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/activity-logs
router.get('/activity-logs', (req, res) => {
  try {
    const logs = db.all(`
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id - Get single organization
router.get('/:id', (req, res) => {
  try {
    const org = db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    return res.json({ organization: org });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/organizations/:id - Edit organization
router.put('/:id', (req, res) => {
  try {
    const { name, slug, phone, email, address } = req.body;
    const org = db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    db.run(
      `UPDATE organizations SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name ?? null,
        slug ?? null,
        phone ?? null,
        email ?? null,
        address ?? null,
        req.params.id
      ]
    );

    logActivity(req, 'UPDATE_ORGANIZATION', 'organizations', req.params.id, `Updated organization ${name || org.name}`);
    return res.json({ success: true, message: 'Organization updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete('/:id', (req, res) => {
  try {
    const org = db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    db.run('DELETE FROM organizations WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_ORGANIZATION', 'organizations', req.params.id, `Deleted organization ${org.name}`);
    return res.json({ success: true, message: `Organization ${org.name} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
