// Comprehensive Lead Management Functional, Security & Data Integrity Test Suite
const assert = require('assert');
const jwt = require('jsonwebtoken');
const config = require('../server/config');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function apiReq(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function login(email, password = 'Password@123') {
  const res = await apiReq('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert.strictEqual(res.status, 200, `Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data;
}

function signUserToken(user) {
  return jwt.sign({ id: user.id, role: user.role, organization_id: user.organization_id }, config.JWT_SECRET, { expiresIn: '1h' });
}

async function runLeadTests() {
  console.log('=== STARTING LEAD MANAGEMENT COMPREHENSIVE TEST SUITE ===\n');

  // 0. Health & Unauthenticated check
  const health = await apiReq('/api/health');
  assert.strictEqual(health.status, 200);
  const unauthLeads = await apiReq('/api/leads');
  assert.strictEqual(unauthLeads.status, 401, 'Unauthenticated /api/leads must return 401');
  console.log('✓ 1. Health & unauthenticated request rejection verified');

  // 1. Authenticate all 4 roles via HTTP API + Super Admin user lookup (no direct SQLite lock)
  const superAdmin = await login('superadmin@visitstudio.com');
  const admin = await login('admin@auraluxe.com');
  const salesHead1 = await login('saleshead@auraluxe.com');
  const assoc1 = await login('associate@auraluxe.com');

  const hSuper = { Authorization: `Bearer ${superAdmin.token}` };
  const hAdmin = { Authorization: `Bearer ${admin.token}` };
  const hHead1 = { Authorization: `Bearer ${salesHead1.token}` };
  const hAssoc1 = { Authorization: `Bearer ${assoc1.token}` };

  const allUsersRes = await apiReq('/api/users', { headers: hSuper });
  assert.strictEqual(allUsersRes.status, 200);
  const allUsers = allUsersRes.data.users || [];
  const head2User = allUsers.find(u => u.email === 'saleshead2@auraluxe.com' && u.status === 'active');
  const assoc3User = allUsers.find(u => u.email === 'associate3@auraluxe.com' && u.status === 'active');
  const workAdminUser = allUsers.find(u => u.email === 'sajanpatel@workians.com' && u.status === 'active');
  assert(head2User && assoc3User && workAdminUser, 'Expected active seeded users for cross-team & cross-org checks');

  const salesHead2 = { user: head2User, token: signUserToken(head2User) };
  const assoc3 = { user: assoc3User, token: signUserToken(assoc3User) };
  const workiansAdmin = { user: workAdminUser, token: signUserToken(workAdminUser) };

  // Create an active associate under salesHead1 for intra-team reassignment & IDOR tests
  const tempAssocEmail = `test.assoc.${Date.now()}@auraluxe.com`;
  const createAssocRes = await apiReq('/api/users', {
    method: 'POST',
    headers: hHead1,
    body: JSON.stringify({
      name: 'Temp Team Associate',
      email: tempAssocEmail,
      phone: '+919800001122',
      role: 'sales_associate',
      password: 'Password@123'
    })
  });
  assert.strictEqual(createAssocRes.status, 201);
  const assoc2User = { ...createAssocRes.data.user, organization_id: salesHead1.user.organization_id };
  const assoc2 = { user: assoc2User, token: signUserToken(assoc2User) };

  const hHead2 = { Authorization: `Bearer ${salesHead2.token}` };
  const hAssoc2 = { Authorization: `Bearer ${assoc2.token}` };
  const hAssoc3 = { Authorization: `Bearer ${assoc3.token}` };
  const hWorkAdmin = { Authorization: `Bearer ${workiansAdmin.token}` };

  // Fetch org projects
  const projRes = await apiReq('/api/projects', { headers: hAdmin });
  assert(projRes.ok && projRes.data.projects.length >= 2, 'Need at least 2 projects in Aura Luxe org');
  const project1 = projRes.data.projects[0];
  const project2 = projRes.data.projects[1];

  // 2. Campaign & Tracking Link Generation (Associate, Sales Head, Admin)
  const campRes = await apiReq('/api/lead-links/campaigns', {
    method: 'POST',
    headers: hAdmin,
    body: JSON.stringify({ name: `Test Campaign ${Date.now()}`, source_channel: 'WhatsApp' })
  });
  assert.strictEqual(campRes.status, 201);
  const campaignId = campRes.data.campaign.id;

  const assocLinkRes = await apiReq('/api/lead-links', {
    method: 'POST',
    headers: hAssoc1,
    body: JSON.stringify({
      title: 'Associate 1 VIP Enquiry',
      project_id: project1.id,
      campaign_id: campaignId,
      source_name: 'WhatsApp Outreach',
      // Attempt client-side spoofing of owner/org — backend MUST ignore!
      owner_associate_id: assoc3.user.id,
      organization_id: workiansAdmin.user.organization_id
    })
  });
  assert.strictEqual(assocLinkRes.status, 201);
  const assocLink = assocLinkRes.data.link;
  assert.strictEqual(assocLink.owner_associate_id, assoc1.user.id, 'Associate link must attribute strictly to authenticated associate');
  assert.strictEqual(assocLink.organization_id, assoc1.user.organization_id, 'Organization must come from authenticated user');

  const headLinkRes = await apiReq('/api/lead-links', {
    method: 'POST',
    headers: hHead1,
    body: JSON.stringify({ title: 'Sales Head Pool Link', project_id: project1.id })
  });
  assert.strictEqual(headLinkRes.status, 201);
  assert.strictEqual(headLinkRes.data.link.owner_associate_id, null, 'Sales Head link must NOT invent an associate');
  assert.strictEqual(headLinkRes.data.link.owner_sales_head_id, salesHead1.user.id);

  const adminLinkRes = await apiReq('/api/lead-links', {
    method: 'POST',
    headers: hAdmin,
    body: JSON.stringify({ title: 'Admin General Link' })
  });
  assert.strictEqual(adminLinkRes.status, 201);
  assert.strictEqual(adminLinkRes.data.link.owner_associate_id, null, 'Admin link must NOT invent an associate');
  console.log('✓ 2. Campaign & tracking link generation + spoofing protection verified');

  // 3. Public /e/:code redirect & /api/public/enquiry/:token metadata (no internal IDs exposed)
  const redirRes = await fetch(`${BASE_URL}/e/${assocLink.short_code}`, { redirect: 'manual' });
  assert.strictEqual(redirRes.status, 302);
  assert(redirRes.headers.get('location').includes(`?enquiry=${assocLink.token}`));

  const pubMetaRes = await apiReq(`/api/public/enquiry/${assocLink.token}?session_id=test_sess_1`);
  assert.strictEqual(pubMetaRes.status, 200);
  const meta = pubMetaRes.data.enquiryForm;
  assert.strictEqual(meta.organization_id, undefined, 'Internal organization_id must NOT be exposed publicly');
  assert.strictEqual(meta.creator_user_id, undefined, 'Internal creator_user_id must NOT be exposed publicly');
  assert.strictEqual(meta.owner_associate_id, undefined, 'Internal owner_associate_id must NOT be exposed publicly');
  assert(meta.projects.length === 1 && meta.projects[0].id === project1.id);

  const startRes = await apiReq(`/api/public/enquiry/${assocLink.token}/start`, {
    method: 'POST',
    body: JSON.stringify({ session_id: 'test_sess_1' })
  });
  assert.strictEqual(startRes.status, 200);
  console.log('✓ 3. Public short-URL redirect, safe metadata & form start tracking verified');

  // 4. Honeypot spam protection & tampered token checks
  const spamRes = await apiReq(`/api/public/enquiry/${assocLink.token}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: project1.id,
      apartment_size: '3 BHK',
      purchase_timeline: 'Within 3 Months',
      preferred_callback_time: 'Morning (10 AM - 12 PM)',
      full_name: 'Bot User',
      mobile_number: '+919911223344',
      city: 'Gurgaon',
      contact_consent: true,
      website_url: 'http://spam.example.com'
    })
  });
  assert.strictEqual(spamRes.status, 400, 'Honeypot spam submission must be rejected');

  const badTokenRes = await apiReq('/api/public/enquiry/tampered_invalid_token_123');
  assert.strictEqual(badTokenRes.status, 404);
  console.log('✓ 4. Spam protection & invalid token rejection verified');

  // 5. Customer submits 5-step enquiry via Associate 1's link (with client-side spoof attempt)
  const uniquePhone = '+9198' + Math.floor(10000000 + Math.random() * 89999999);
  const submitRes = await apiReq(`/api/public/enquiry/${assocLink.token}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: project2.id, // link is locked to project1, backend must enforce project1
      apartment_size: '4 BHK Presidential',
      budget: '₹5 Cr – ₹8 Cr',
      purchase_timeline: 'Immediate / Ready to Move',
      preferred_callback_time: 'Evening (4 PM - 7 PM)',
      full_name: 'Rhea Oberoi',
      mobile_number: uniquePhone,
      email: 'rhea.oberoi@example.com',
      city: 'Gurgaon',
      requirements: 'Higher floor park facing',
      contact_consent: true,
      // Attempt client-side spoofing of attribution
      assigned_associate_id: assoc3.user.id,
      organization_id: workiansAdmin.user.organization_id
    })
  });
  assert.strictEqual(submitRes.status, 201, `Submit failed: ${JSON.stringify(submitRes.data)}`);
  assert(submitRes.data.confirmation.enquiry_ref.startsWith('ENQ-'));
  assert.strictEqual(submitRes.data.confirmation.project_name, project1.name, 'Project-locked link must enforce project1');
  assert.strictEqual(submitRes.data.confirmation.customer_name, 'Rhea Oberoi');
  assert.strictEqual(submitRes.data.confirmation.advisor_name, assoc1.user.name, 'Associate link must show Associate name');

  // 5b. Associate must NOT create Bulk WhatsApp Marketing link; Admin CAN and receipt shows Aishwarya & 9289846060
  const assocBulkDenied = await apiReq('/api/lead-links', {
    method: 'POST',
    headers: hAssoc1,
    body: JSON.stringify({
      title: 'Unauthorized Bulk WA',
      project_id: project1.id,
      link_type: 'bulk_whatsapp'
    })
  });
  assert.strictEqual(assocBulkDenied.status, 403, 'Associate must not generate Bulk WhatsApp Marketing links');

  const bulkLinkRes = await apiReq('/api/lead-links', {
    method: 'POST',
    headers: hAdmin,
    body: JSON.stringify({
      title: 'Bulk WA Blast',
      project_id: project1.id,
      link_type: 'bulk_whatsapp'
    })
  });
  assert.strictEqual(bulkLinkRes.status, 201);
  const bulkMetaRes = await apiReq(`/api/public/enquiry/${bulkLinkRes.data.link.token}`);
  assert.strictEqual(bulkMetaRes.status, 200);
  assert.strictEqual(bulkMetaRes.data.enquiryForm.advisor_display_name, 'Aishwarya');
  assert.strictEqual(bulkMetaRes.data.enquiryForm.advisor_display_phone, '9289846060');
  assert.strictEqual(bulkMetaRes.data.enquiryForm.organization_id, undefined, 'Bulk WA public metadata must not leak org ID');

  const bulkPhone = '+9197' + Math.floor(10000000 + Math.random() * 89999999);
  const bulkSubmit = await apiReq(`/api/public/enquiry/${bulkLinkRes.data.link.token}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: project1.id,
      apartment_size: '3 Bed Ultima',
      purchase_timeline: 'Immediately',
      preferred_callback_time: '12:00 PM to 3:00 PM',
      full_name: 'Bulk WA Prospect',
      mobile_number: bulkPhone,
      city: 'Noida',
      contact_consent: true
    })
  });
  assert.strictEqual(bulkSubmit.status, 201);
  assert.strictEqual(bulkSubmit.data.confirmation.advisor_name, 'Aishwarya');
  assert.strictEqual(bulkSubmit.data.confirmation.advisor_phone, '9289846060');
  assert.strictEqual(bulkSubmit.data.confirmation.customer_name, 'Bulk WA Prospect');
  assert(bulkSubmit.data.confirmation.customer_mobile);

  // Verify attribution in Associate 1, Sales Head 1, Admin, Super Admin dashboards
  const assoc1Leads = await apiReq(`/api/leads?search=${encodeURIComponent(submitRes.data.confirmation.enquiry_ref)}`, { headers: hAssoc1 });
  assert.strictEqual(assoc1Leads.data.leads.length, 1);
  const createdLead = assoc1Leads.data.leads[0];
  assert.strictEqual(createdLead.assigned_associate_id, assoc1.user.id);
  assert.strictEqual(createdLead.assigned_sales_head_id, salesHead1.user.id);
  assert.strictEqual(createdLead.original_associate_id, assoc1.user.id);

  const head1Leads = await apiReq(`/api/leads?search=${encodeURIComponent(createdLead.enquiry_ref)}`, { headers: hHead1 });
  assert.strictEqual(head1Leads.data.leads.length, 1);
  const adminLeads = await apiReq(`/api/leads?search=${encodeURIComponent(createdLead.enquiry_ref)}`, { headers: hAdmin });
  assert.strictEqual(adminLeads.data.leads.length, 1);
  const superLeads = await apiReq(`/api/leads?search=${encodeURIComponent(createdLead.enquiry_ref)}`, { headers: hSuper });
  assert.strictEqual(superLeads.data.leads.length, 1);
  console.log('✓ 5. End-to-end 5-step submission & multi-tier attribution verified:', createdLead.enquiry_ref);

  // 6. Security / IDOR Isolation Checks
  const assoc2Get = await apiReq(`/api/leads/${createdLead.id}`, { headers: hAssoc2 });
  assert.strictEqual(assoc2Get.status, 403, 'Associate 2 must NOT access Associate 1 lead');
  const head2Get = await apiReq(`/api/leads/${createdLead.id}`, { headers: hHead2 });
  assert.strictEqual(head2Get.status, 403, 'Sales Head 2 must NOT access Sales Head 1 team lead');
  const workAdminGet = await apiReq(`/api/leads/${createdLead.id}`, { headers: hWorkAdmin });
  assert.strictEqual(workAdminGet.status, 403, 'Other org Admin must NOT access Aura Luxe lead');
  const assoc1LinkCheck = await apiReq(`/api/lead-links/${assocLink.id}`, { headers: hAssoc2 });
  assert.strictEqual(assoc1LinkCheck.status, 403, 'Associate 2 must NOT view Associate 1 link');
  const assocAssignAttempt = await apiReq(`/api/leads/${createdLead.id}/assign`, {
    method: 'POST',
    headers: hAssoc1,
    body: JSON.stringify({ associate_id: assoc2.user.id, reason: 'Unauthorized attempt' })
  });
  assert.strictEqual(assocAssignAttempt.status, 403, 'Associate must NOT reassign leads');
  const headCrossTeamAssign = await apiReq(`/api/leads/${createdLead.id}/assign`, {
    method: 'POST',
    headers: hHead1,
    body: JSON.stringify({ associate_id: assoc3.user.id, reason: 'Cross team test' })
  });
  assert.strictEqual(headCrossTeamAssign.status, 403, 'Sales Head 1 must NOT assign lead to Associate 3 in another team');
  console.log('✓ 6. IDOR & cross-team / cross-org security checks verified');

  // 7. Duplicate Customer & Multi-Project Enquiry Handling + Concurrency
  // Submit via Admin general link for Project 2 using the SAME mobile number
  const secondProjectSubmit = await apiReq(`/api/public/enquiry/${adminLinkRes.data.link.token}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: project2.id,
      apartment_size: '3 BHK Luxury',
      purchase_timeline: '3 - 6 Months',
      preferred_callback_time: 'Afternoon (12 PM - 4 PM)',
      full_name: 'Rhea Oberoi',
      mobile_number: uniquePhone,
      city: 'Gurgaon',
      contact_consent: true
    })
  });
  assert.strictEqual(secondProjectSubmit.status, 201);

  const cust360 = await apiReq(`/api/customers/${createdLead.customer_id}`, { headers: hAdmin });
  assert.strictEqual(cust360.data.enquiries.length, 2, 'Existing customer must have 2 project enquiries without duplicating customer');
  assert.strictEqual(cust360.data.customer.assigned_associate_id, assoc1.user.id, 'Customer ownership must NOT be transferred away from Associate 1');

  // Concurrent duplicate submission test
  const concResults = await Promise.all([
    apiReq(`/api/public/enquiry/${assocLink.token}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        project_id: project1.id,
        apartment_size: '4 BHK',
        purchase_timeline: 'Within 3 Months',
        preferred_callback_time: 'Morning (10 AM - 12 PM)',
        full_name: 'Rhea Oberoi',
        mobile_number: uniquePhone,
        city: 'Gurgaon',
        contact_consent: true
      })
    }),
    apiReq(`/api/public/enquiry/${assocLink.token}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        project_id: project1.id,
        apartment_size: '4 BHK',
        purchase_timeline: 'Within 3 Months',
        preferred_callback_time: 'Morning (10 AM - 12 PM)',
        full_name: 'Rhea Oberoi',
        mobile_number: uniquePhone,
        city: 'Gurgaon',
        contact_consent: true
      })
    })
  ]);
  assert(concResults.every(r => r.status === 201), 'Concurrent submissions must complete safely inside transactions');
  const dupQueue = await apiReq('/api/leads/duplicates', { headers: hAdmin });
  assert(dupQueue.data.duplicates.some(d => d.customer_id === createdLead.customer_id && d.duplicate_status === 'duplicate_flagged'));
  console.log('✓ 7. Duplicate detection, multi-project linking, ownership preservation & concurrency verified');

  // 8. Stage Transitions, Assignment (preserving original attribution), Follow-up & Site Visit Integration
  const invalidStage = await apiReq(`/api/leads/${createdLead.id}/stage`, {
    method: 'PATCH',
    headers: hAssoc1,
    body: JSON.stringify({ stage: 'booked_won', notes: 'Skip stages' })
  });
  assert.strictEqual(invalidStage.status, 400, 'Skipping pipeline stages must be rejected');

  const lostWithoutReason = await apiReq(`/api/leads/${createdLead.id}/stage`, {
    method: 'PATCH',
    headers: hAssoc1,
    body: JSON.stringify({ stage: 'lost' })
  });
  assert.strictEqual(lostWithoutReason.status, 400, 'Loss reason must be required for Lost stage');

  const stage1 = await apiReq(`/api/leads/${createdLead.id}/stage`, {
    method: 'PATCH',
    headers: hAssoc1,
    body: JSON.stringify({ stage: 'contacted', notes: 'Called customer and shared floor plan' })
  });
  assert.strictEqual(stage1.status, 200);

  // Reassign from Assoc1 to Assoc2 by Sales Head 1 -> original_associate_id MUST remain Assoc1!
  const reassignRes = await apiReq(`/api/leads/${createdLead.id}/assign`, {
    method: 'POST',
    headers: hHead1,
    body: JSON.stringify({ associate_id: assoc2.user.id, reason: 'Balancing team workload' })
  });
  assert.strictEqual(reassignRes.status, 200);
  assert.strictEqual(reassignRes.data.lead.assigned_associate_id, assoc2.user.id);
  assert.strictEqual(reassignRes.data.lead.original_associate_id, assoc1.user.id, 'Original attribution MUST remain immutable');

  // Schedule invitation & site visit directly from Lead
  const schedVisit = await apiReq(`/api/leads/${createdLead.id}/schedule-visit`, {
    method: 'POST',
    headers: hAssoc2,
    body: JSON.stringify({ visit_date: '2026-12-05', visit_time: '11:30' })
  });
  assert.strictEqual(schedVisit.status, 201);
  assert(schedVisit.data.invitation.id && schedVisit.data.site_visit_id);
  assert.strictEqual(schedVisit.data.lead.stage, 'site_visit_scheduled');

  // Create & complete follow-up + overdue sweep check
  const folRes = await apiReq('/api/followups', {
    method: 'POST',
    headers: hAssoc2,
    body: JSON.stringify({
      customer_id: createdLead.customer_id,
      lead_id: createdLead.id,
      follow_up_date: '2020-01-01', // past date to test overdue detection
      follow_up_type: 'call',
      priority: 'high',
      notes: 'Confirm site visit slot'
    })
  });
  assert.strictEqual(folRes.status, 201);
  const overdueRes = await apiReq('/api/followups/overdue', { headers: hAssoc2 });
  assert(overdueRes.data.followups.some(f => f.id === folRes.data.id));
  const folDone = await apiReq(`/api/followups/${folRes.data.id}/status`, {
    method: 'PATCH',
    headers: hAssoc2,
    body: JSON.stringify({ status: 'completed', completion_notes: 'Confirmed attendance' })
  });
  assert.strictEqual(folDone.status, 200);
  console.log('✓ 8. Stage rules, immutable attribution on reassign, invitation/visit integration & follow-ups verified');

  // 9. Link Edit, Deactivation & Expiry Enforcement
  const editLinkRes = await apiReq(`/api/lead-links/${assocLink.id}`, {
    method: 'PATCH',
    headers: hAssoc1,
    body: JSON.stringify({ title: 'Updated Link Title', source_name: 'Google Ads', project_id: project2.id })
  });
  assert.strictEqual(editLinkRes.status, 200);
  assert.strictEqual(editLinkRes.data.link.title, 'Updated Link Title');
  assert.strictEqual(editLinkRes.data.link.source_name, 'Google Ads');
  assert.strictEqual(editLinkRes.data.link.project_id, project2.id);

  const deactRes = await apiReq(`/api/lead-links/${assocLink.id}/deactivate`, { method: 'POST', headers: hAssoc1 });
  assert.strictEqual(deactRes.status, 200);
  const blockedOpen = await apiReq(`/api/public/enquiry/${assocLink.token}`);
  assert.strictEqual(blockedOpen.status, 410, 'Deactivated link must reject opens');
  const blockedSubmit = await apiReq(`/api/public/enquiry/${assocLink.token}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: project1.id,
      apartment_size: '3 BHK',
      purchase_timeline: 'Within 3 Months',
      preferred_callback_time: 'Morning',
      full_name: 'Late Visitor',
      mobile_number: '+919988776655',
      city: 'Delhi',
      contact_consent: true
    })
  });
  assert.strictEqual(blockedSubmit.status, 410, 'Deactivated link must reject submissions');

  // Expired link check
  const pastIso = new Date(Date.now() - 3600 * 1000).toISOString();
  const expLinkRes = await apiReq('/api/lead-links', {
    method: 'POST',
    headers: hAdmin,
    body: JSON.stringify({ title: 'Expired Test Link', expires_at: pastIso })
  });
  const blockedExp = await apiReq(`/api/public/enquiry/${expLinkRes.data.link.token}`);
  assert.strictEqual(blockedExp.status, 410, 'Expired link must return 410');
  console.log('✓ 9. Deactivated & expired tracking link enforcement verified');

  // 10. Reports, Admin direct Associate filtering & Excel/CSV/PDF Exports
  const adminAssocReport = await apiReq(`/api/reports/overview?associate_id=${assoc2.user.id}`, { headers: hAdmin });
  assert.strictEqual(adminAssocReport.status, 200);
  assert(adminAssocReport.data.kpis.totalLeads >= 1, 'Admin must be able to filter directly by Associate without Sales Head');

  const csvExport = await apiReq('/api/reports/lead-export?format=csv', { headers: hAdmin });
  assert.strictEqual(csvExport.status, 200);
  const xlsxExport = await apiReq('/api/reports/lead-export?format=excel', { headers: hAdmin });
  assert.strictEqual(xlsxExport.status, 200);
  const pdfExport = await apiReq('/api/reports/lead-export?format=pdf', { headers: hAdmin });
  assert.strictEqual(pdfExport.status, 200);

  // 11. Standard List Filters (Date From-To, Team Name, Associate Name, Builder & Project Name)
  const filterQs = `date_from=2020-01-01&date_to=2030-12-31&team_id=${salesHead1.user.id}&associate_id=${assoc2.user.id}&developer_id=${project1.developer_id}&project_id=${project1.id}`;
  const [fLinks, fLeads, fInv, fVisits, fCust, fFol] = await Promise.all([
    apiReq(`/api/lead-links?${filterQs}`, { headers: hAdmin }),
    apiReq(`/api/leads?${filterQs}`, { headers: hAdmin }),
    apiReq(`/api/invitations?${filterQs}`, { headers: hAdmin }),
    apiReq(`/api/visits?${filterQs}`, { headers: hAdmin }),
    apiReq(`/api/customers?${filterQs}`, { headers: hAdmin }),
    apiReq(`/api/followups?${filterQs}`, { headers: hAdmin })
  ]);
  assert.strictEqual(fLinks.status, 200);
  assert.strictEqual(fLeads.status, 200);
  assert(fLeads.data.leads.some(l => l.id === createdLead.id), 'Filtered leads should return matching lead');
  assert.strictEqual(fInv.status, 200);
  assert(fInv.data.invitations.length >= 1, 'Filtered invitations should return matching invitation');
  assert.strictEqual(fVisits.status, 200);
  assert(fVisits.data.visits.length >= 1, 'Filtered visits should return matching visit');
  assert.strictEqual(fCust.status, 200);
  assert.strictEqual(fFol.status, 200);
  assert(fFol.data.followups.length >= 1, 'Filtered followups should return matching followup');
  console.log('✓ 10. Reports, direct Associate filter, and Excel/CSV/PDF exports verified');
  console.log('✓ 11. Unified list filters (Date From-To, Team, Associate, Builder, Project) verified across all endpoints');

  console.log('\n🎉 ALL LEAD MANAGEMENT TESTS PASSED SUCCESSFULLY!');
}

runLeadTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ LEAD TEST FAILED:', err);
    process.exit(1);
  });
