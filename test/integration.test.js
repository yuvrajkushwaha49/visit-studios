// Visit Studio Comprehensive End-to-End Integration Test Suite
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function runTests() {
  console.log('=== STARTING VISIT STUDIO E2E TEST SUITE ===\n');

  // 1. Health check
  console.log('1. Testing /api/health ...');
  const health = await req('/api/health');
  assert.strictEqual(health.status, 'healthy');
  console.log('   ✓ Server healthy, version:', health.version);

  // 2. Authentication: Super Admin Login
  console.log('2. Testing Super Admin login...');
  const superLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'superadmin@visitstudio.com', password: 'Password@123' })
  });
  assert(superLogin.token, 'Super admin token received');
  assert.strictEqual(superLogin.user.role, 'super_admin');
  console.log('   ✓ Super Admin authenticated:', superLogin.user.name);

  // 3. Super Admin Global KPIs
  console.log('3. Testing Super Admin global KPIs...');
  const kpiData = await req('/api/organizations/global-kpis', {
    headers: { Authorization: `Bearer ${superLogin.token}` }
  });
  assert(kpiData.kpis.totalOrganizations >= 2, 'Organizations counted');
  console.log('   ✓ Global KPIs:', kpiData.kpis);

  // 4. Authentication: Admin Login
  console.log('4. Testing Admin login...');
  const adminLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@auraluxe.com', password: 'Password@123' })
  });
  assert.strictEqual(adminLogin.user.role, 'admin');
  console.log('   ✓ Admin authenticated:', adminLogin.user.name);
  const adminHeaders = { Authorization: `Bearer ${adminLogin.token}` };

  // 5. Admin Dashboard Metrics
  console.log('5. Testing Admin Dashboard conversion metrics...');
  const dash = await req('/api/reports/dashboard', { headers: adminHeaders });
  assert(dash.metrics.totalCustomers > 0, 'Customers counted');
  assert(dash.metrics.totalInvitations > 0, 'Invitations counted');
  console.log(`   ✓ Metrics: Invitations=${dash.metrics.totalInvitations}, Confirmed=${dash.metrics.confirmedVisits}, Rate=${dash.metrics.confirmationRate}%`);

  // 6. Customer Management: Add new customer & check duplicate detection
  console.log('6. Testing Customer creation and duplicate mobile check...');
  const testPhone = '+9198' + Math.floor(10000000 + Math.random() * 90000000);
  const newCust = await req('/api/customers', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      full_name: 'Aditya Singhania',
      mobile_number: testPhone,
      budget: '₹6.50 Cr',
      preferred_location: 'Golf Course Road',
      lead_source: 'Direct'
    })
  });
  assert(newCust.customer.id, 'Customer created');
  console.log('   ✓ Customer created:', newCust.customer.full_name, newCust.customer.customer_code);

  // Attempt duplicate mobile
  let duplicateCaught = false;
  try {
    await req('/api/customers', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        full_name: 'Aditya Duplicate',
        mobile_number: testPhone
      })
    });
  } catch (err) {
    duplicateCaught = true;
    console.log('   ✓ Duplicate mobile correctly rejected:', err.message);
  }
  assert(duplicateCaught, 'Duplicate mobile number was caught');

  // 7. Digital Invitation Creation & Token Generation
  console.log('7. Testing Digital Invitation Builder...');
  const projs = await req('/api/projects', { headers: adminHeaders });
  const proj = projs.projects[0];
  const inviteRes = await req('/api/invitations', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      customer_id: newCust.customer.id,
      project_id: proj.id,
      visit_date: '2026-11-25',
      visit_time: '14:30',
      duration: 60,
      notes: 'High floor Aravali view sample unit walkthrough'
    })
  });
  assert(inviteRes.invitation.token, 'Unguessable token generated');
  assert(inviteRes.invitation.qr_code_data.startsWith('data:image/png;base64,'), 'QR code generated');
  console.log('   ✓ Invitation created with token:', inviteRes.invitation.token);

  // 8. Public Customer Access (Unauthenticated)
  console.log('8. Testing Public Customer Invitation URL access...');
  const publicRes = await req(`/api/invitations/public/${inviteRes.invitation.token}`);
  assert.strictEqual(publicRes.invitation.customer_name, 'Aditya Singhania');
  assert.strictEqual(publicRes.invitation.project_name, proj.name);
  console.log('   ✓ Public invitation opened by customer:', publicRes.invitation.project_name);

  // 9. Customer RSVP Confirmation
  console.log('9. Testing Customer Attendance Confirmation RSVP...');
  const confirmRes = await req(`/api/invitations/public/${inviteRes.invitation.token}/confirm`, {
    method: 'POST'
  });
  assert(confirmRes.success, 'Attendance confirmed');
  console.log('   ✓ Customer RSVP:', confirmRes.message);

  // 10. On-Site Staff Contactless QR Check-in
  console.log('10. Testing Staff QR Check-in Attendance verification...');
  const checkInRes = await req('/api/visits/check-in', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      token: inviteRes.invitation.token,
      check_in_method: 'qr',
      staff_notes: 'Customer arrived at gate 2, greeted by host'
    })
  });
  assert(checkInRes.success, 'Check-in verified');
  console.log('   ✓ Check-in verified:', checkInRes.message, 'at', checkInRes.checkInTime);

  // 11. Conclude Visit and Trigger Feedback
  console.log('11. Testing Visit Completion & Feedback Request...');
  const checkOutRes = await req(`/api/visits/${checkInRes.visitId}/check-out`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      staff_notes: 'Customer was impressed with the private sky pool and asked for booking token form.',
      proceed_to_booking: true
    })
  });
  assert(checkOutRes.success, 'Visit completed');
  console.log('   ✓ Visit concluded:', checkOutRes.message);

  // 12. Submit Customer Post-Visit Feedback
  console.log('12. Testing Customer Feedback submission...');
  const fbRes = await req(`/api/visits/${checkInRes.visitId}/feedback`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      rating: 5,
      interest_level: 'very_high',
      budget_fit: 'within_budget',
      notes: 'Exceptional host service. Looking forward to completing booking.'
    })
  });
  assert(fbRes.success, 'Feedback submitted');
  console.log('   ✓ Feedback recorded:', fbRes.message);

  // 13. Sales Head Hierarchy Scoping
  console.log('13. Testing Sales Head RBAC scope...');
  const headLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'saleshead@auraluxe.com', password: 'Password@123' })
  });
  assert.strictEqual(headLogin.user.role, 'sales_head');
  const headCusts = await req('/api/customers', {
    headers: { Authorization: `Bearer ${headLogin.token}` }
  });
  console.log(`   ✓ Sales Head scoped customers returned: ${headCusts.customers.length}`);

  // 14. Sales Associate Scoping
  console.log('14. Testing Sales Associate RBAC scope...');
  const assocLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'associate@auraluxe.com', password: 'Password@123' })
  });
  assert.strictEqual(assocLogin.user.role, 'sales_associate');
  const assocCusts = await req('/api/customers', {
    headers: { Authorization: `Bearer ${assocLogin.token}` }
  });
  console.log(`   ✓ Sales Associate personal customers returned: ${assocCusts.customers.length}`);

  console.log('\n=== ALL 14 INTEGRATION TESTS PASSED PERFECTLY! ===');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
