const db = require('../server/db');
const crypto = require('crypto');

async function testInvite() {
  const org = db.get("SELECT id FROM organizations LIMIT 1");
  const orgId = org ? org.id : 'org-08a1da1a';
  const project = db.get("SELECT id, developer_id, location FROM projects LIMIT 1");
  const associate = db.get("SELECT id, sales_head_id FROM users WHERE role = 'sales_associate' LIMIT 1");

  // Create a customer if none exists
  let cust = db.get("SELECT id FROM customers LIMIT 1");
  if (!cust) {
    const custId = 'cust-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO customers (id, organization_id, customer_code, full_name, mobile_number, email, assigned_associate_id, assigned_sales_head_id, status)
       VALUES (?, ?, 'CUST-1001', 'Rahul Sharma', '9812345678', 'rahul.test@example.com', ?, ?, 'lead')`,
      [custId, orgId, associate.id, associate.sales_head_id]
    );
    cust = { id: custId };
    console.log('+ Created test customer:', custId);
  }

  // Create an invitation
  const token = 'inv_tok_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const shortCode = 'v' + crypto.randomBytes(3).toString('hex');
  const invId = 'inv-' + crypto.randomUUID().slice(0, 8);

  db.run(
    `INSERT INTO invitations (id, organization_id, token, short_code, customer_id, project_id, developer_id, associate_id, sales_head_id, visit_date, visit_time, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '+1 day'), '14:00', ?, 'sent')`,
    [invId, orgId, token, shortCode, cust.id, project.id, project.developer_id, associate.id, associate.sales_head_id, project.location || 'Sector 150, Noida']
  );

  console.log('Created invitation:');
  console.log('ID:', invId);
  console.log('Token:', token);
  console.log('Short code:', shortCode);
  console.log('Short URL: http://localhost:3000/i/' + shortCode);
  console.log('Invite URL: http://localhost:3000/?invite=' + token);
  console.log('Hash URL: http://localhost:3000/#invite=' + token);

  // Test the public API
  const res = await fetch(`http://localhost:3000/api/invitations/public/${token}`);
  console.log('Public API response status:', res.status);
  const data = await res.json();
  console.log('Customer name in API:', data.invitation ? data.invitation.customer_name : data.error);
}

testInvite().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
