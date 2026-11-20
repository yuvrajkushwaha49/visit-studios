const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } });
const xlsx = require('xlsx');
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

// PUT /api/users/:id - Update user details (automatically syncs password to phone)
router.put('/:id', async (req, res) => {
  try {
    const actor = req.user;
    const targetUser = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Authorization checks
    if (actor.role === 'sales_associate') {
      return res.status(403).json({ error: 'Sales Associates cannot modify team members' });
    }
    if (actor.role === 'sales_head' && targetUser.sales_head_id !== actor.id) {
      return res.status(403).json({ error: 'Sales Heads can only update their assigned team members' });
    }
    if (actor.role === 'admin' && targetUser.organization_id !== actor.organization_id) {
      return res.status(403).json({ error: 'Cannot modify users belonging to another organization' });
    }

    const { name, email, phone, role, password, sales_head_id, status } = req.body;

    // Normalize phone number
    const newPhone = (phone !== undefined && phone !== null) ? String(phone).trim() : targetUser.phone;
    const cleanPhoneDigits = newPhone ? newPhone.replace(/[^\d+]/g, '') : '';

    let passwordHash = targetUser.password_hash;

    // Password Update Logic:
    // 1. If explicit custom password provided, hash it
    if (password && String(password).trim()) {
      passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }
    // 2. If phone is updated or set, automatically sync password to the new mobile number!
    else if (cleanPhoneDigits && (newPhone !== targetUser.phone || !targetUser.password_hash)) {
      const coreDigits = cleanPhoneDigits.replace(/\D/g, '');
      const passwordPhone = coreDigits.length >= 10 ? coreDigits.slice(-10) : cleanPhoneDigits;
      passwordHash = await bcrypt.hash(passwordPhone, 10);
    }

    const updatedName = (name !== undefined && name !== null && String(name).trim()) ? String(name).trim() : targetUser.name;
    const updatedEmail = (email !== undefined && email !== null && String(email).trim()) ? String(email).trim().toLowerCase() : targetUser.email;
    const updatedRole = (role !== undefined && role !== null) ? role : targetUser.role;
    const updatedStatus = (status !== undefined && status !== null) ? status : targetUser.status;
    const updatedSalesHead = (sales_head_id !== undefined) ? (sales_head_id || null) : targetUser.sales_head_id;

    db.run(
      `UPDATE users SET
        name = ?,
        email = ?,
        phone = ?,
        role = ?,
        password_hash = ?,
        sales_head_id = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        updatedName,
        updatedEmail,
        newPhone,
        updatedRole,
        passwordHash,
        updatedSalesHead,
        updatedStatus,
        req.params.id
      ]
    );

    // If sales_head_id changed, update related records
    if (updatedSalesHead && updatedSalesHead !== targetUser.sales_head_id) {
      db.run('UPDATE customers SET assigned_sales_head_id = ? WHERE assigned_associate_id = ?', [updatedSalesHead, req.params.id]);
      db.run('UPDATE invitations SET sales_head_id = ? WHERE associate_id = ?', [updatedSalesHead, req.params.id]);
      db.run('UPDATE site_visits SET sales_head_id = ? WHERE associate_id = ?', [updatedSalesHead, req.params.id]);
      db.run('UPDATE followups SET sales_head_id = ? WHERE associate_id = ?', [updatedSalesHead, req.params.id]);
    }

    logActivity(req, 'UPDATE_USER', 'users', req.params.id, `Updated user details for ${updatedName} (Phone: ${newPhone})`);
    return res.json({
      success: true,
      message: 'User updated successfully. Mobile number and login password synchronized.',
      phone: newPhone
    });
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

// POST /api/users/import-excel - Import Sales Heads & Associates from Excel or JSON
router.post('/import-excel', authorizeRoles('super_admin', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const actor = req.user;
    const orgId = actor.role === 'super_admin' ? (req.body.organization_id || actor.organization_id) : actor.organization_id;

    let rawRows = [];

    if (req.file) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } else if (req.body.rows && Array.isArray(req.body.rows)) {
      rawRows = req.body.rows;
    } else {
      return res.status(400).json({ error: 'Please upload an Excel file (.xlsx, .xls, .csv) or provide rows array' });
    }

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'No data rows found in uploaded sheet' });
    }

    function getField(row, keys) {
      const rKeys = Object.keys(row);
      for (const k of keys) {
        const cleanKey = k.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const found = rKeys.find(rk => rk.replace(/[^a-z0-9]/gi, '').toLowerCase() === cleanKey);
        if (found && row[found] !== undefined && row[found] !== null) {
          return String(row[found]).trim();
        }
      }
      return '';
    }

    function cleanPhone(raw) {
      if (!raw) return '';
      let p = String(raw).replace(/\.0$/, '').trim();
      let digits = p.replace(/[^\d+]/g, '');
      return digits || p;
    }

    const parsedRows = rawRows.map(row => {
      const name = getField(row, ['name', 'full name', 'employee name', 'associate name']);
      const email = getField(row, ['email', 'email id', 'email address', 'username', 'mail']).toLowerCase();
      const rawPhone = getField(row, ['phone', 'mobile', 'phone number', 'contact', 'contact number']);
      const phone = cleanPhone(rawPhone);
      const headName = getField(row, ['head name', 'head', 'sales head', 'reporting head', 'team head', 'manager']);
      return { name, email, phone, headName };
    }).filter(r => r.name && r.email);

    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'No valid rows found with Name and Email' });
    }

    // Step 1: Referenced heads & admin keywords
    const sajanUser = db.get("SELECT name FROM users WHERE email = 'sajanpatel@workians.com'");
    const sajanName = sajanUser ? sajanUser.name.toLowerCase() : 'sajan patel';
    const adminKeywords = [sajanName, 'sajan', 'sajan patel', 'admin', 'director', 'super admin', 'management'];

    const referencedHeads = new Set();
    parsedRows.forEach(r => {
      if (r.headName && !['self', 'na', 'n/a', 'none', '-'].includes(r.headName.toLowerCase())) {
        referencedHeads.add(r.headName.toLowerCase());
      }
    });

    const salesHeads = [];
    const salesAssociates = [];
    for (const r of parsedRows) {
      const headNorm = (r.headName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isReportingToAdmin = adminKeywords.some(a => headNorm.includes(a.replace(/[^a-z0-9]/g, '')));
      const hasNoHead = !r.headName || ['self', 'na', 'n/a', 'none', '-', r.name.toLowerCase()].includes(r.headName.toLowerCase());
      if (isReportingToAdmin || hasNoHead) salesHeads.push(r);
      else salesAssociates.push(r);
    }

    const headNameToId = {};
    const existingHeads = db.all("SELECT id, name FROM users WHERE organization_id = ? AND role = 'sales_head'", [orgId]);
    existingHeads.forEach(h => { headNameToId[h.name.toLowerCase()] = h.id; });

    let createdHeads = 0, updatedHeads = 0;
    for (const h of salesHeads) {
      const password = h.phone || '12345678';
      const passwordHash = await bcrypt.hash(password, 10);
      const existing = db.get("SELECT id FROM users WHERE email = ?", [h.email]);
      let userId;
      if (existing) {
        userId = existing.id;
        db.run(
          `UPDATE users SET name=?, phone=?, role='sales_head', password_hash=?, organization_id=?, status='active' WHERE id=?`,
          [h.name, h.phone, passwordHash, orgId, userId]
        );
        updatedHeads++;
      } else {
        userId = 'usr-head-' + crypto.randomUUID().slice(0, 8);
        db.run(
          `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status) VALUES (?, ?, 'sales_head', ?, ?, ?, ?, NULL, 'active')`,
          [userId, orgId, h.name, h.email, h.phone, passwordHash]
        );
        createdHeads++;
      }
      headNameToId[h.name.toLowerCase()] = userId;

      const existingTeam = db.get("SELECT id FROM teams WHERE sales_head_id = ?", [userId]);
      if (!existingTeam) {
        const teamId = 'team-' + crypto.randomUUID().slice(0, 8);
        db.run(
          `INSERT INTO teams (id, organization_id, sales_head_id, name, description) VALUES (?, ?, ?, ?, ?)`,
          [teamId, orgId, userId, `${h.name}'s Advisory Team`, `Managed by ${h.name}`]
        );
      }
    }

    // Auto-create any referenced head that isn't in sheet (e.g. Akshansh)
    for (const rawRef of referencedHeads) {
      const cleanRef = rawRef.replace(/[^a-z0-9]/g, '');
      const alreadyMapped = Object.keys(headNameToId).some(k => {
        const ck = k.replace(/[^a-z0-9]/g, '');
        return ck === cleanRef || ck.includes(cleanRef) || cleanRef.includes(ck);
      });
      const isAdminRef = adminKeywords.some(a => cleanRef.includes(a.replace(/[^a-z0-9]/g, '')));

      if (!alreadyMapped && !isAdminRef) {
        const sampleRow = parsedRows.find(r => r.headName && r.headName.toLowerCase() === rawRef);
        const properName = sampleRow ? sampleRow.headName : rawRef;
        const placeholderEmail = `${cleanRef}@workians.com`;
        const placeholderPhone = '9999900000';
        const existingRefUser = db.get("SELECT id, name FROM users WHERE email = ? OR name LIKE ?", [placeholderEmail, `%${properName}%`]);
        let refHeadId;
        if (existingRefUser) {
          refHeadId = existingRefUser.id;
          db.run("UPDATE users SET role='sales_head', organization_id=? WHERE id=?", [orgId, refHeadId]);
        } else {
          refHeadId = 'usr-head-' + crypto.randomUUID().slice(0, 8);
          const hash = await bcrypt.hash(placeholderPhone, 10);
          db.run(
            `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, status)
             VALUES (?, ?, 'sales_head', ?, ?, ?, ?, 'active')`,
            [refHeadId, orgId, properName, placeholderEmail, placeholderPhone, hash]
          );
          createdHeads++;
        }
        headNameToId[properName.toLowerCase()] = refHeadId;
      }
    }

    function findHeadId(headNameStr) {
      if (!headNameStr) return null;
      const cleanTarget = headNameStr.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [hName, hId] of Object.entries(headNameToId)) {
        const cleanH = hName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === cleanTarget || cleanH.includes(cleanTarget) || cleanTarget.includes(cleanH)) {
          return hId;
        }
      }
      return null;
    }

    let createdAssociates = 0, updatedAssociates = 0;
    for (const a of salesAssociates) {
      const password = a.phone || '12345678';
      const passwordHash = await bcrypt.hash(password, 10);
      const assignedHeadId = findHeadId(a.headName);

      const existing = db.get("SELECT id FROM users WHERE email = ?", [a.email]);
      if (existing) {
        db.run(
          `UPDATE users SET name=?, phone=?, role='sales_associate', password_hash=?, sales_head_id=?, organization_id=?, status='active' WHERE id=?`,
          [a.name, a.phone, passwordHash, assignedHeadId, orgId, existing.id]
        );
        updatedAssociates++;
      } else {
        const userId = 'usr-assoc-' + crypto.randomUUID().slice(0, 8);
        db.run(
          `INSERT INTO users (id, organization_id, role, name, email, phone, password_hash, sales_head_id, status) VALUES (?, ?, 'sales_associate', ?, ?, ?, ?, ?, 'active')`,
          [userId, orgId, a.name, a.email, a.phone, passwordHash, assignedHeadId]
        );
        createdAssociates++;
      }
    }

    logActivity(req, 'IMPORT_USERS', 'users', null, `Imported ${salesHeads.length} Sales Heads and ${salesAssociates.length} Associates`);

    return res.json({
      success: true,
      message: `Successfully processed ${parsedRows.length} team members!`,
      summary: {
        total: parsedRows.length,
        salesHeads: { total: salesHeads.length, created: createdHeads, updated: updatedHeads },
        salesAssociates: { total: salesAssociates.length, created: createdAssociates, updated: updatedAssociates },
        credentialsInfo: 'Username = Email | Password = Phone Number'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/send-credentials - Send credentials email to a single user
router.post('/:id/send-credentials', authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const user = db.get('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { custom_password, portal_url } = req.body;
    const { sendUserCredentialsEmail, getSmtpConfig } = require('../services/emailService');

    const smtpConf = getSmtpConfig(user.organization_id);
    if (!smtpConf.isConfigured) {
      return res.status(400).json({
        success: false,
        notConfigured: true,
        error: 'SMTP credentials are not configured yet. Please configure SMTP in Settings first.'
      });
    }

    // Default password is phone number
    const plainPassword = custom_password || user.phone || '12345678';

    // Synchronize database password hash with the dispatched plainPassword
    const newHash = await bcrypt.hash(plainPassword.trim(), 10);
    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, user.id]);

    const result = await sendUserCredentialsEmail({
      user,
      plainPassword,
      customPortalUrl: portal_url
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send credentials email'
      });
    }

    logActivity(req, 'SEND_CREDENTIALS', 'users', user.id, `Sent login credentials email to ${user.name} (${user.email})`);

    return res.json({
      success: true,
      message: `Credentials email sent successfully to ${user.name} (${user.email})!`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/users/broadcast-credentials - Bulk send credentials to sales team
router.post('/broadcast-credentials', authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const orgId = req.user.role === 'super_admin' ? (req.body.organization_id || req.user.organization_id) : req.user.organization_id;
    const { user_ids, role_filter, portal_url } = req.body;
    const { sendUserCredentialsEmail, getSmtpConfig } = require('../services/emailService');

    const smtpConf = getSmtpConfig(orgId);
    if (!smtpConf.isConfigured) {
      return res.status(400).json({
        success: false,
        notConfigured: true,
        error: 'SMTP credentials are not configured yet. Please configure your SMTP Host, Username and Password in Settings.'
      });
    }

    let targetUsers = [];
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      const placeholders = user_ids.map(() => '?').join(',');
      targetUsers = db.all(`SELECT * FROM users WHERE id IN (${placeholders}) AND status = 'active'`, user_ids);
    } else {
      let queryStr = `SELECT * FROM users WHERE organization_id = ? AND status = 'active'`;
      const queryParams = [orgId];
      if (role_filter) {
        queryStr += ` AND role = ?`;
        queryParams.push(role_filter);
      } else {
        queryStr += ` AND role IN ('sales_head', 'sales_associate')`;
      }
      targetUsers = db.all(queryStr, queryParams);
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'No eligible team members found to send credentials to.' });
    }

    let sentCount = 0;
    const failedList = [];

    for (const u of targetUsers) {
      try {
        const plainPassword = u.phone || '12345678';
        const resEmail = await sendUserCredentialsEmail({
          user: u,
          plainPassword,
          orgId,
          customPortalUrl: portal_url
        });
        if (resEmail.success) {
          sentCount++;
        } else {
          failedList.push({ name: u.name, email: u.email, error: resEmail.error });
        }
      } catch (sendErr) {
        failedList.push({ name: u.name, email: u.email, error: sendErr.message });
      }
    }

    logActivity(req, 'BROADCAST_CREDENTIALS', 'users', null, `Broadcast credentials: sent ${sentCount}/${targetUsers.length}`);

    return res.json({
      success: true,
      message: `Dispatched credentials to ${sentCount} out of ${targetUsers.length} team members.`,
      summary: {
        total: targetUsers.length,
        sent: sentCount,
        failed: failedList.length,
        failures: failedList
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
