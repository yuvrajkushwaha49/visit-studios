const db = require('../server/db');

const invId = 'inv-RXIEHG';
const token = 'inv_tok_rxiehg_pass_2026';
const shortCode = 'RXIEHG';

db.run(`
  INSERT OR REPLACE INTO invitations (
    id, organization_id, token, short_code, customer_id, project_id, developer_id, associate_id,
    visit_date, visit_time, duration, location, size, price, notes, status
  ) VALUES (
    ?, 'org-08a1da1a', ?, ?, 'cust-9fb99014', 'proj-saya-rajnagar-org-08a1da1a', 'dev-saya-org-08a1da1a', 'usr-admin-55d7e83d',
    '2026-11-25', '14:30', 60, 'Rajnagar Extension, Ghaziabad', '3 BHK Luxury Residence', '1.25 Cr',
    'VIP property walkthrough pass for guest', 'sent'
  )
`, [invId, token, shortCode]);

console.log('Successfully configured invitation for RXIEHG in SQLite!');
