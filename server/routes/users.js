const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

router.use(authenticate);

// GET /api/users - List users according to role hierarchy
router.get('/', (req, res) => {
  try {
    const user = req.user;
    let users = [];

    if (user.role === 'super_admin') {
      users = db.all(`
        SELECT u.id, u.organization_id, u.role, u.name, u.email, u.phone, u.sales_head_id, u.status, u.created_at,
               o.name as organization_name,
               sh.name as sales_head_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN users sh ON u.sales_head_id = sh.id
        ORDER BY u.role, u.name
      `);
    } else if (user.role === 'admin') {
      users = db.all(`
        SELECT u.id, u.organization_id, u.role, u.name, u.email, u.phone, u.sales_head_id, u.status, u.created_at,
               sh.name as sales_head_name
        FROM users u
        LEFT JOIN users sh ON u.sales_head_id = sh.id
        WHERE u.organization_id = ?
        ORDER BY u.role, u.name
      `, [user.organization_id]);
    } else if (user.role === 'sales_head') {
      users = db.all(`
        SELECT u.id, u.organization_id, u.role, u.name, u.email, u.phone, u.sales_head_id, u.status, u.created_at
        FROM users u
        WHERE u.organization_id = ? AND (u.sales_head_id = ? OR u.id = ?)
        ORDER BY u.name
      `, [user.organization_id, user.id, user.id]);
    } else {
      // Sales Associate: only themselves and their sales head
      users = db.all(`
        SELECT u.id, u.organization_id, u.role, u.name, u.email, u.phone, u.status
        FROM users u
        WHERE u.id = ? OR u.id = ?
      `, [user.id, user.sales_head_id]);
    }

    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/users/sales-heads - Helper for dropdowns
router.get('/sales-heads', (req, res) => {
  try {
    const user = req.user;
    const orgId = user.role === 'super_admin' ? (req.query.organization_id || user.organization_id) : user.organization_id;
    
    const heads = db.all(`
      SELECT id, name, email, phone FROM users 
      WHERE organization_id = ? AND role = 'sales_head' AND status = 'active'
      ORDER BY name
    `, [orgId]);

    return res.json({ salesHeads: heads });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/users/associates - Helper for customer assignments
router.get('/associates', (req, res) => {
  try {
    const user = req.user;
    let associates = [];

    if (user.role === 'super_admin' || user.role === 'admin') {
      const orgId = user.organization_id || req.query.organization_id;
      associates = db.all(`
        SELECT u.id, u.name, u.email, u.phone, u.sales_head_id, sh.name as sales_head_name
        FROM users u
        LEFT JOIN users sh ON u.sales_head_id = sh.id
        WHERE u.organization_id = ? AND u.role = 'sales_associate' AND u.status = 'active'
        ORDER BY u.name
      `, [orgId]);
    } else if (user.role === 'sales_head') {
      associates = db.all(`
        SELECT u.id, u.name, u.email, u.phone, u.sales_head_id
        FROM users u
        WHERE u.organization_id = ? AND u.sales_head_id = ? AND u.role = 'sales_associate' AND u.status = 'active'
        ORDER BY u.name
      `, [user.organization_id, user.id]);
    } else {
      associates = [{ id: user.id, name: user.name, email: user.email, phone: user.phone }];
    }

    return res.json({ associates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create a new user (Admin can create Sales Head or Sales Associate; Sales Head can create Associate)
router.post('/', authorizeRoles('super_admin', 'admin', 'sales_head'), async (req, res) => {
  try {
    const actor = req.user;
    const { name, email, phone, role, password, sales_head_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }

    if (!['admin', 'sales_head', 'sales_associate'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Role hierarchy constraints
    if (actor.role === 'sales_head' && role !== 'sales_associate') {
      return res.status(403).json({ error: 'Sales Heads can only create Sales Associates' });
    }

    if (actor.role === 'admin' && role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot create additional Admins' });
    }

    const orgId = actor.role === 'super_admin' ? (req.body.organization_id || actor.organization_id) : actor.organization_id;

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists' });
    }

    const assignedSalesHead = actor.role === 'sales_head' ? actor.id : (sales_head_id || null);
    const userId = 'usr-' + role.slice(0, 5) + '-' + crypto.randomUUID().slice(0, 8);
    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [userId, orgId, role, name.trim(), email.trim().toLowerCase(), phone || '', passwordHash, assignedSalesHead]
    );

    logActivity(req, 'CREATE_USER', 'users', userId, `Created ${role}: ${name} (${email})`);

    return res.status(201).json({
      message: 'User account created successfully',
      user: { id: userId, name, email, role, sales_head_id: assignedSalesHead }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/assign-head - Admin reassigns Sales Associate to another Sales Head
router.patch('/:id/assign-head', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const { sales_head_id } = req.body;
    const targetUserId = req.params.id;

    const targetUser = db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (sales_head_id) {
      const headUser = db.get("SELECT id, name FROM users WHERE id = ? AND role = 'sales_head'", [sales_head_id]);
      if (!headUser) return res.status(400).json({ error: 'Selected Sales Head is invalid' });
    }

    db.run('UPDATE users SET sales_head_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sales_head_id || null, targetUserId]);
    
    // Also reassign all customers belonging to this associate to follow the new Sales Head
    if (sales_head_id) {
      db.run('UPDATE customers SET assigned_sales_head_id = ? WHERE assigned_associate_id = ?', [sales_head_id, targetUserId]);
      db.run('UPDATE invitations SET sales_head_id = ? WHERE associate_id = ?', [sales_head_id, targetUserId]);
      db.run('UPDATE site_visits SET sales_head_id = ? WHERE associate_id = ?', [sales_head_id, targetUserId]);
      db.run('UPDATE followups SET sales_head_id = ? WHERE associate_id = ?', [sales_head_id, targetUserId]);
    }

    logActivity(req, 'REASSIGN_SALES_HEAD', 'users', targetUserId, `Reassigned associate ${targetUser.name} to sales head ${sales_head_id}`);

    return res.json({ success: true, message: 'Sales Associate reassigned successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Update user details
router.put('/:id', authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, email, phone, role, password, sales_head_id, status } = req.body;
    const targetUser = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    let passwordHash = targetUser.password_hash;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    db.run(
      `UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        password_hash = ?,
        sales_head_id = ?,
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name ?? null,
        email ?? null,
        phone ?? null,
        role ?? null,
        passwordHash,
        sales_head_id || targetUser.sales_head_id,
        status ?? null,
        req.params.id
      ]
    );

    logActivity(req, 'UPDATE_USER', 'users', req.params.id, `Updated user details for ${name || targetUser.name}`);
    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_USER', 'users', req.params.id, `Deleted user ${user.name}`);
    return res.json({ success: true, message: `User ${user.name} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
