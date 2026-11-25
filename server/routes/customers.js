const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');
const { arrayToCSV, parseCSV } = require('../services/exportService');

router.use(authenticate);

// GET /api/customers - List customers according to RBAC hierarchy
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const { status, project_id, search } = req.query;

    let sql = `
      SELECT c.*,
        p.name as interested_project_name,
        d.name as developer_name,
        u_assoc.name as assigned_associate_name,
        u_assoc.phone as assigned_associate_phone,
        u_head.name as assigned_sales_head_name,
        (SELECT COUNT(*) FROM invitations i WHERE i.customer_id = c.id) as total_invitations,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.customer_id = c.id) as total_visits
      FROM customers c
      LEFT JOIN projects p ON c.interested_project_id = p.id
      LEFT JOIN developers d ON p.developer_id = d.id
      LEFT JOIN users u_assoc ON c.assigned_associate_id = u_assoc.id
      LEFT JOIN users u_head ON c.assigned_sales_head_id = u_head.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC Filter
    // ORGANIZATION Customer Management uses mine=1 so admin also sees only their own EMP customers.
    // MANAGEMENT Customer list omits mine and still returns the full organization.
    const mineOnly = String(req.query.mine || '') === '1';
    if (user.role === 'admin') {
      if (mineOnly) {
        sql += ' AND c.organization_id = ? AND (c.assigned_associate_id = ? OR c.assigned_sales_head_id = ?)';
        params.push(user.organization_id, user.id, user.id);
      } else {
        sql += ' AND c.organization_id = ?';
        params.push(user.organization_id);
      }
    } else if (user.role === 'sales_head') {
      sql += ' AND c.organization_id = ? AND (c.assigned_sales_head_id = ? OR c.assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.organization_id, user.id, user.id);
    } else if (user.role === 'sales_associate') {
      sql += ' AND c.organization_id = ? AND c.assigned_associate_id = ?';
      params.push(user.organization_id, user.id);
    }

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (project_id) {
      sql += ' AND c.interested_project_id = ?';
      params.push(project_id);
    }

    if (search) {
      sql += ' AND (c.full_name LIKE ? OR c.mobile_number LIKE ? OR c.customer_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY c.created_at DESC';

    const customers = db.all(sql, params);
    return res.json({ customers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id - Customer profile with timeline
router.get('/:id', (req, res) => {
  try {
    const user = req.user;
    const cust = db.get(`
      SELECT c.*,
        p.name as interested_project_name,
        d.name as developer_name,
        u_assoc.name as assigned_associate_name,
        u_assoc.phone as assigned_associate_phone,
        u_head.name as assigned_sales_head_name
      FROM customers c
      LEFT JOIN projects p ON c.interested_project_id = p.id
      LEFT JOIN developers d ON p.developer_id = d.id
      LEFT JOIN users u_assoc ON c.assigned_associate_id = u_assoc.id
      LEFT JOIN users u_head ON c.assigned_sales_head_id = u_head.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    // RBAC check
    if (user.role === 'admin' && cust.organization_id !== user.organization_id) {
      return res.status(403).json({ error: 'Unauthorized to view this customer' });
    }
    if (user.role === 'sales_head' && cust.assigned_sales_head_id !== user.id) {
      const isAssociateInTeam = db.get('SELECT id FROM users WHERE id = ? AND sales_head_id = ?', [cust.assigned_associate_id, user.id]);
      if (!isAssociateInTeam) return res.status(403).json({ error: 'Unauthorized' });
    }
    if (user.role === 'sales_associate' && cust.assigned_associate_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Load full history / timeline
    let interactions = db.all(`
      SELECT ci.*, u.name as user_name, u.role as user_role
      FROM customer_interactions ci
      LEFT JOIN users u ON ci.user_id = u.id
      WHERE ci.customer_id = ?
      ORDER BY ci.created_at DESC
    `, [cust.id]);

    let invitations = db.all(`
      SELECT i.*, p.name as project_name, u.name as associate_name
      FROM invitations i
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN users u ON i.associate_id = u.id
      WHERE i.customer_id = ?
      ORDER BY i.created_at DESC
    `, [cust.id]);

    let visits = db.all(`
      SELECT sv.*, p.name as project_name, u.name as associate_name
      FROM site_visits sv
      LEFT JOIN projects p ON sv.project_id = p.id
      LEFT JOIN users u ON sv.associate_id = u.id
      WHERE sv.customer_id = ?
      ORDER BY sv.scheduled_date DESC
    `, [cust.id]);

    let followups = db.all(`
      SELECT f.*, u.name as associate_name
      FROM followups f
      LEFT JOIN users u ON f.associate_id = u.id
      WHERE f.customer_id = ?
      ORDER BY f.follow_up_date DESC
    `, [cust.id]);

    // ORGANIZATION Customer Management: EMP activity notes = only that EMP's Invitation Sent
    const empScope = String(req.query.emp_scope || '') === '1';
    const isInvitationSent = (type) => {
      const value = String(type || '').trim().toLowerCase();
      return value === 'invitation sent' || value === 'sent';
    };

    if (user.role === 'sales_associate') {
      interactions = interactions.filter(item => item.user_id === user.id && isInvitationSent(item.interaction_type));
    } else if (user.role === 'sales_head') {
      const teamIds = new Set(
        (db.all('SELECT id FROM users WHERE sales_head_id = ?', [user.id]) || []).map(row => row.id)
      );
      teamIds.add(user.id);
      interactions = interactions.filter(item => teamIds.has(item.user_id) && isInvitationSent(item.interaction_type));
    } else if (user.role === 'admin' && empScope) {
      const empId = cust.assigned_associate_id || cust.assigned_sales_head_id;
      interactions = interactions.filter(item => (!empId || item.user_id === empId) && isInvitationSent(item.interaction_type));
    }

    return res.json({
      customer: cust,
      interactions,
      invitations,
      visits,
      followups
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Add customer with duplicate mobile detection
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const {
      full_name, mobile_number, whatsapp_number, email, budget,
      preferred_location, interested_project_id, configuration,
      lead_source, requirements, assigned_associate_id
    } = req.body;

    if (!full_name || !mobile_number) {
      return res.status(400).json({ error: 'Customer full name and mobile number are required' });
    }

    const cleanMobile = mobile_number.replace(/[^\d+]/g, '');
    const orgId = user.role === 'super_admin' ? (req.body.organization_id || user.organization_id) : user.organization_id;

    // Check duplicate mobile in organization
    const existing = db.get(
      'SELECT id, full_name, assigned_associate_id FROM customers WHERE organization_id = ? AND (mobile_number = ? OR mobile_number LIKE ?)',
      [orgId, cleanMobile, `%${cleanMobile.slice(-10)}`]
    );

    if (existing) {
      return res.status(409).json({
        error: `Customer with mobile ${mobile_number} already exists (${existing.full_name}).`,
        existingCustomerId: existing.id
      });
    }

    // Determine assigned associate and sales head
    let targetAssociateId = assigned_associate_id;
    let targetSalesHeadId = null;

    if (user.role === 'sales_associate') {
      targetAssociateId = user.id;
      targetSalesHeadId = user.sales_head_id;
    } else if (targetAssociateId) {
      const assocUser = db.get('SELECT id, sales_head_id FROM users WHERE id = ?', [targetAssociateId]);
      if (assocUser) {
        targetSalesHeadId = assocUser.sales_head_id;
      }
    } else if (user.role === 'sales_head') {
      targetSalesHeadId = user.id;
    }

    const customerId = 'cust-' + crypto.randomUUID().slice(0, 8);
    const count = db.get('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [orgId]).cnt;
    const customerCode = 'CUST-' + String(1001 + count);

    db.run(
      `INSERT INTO customers (
        id, organization_id, customer_code, full_name, mobile_number, whatsapp_number,
        email, budget, preferred_location, interested_project_id, configuration,
        lead_source, requirements, assigned_associate_id, assigned_sales_head_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead')`,
      [
        customerId, orgId, customerCode, full_name.trim(), cleanMobile,
        whatsapp_number ? whatsapp_number.replace(/[^\d+]/g, '') : cleanMobile,
        email ? email.trim().toLowerCase() : '', budget || '', preferred_location || '',
        interested_project_id || null, configuration || '', lead_source || 'Direct',
        requirements || '', targetAssociateId || null, targetSalesHeadId || null
      ]
    );

    // Initial timeline entry
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Lead Added', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), customerId, user.id, `Lead created via ${lead_source || 'Direct'}. Initial requirements: ${requirements || 'None specified'}`]
    );

    logActivity(req, 'CREATE_CUSTOMER', 'customers', customerId, `Added customer ${full_name} (${cleanMobile})`);

    return res.status(201).json({
      message: 'Customer added successfully',
      customer: { id: customerId, customer_code: customerCode, full_name, mobile_number: cleanMobile }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Edit customer
router.put('/:id', (req, res) => {
  try {
    const user = req.user;
    const {
      full_name, mobile_number, whatsapp_number, email, budget,
      preferred_location, interested_project_id, configuration,
      lead_source, requirements, status
    } = req.body;

    const existing = db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    db.run(
      `UPDATE customers SET
        full_name = ?, mobile_number = ?, whatsapp_number = ?, email = ?, budget = ?,
        preferred_location = ?, interested_project_id = ?, configuration = ?,
        lead_source = ?, requirements = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        full_name || existing.full_name,
        mobile_number || existing.mobile_number,
        whatsapp_number ?? existing.whatsapp_number ?? null,
        email ?? existing.email ?? null,
        budget ?? existing.budget ?? null,
        preferred_location ?? existing.preferred_location ?? null,
        interested_project_id ?? existing.interested_project_id ?? null,
        configuration ?? existing.configuration ?? null,
        lead_source ?? existing.lead_source ?? null,
        requirements ?? existing.requirements ?? null,
        status || existing.status,
        req.params.id
      ]
    );

    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Profile Updated', 'Customer profile details updated.')`,
      ['int-' + crypto.randomUUID().slice(0, 8), req.params.id, user.id]
    );

    logActivity(req, 'UPDATE_CUSTOMER', 'customers', req.params.id, `Updated customer ${full_name}`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/:id/interactions - Add interaction note to timeline
router.post('/:id/interactions', (req, res) => {
  try {
    const { interaction_type, notes } = req.body;
    if (!interaction_type || !notes) {
      return res.status(400).json({ error: 'Interaction type and notes are required' });
    }

    const intId = 'int-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [intId, req.params.id, req.user.id, interaction_type, notes]
    );

    return res.status(201).json({ success: true, id: intId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/customers/:id/reassign - Admin / Sales Head reassigns customer
router.patch('/:id/reassign', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const { associate_id } = req.body;
    if (!associate_id) return res.status(400).json({ error: 'Target associate ID is required' });

    const targetAssoc = db.get('SELECT id, name, sales_head_id FROM users WHERE id = ?', [associate_id]);
    if (!targetAssoc) return res.status(404).json({ error: 'Associate not found' });

    db.run(
      `UPDATE customers SET assigned_associate_id = ?, assigned_sales_head_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [targetAssoc.id, targetAssoc.sales_head_id, req.params.id]
    );

    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Customer Reassigned', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), req.params.id, req.user.id, `Reassigned to associate ${targetAssoc.name}`]
    );

    logActivity(req, 'REASSIGN_CUSTOMER', 'customers', req.params.id, `Reassigned to ${targetAssoc.name}`);
    return res.json({ success: true, message: `Reassigned to ${targetAssoc.name}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/export/csv - Export customers to CSV
router.get('/export/csv', (req, res) => {
  try {
    const user = req.user;
    let sql = `
      SELECT c.customer_code, c.full_name, c.mobile_number, c.email, c.budget,
             c.preferred_location, p.name as interested_project, c.configuration,
             c.lead_source, c.status, u_assoc.name as assigned_associate, c.created_at
      FROM customers c
      LEFT JOIN projects p ON c.interested_project_id = p.id
      LEFT JOIN users u_assoc ON c.assigned_associate_id = u_assoc.id
      WHERE c.organization_id = ?
    `;
    const params = [user.organization_id];

    if (user.role === 'sales_head') {
      sql += ' AND (c.assigned_sales_head_id = ? OR c.assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))';
      params.push(user.id, user.id);
    } else if (user.role === 'sales_associate') {
      sql += ' AND c.assigned_associate_id = ?';
      params.push(user.id);
    }

    const rows = db.all(sql, params);
    const csvData = arrayToCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="visit_studio_customers.csv"');
    return res.send(csvData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/import/csv - Import customers via CSV text
router.post('/import/csv', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent) return res.status(400).json({ error: 'CSV content is required' });

    const parsed = parseCSV(csvContent);
    const user = req.user;
    let imported = 0;
    let skipped = 0;

    for (const row of parsed) {
      const name = row['full_name'] || row['Full Name'] || row['Name'] || row['name'];
      const phone = row['mobile_number'] || row['Mobile'] || row['Phone'] || row['mobile'];
      if (!name || !phone) {
        skipped++;
        continue;
      }

      const cleanMobile = phone.replace(/[^\d+]/g, '');
      const existing = db.get('SELECT id FROM customers WHERE organization_id = ? AND mobile_number = ?', [user.organization_id, cleanMobile]);
      if (existing) {
        skipped++;
        continue;
      }

      const custId = 'cust-' + crypto.randomUUID().slice(0, 8);
      const code = 'CUST-' + String(1000 + db.get('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [user.organization_id]).cnt + 1);

      db.run(
        `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, email, budget, preferred_location, lead_source, assigned_associate_id, assigned_sales_head_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CSV Import', ?, ?, 'lead')`,
        [
          custId, user.organization_id, code, name.trim(), cleanMobile,
          row['email'] || '', row['budget'] || '', row['preferred_location'] || '',
          user.role === 'sales_associate' ? user.id : null,
          user.role === 'sales_head' ? user.id : (user.sales_head_id || null)
        ]
      );
      imported++;
    }

    logActivity(req, 'IMPORT_CUSTOMERS_CSV', 'customers', user.organization_id, `Imported ${imported} customers via CSV`);
    return res.json({ imported, skipped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', authorizeRoles('super_admin', 'admin', 'sales_head'), (req, res) => {
  try {
    const cust = db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    logActivity(req, 'DELETE_CUSTOMER', 'customers', req.params.id, `Deleted customer ${cust.full_name}`);
    return res.json({ success: true, message: `Customer ${cust.full_name} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
