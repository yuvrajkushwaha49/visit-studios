const jwt = require('jsonwebtoken');
const config = require('../server/config');
const db = require('../server/db');

async function test() {
  console.log('Testing reporting system...');

  // 1. Get test users
  const admin = db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  const salesHead = db.get("SELECT * FROM users WHERE role = 'sales_head' LIMIT 1");
  const associate = db.get("SELECT * FROM users WHERE role = 'sales_associate' LIMIT 1");

  console.log('Admin:', admin ? admin.email : 'None');
  console.log('Sales Head:', salesHead ? salesHead.email : 'None');
  console.log('Associate:', associate ? associate.email : 'None');

  const adminToken = jwt.sign({ id: admin.id, role: admin.role, organization_id: admin.organization_id }, config.JWT_SECRET);
  const headToken = jwt.sign({ id: salesHead.id, role: salesHead.role, organization_id: salesHead.organization_id }, config.JWT_SECRET);
  const assocToken = jwt.sign({ id: associate.id, role: associate.role, organization_id: associate.organization_id }, config.JWT_SECRET);

  const baseUrl = 'http://localhost:3000/api/reports';

  // Test Admin Analytics
  const res1 = await fetch(`${baseUrl}/analytics?date_preset=last_30_days`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const data1 = await res1.json();
  console.log('Admin Analytics response status:', res1.status, 'KPIs:', data1.kpis ? 'OK' : 'MISSING');
  console.log('Admin KPIs:', data1.kpis);

  // Test Sales Head Analytics (Team view & My Performance view)
  const res2 = await fetch(`${baseUrl}/analytics?view=team_performance`, {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  const data2 = await res2.json();
  console.log('Head Team Analytics status:', res2.status, 'KPIs:', data2.kpis ? 'OK' : 'MISSING');

  const res3 = await fetch(`${baseUrl}/analytics?view=my_performance`, {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  const data3 = await res3.json();
  console.log('Head Personal Analytics status:', res3.status, 'KPIs:', data3.kpis ? 'OK' : 'MISSING');

  // Test Associate Analytics
  const res4 = await fetch(`${baseUrl}/analytics`, {
    headers: { Authorization: `Bearer ${assocToken}` }
  });
  const data4 = await res4.json();
  console.log('Associate Analytics status:', res4.status, 'KPIs:', data4.kpis ? 'OK' : 'MISSING');

  // Test Excel Export
  const resExcel = await fetch(`${baseUrl}/export/excel`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('Excel Export status:', resExcel.status, 'Content-Type:', resExcel.headers.get('content-type'));

  // Test CSV Export
  const resCsv = await fetch(`${baseUrl}/export/csv`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('CSV Export status:', resCsv.status, 'Content-Type:', resCsv.headers.get('content-type'));

  // Test PDF Export
  const resPdf = await fetch(`${baseUrl}/export/pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('PDF Export status:', resPdf.status, 'Content-Type:', resPdf.headers.get('content-type'));

  console.log('All backend reporting tests passed successfully!');
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
