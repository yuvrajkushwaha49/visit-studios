const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const {
  arrayToCSV,
  generateExcelReport,
  generateCSVReport,
  generatePDFReport
} = require('../services/exportService');
const { getLeadOverviewReport } = require('../services/leadReportService');

router.use(authenticate);

/**
 * Helper to compute date range from presets
 */
function resolveDateRange(preset, date_from, date_to) {
  const now = new Date();
  const format = d => d.toISOString().slice(0, 10);

  if (preset === 'today') {
    const today = format(now);
    return { from: today, to: today, label: 'Today' };
  } else if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const dStr = format(yest);
    return { from: dStr, to: dStr, label: 'Yesterday' };
  } else if (preset === 'last_7_days') {
    const past = new Date(now);
    past.setDate(past.getDate() - 7);
    return { from: format(past), to: format(now), label: 'Last 7 Days' };
  } else if (preset === 'last_30_days') {
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    return { from: format(past), to: format(now), label: 'Last 30 Days' };
  } else if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { from: format(monday), to: format(sunday), label: 'This Week' };
  } else if (preset === 'last_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { from: format(monday), to: format(sunday), label: 'Last Week' };
  } else if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: format(firstDay), to: format(lastDay), label: 'This Month' };
  } else if (preset === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: format(firstDay), to: format(lastDay), label: 'Last Month' };
  } else if (date_from || date_to) {
    return {
      from: date_from || '1970-01-01',
      to: date_to || '2099-12-31',
      label: `${date_from || 'Start'} to ${date_to || 'Present'}`
    };
  }
  return { from: null, to: null, label: 'All Time' };
}

/**
 * Build role-based security & filter conditions
 */
function buildReportContext(user, queryParams) {
  const {
    organization_id,
    date_preset,
    date_from,
    date_to,
    sales_head_ids,
    associate_ids,
    developer_id,
    project_id,
    invitation_status,
    visit_status,
    followup_status,
    view
  } = queryParams;

  const dateRange = resolveDateRange(date_preset, date_from, date_to);

  let targetOrgId = user.organization_id;
  if (user.role === 'super_admin' && organization_id && organization_id !== 'all') {
    targetOrgId = organization_id;
  }

  // Parse multi-select IDs
  const headIdsList = sales_head_ids ? sales_head_ids.split(',').map(s => s.trim()).filter(Boolean) : [];
  const assocIdsList = associate_ids ? associate_ids.split(',').map(s => s.trim()).filter(Boolean) : [];

  return {
    user,
    targetOrgId,
    dateRange,
    headIdsList,
    assocIdsList,
    developer_id: developer_id || null,
    project_id: project_id || null,
    invitation_status: invitation_status || null,
    visit_status: visit_status || null,
    followup_status: followup_status || null,
    view: view || 'overview'
  };
}

/**
 * Internal reporting engine - aggregates KPIs, charts, distributions, and tabular records
 */
function fetchAggregatedReportData(ctx) {
  const { user, targetOrgId, dateRange, headIdsList, assocIdsList, developer_id, project_id, invitation_status, visit_status, followup_status, view } = ctx;

  // Base Org filter
  const isGlobalSuperAdmin = user.role === 'super_admin' && (!targetOrgId || targetOrgId === 'all');

  // Helpers for SQL conditions
  const orgWhere = (tableAlias) => {
    if (isGlobalSuperAdmin) return ' 1=1 ';
    return ` ${tableAlias}.organization_id = '${targetOrgId}' `;
  };

  // Associate scoping based on role hierarchy
  let effectiveAssocClause = (tableAlias) => {
    let clauses = [];

    // Role strict isolation
    if (user.role === 'sales_associate') {
      clauses.push(`${tableAlias}.associate_id = '${user.id}'`);
    } else if (user.role === 'sales_head') {
      if (view === 'my_performance') {
        clauses.push(`(${tableAlias}.associate_id = '${user.id}' OR ${tableAlias}.sales_head_id = '${user.id}')`);
      } else {
        // Team performance: associate is under this sales head
        clauses.push(`(${tableAlias}.sales_head_id = '${user.id}' OR ${tableAlias}.associate_id IN (SELECT id FROM users WHERE sales_head_id = '${user.id}'))`);
      }
    }

    // Admin / Super Admin multi-select filters
    if (headIdsList.length > 0 && user.role !== 'sales_associate') {
      const quotedHeads = headIdsList.map(h => `'${h}'`).join(',');
      clauses.push(`(${tableAlias}.sales_head_id IN (${quotedHeads}) OR ${tableAlias}.associate_id IN (SELECT id FROM users WHERE sales_head_id IN (${quotedHeads})))`);
    }

    if (assocIdsList.length > 0 && user.role !== 'sales_associate') {
      const quotedAssocs = assocIdsList.map(a => `'${a}'`).join(',');
      clauses.push(`${tableAlias}.associate_id IN (${quotedAssocs})`);
    }

    return clauses.length ? clauses.join(' AND ') : ' 1=1 ';
  };

  // 1. KPI Aggregation
  // Customers KPIs
  let custWhere = `WHERE ${orgWhere('c')}`;
  if (user.role === 'sales_associate') {
    custWhere += ` AND c.assigned_associate_id = '${user.id}'`;
  } else if (user.role === 'sales_head') {
    if (view === 'my_performance') {
      custWhere += ` AND (c.assigned_associate_id = '${user.id}' OR c.assigned_sales_head_id = '${user.id}')`;
    } else {
      custWhere += ` AND (c.assigned_sales_head_id = '${user.id}' OR c.assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = '${user.id}'))`;
    }
  } else {
    if (headIdsList.length > 0) {
      const quoted = headIdsList.map(h => `'${h}'`).join(',');
      custWhere += ` AND (c.assigned_sales_head_id IN (${quoted}) OR c.assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id IN (${quoted})))`;
    }
    if (assocIdsList.length > 0) {
      const quoted = assocIdsList.map(a => `'${a}'`).join(',');
      custWhere += ` AND c.assigned_associate_id IN (${quoted})`;
    }
  }
  if (dateRange.from && dateRange.to) {
    custWhere += ` AND c.created_at >= '${dateRange.from} 00:00:00' AND c.created_at <= '${dateRange.to} 23:59:59'`;
  }

  const custSummary = db.get(`
    SELECT
      COUNT(*) as total_customers,
      SUM(CASE WHEN c.status = 'booked' THEN 1 ELSE 0 END) as total_bookings
    FROM customers c
    ${custWhere}
  `) || { total_customers: 0, total_bookings: 0 };

  // Invitations KPIs
  let invWhere = `WHERE ${orgWhere('i')} AND ${effectiveAssocClause('i')}`;
  if (project_id) invWhere += ` AND i.project_id = '${project_id}'`;
  if (developer_id) invWhere += ` AND i.developer_id = '${developer_id}'`;
  if (invitation_status) invWhere += ` AND i.status = '${invitation_status}'`;
  if (dateRange.from && dateRange.to) {
    invWhere += ` AND i.created_at >= '${dateRange.from} 00:00:00' AND i.created_at <= '${dateRange.to} 23:59:59'`;
  }

  const invSummary = db.get(`
    SELECT
      COUNT(*) as total_created,
      SUM(CASE WHEN i.status IN ('sent', 'viewed', 'scheduled', 'confirmed', 'completed') THEN 1 ELSE 0 END) as total_sent
    FROM invitations i
    ${invWhere}
  `) || { total_created: 0, total_sent: 0 };

  // Site Visits KPIs
  let visitWhere = `WHERE ${orgWhere('sv')} AND ${effectiveAssocClause('sv')}`;
  if (project_id) visitWhere += ` AND sv.project_id = '${project_id}'`;
  if (developer_id) {
    visitWhere += ` AND sv.project_id IN (SELECT id FROM projects WHERE developer_id = '${developer_id}')`;
  }
  if (visit_status) visitWhere += ` AND sv.status = '${visit_status}'`;
  if (dateRange.from && dateRange.to) {
    visitWhere += ` AND sv.scheduled_date >= '${dateRange.from}' AND sv.scheduled_date <= '${dateRange.to}'`;
  }

  const visitSummary = db.get(`
    SELECT
      COUNT(*) as total_visits,
      SUM(CASE WHEN sv.status IN ('confirmed', 'arrived', 'checked_in', 'completed') THEN 1 ELSE 0 END) as confirmed_visits,
      SUM(CASE WHEN sv.status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
      SUM(CASE WHEN sv.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_visits,
      SUM(CASE WHEN sv.status = 'no_show' THEN 1 ELSE 0 END) as no_show_visits
    FROM site_visits sv
    ${visitWhere}
  `) || { total_visits: 0, confirmed_visits: 0, completed_visits: 0, cancelled_visits: 0, no_show_visits: 0 };

  // Follow-ups KPIs
  let folWhere = `WHERE ${orgWhere('f')} AND ${effectiveAssocClause('f')}`;
  if (followup_status) folWhere += ` AND f.status = '${followup_status}'`;
  if (dateRange.from && dateRange.to) {
    folWhere += ` AND f.follow_up_date >= '${dateRange.from}' AND f.follow_up_date <= '${dateRange.to}'`;
  }

  const folSummary = db.get(`
    SELECT
      SUM(CASE WHEN f.status IN ('pending', 'overdue') THEN 1 ELSE 0 END) as pending_followups,
      SUM(CASE WHEN f.status = 'completed' THEN 1 ELSE 0 END) as completed_followups
    FROM followups f
    ${folWhere}
  `) || { pending_followups: 0, completed_followups: 0 };

  // Team counts (Sales Heads and Associates)
  let userCountWhere = `WHERE ${orgWhere('u')}`;
  const userCounts = db.get(`
    SELECT
      SUM(CASE WHEN u.role = 'sales_head' AND u.status = 'active' THEN 1 ELSE 0 END) as total_sales_heads,
      SUM(CASE WHEN u.role = 'sales_associate' AND u.status = 'active' THEN 1 ELSE 0 END) as total_sales_associates,
      SUM(CASE WHEN u.role = 'admin' AND u.status = 'active' THEN 1 ELSE 0 END) as total_admins
    FROM users u
    ${userCountWhere}
  `) || { total_sales_heads: 0, total_sales_associates: 0, total_admins: 0 };

  const totalOrgs = isGlobalSuperAdmin ? (db.get('SELECT COUNT(*) as c FROM organizations').c || 1) : 1;

  // Conversion calculations
  const totalInvs = invSummary.total_created || 0;
  const totalSent = invSummary.total_sent || 0;
  const confirmedVisits = visitSummary.confirmed_visits || 0;
  const completedVisits = visitSummary.completed_visits || 0;
  const cancelledVisits = visitSummary.cancelled_visits || 0;
  const noShowVisits = visitSummary.no_show_visits || 0;
  const totalBookings = custSummary.total_bookings || 0;

  const validVisits = (visitSummary.total_visits || 0) - cancelledVisits;
  const confirmationRate = totalInvs > 0 ? Number(((confirmedVisits / totalInvs) * 100).toFixed(1)) : 0;
  const completionRate = validVisits > 0 ? Number(((completedVisits / validVisits) * 100).toFixed(1)) : 0;
  const overallConversionRate = totalInvs > 0 ? Number(((completedVisits / totalInvs) * 100).toFixed(1)) : (validVisits > 0 ? Number(((completedVisits / validVisits) * 100).toFixed(1)) : 0);

  const kpis = {
    totalOrganizations: totalOrgs,
    totalAdmins: userCounts.total_admins || 0,
    totalSalesHeads: userCounts.total_sales_heads || 0,
    totalSalesAssociates: userCounts.total_sales_associates || 0,
    totalCustomers: custSummary.total_customers || 0,
    totalInvitationsCreated: totalInvs,
    totalInvitationsSent: totalSent,
    totalConfirmedVisits: confirmedVisits,
    totalCompletedVisits: completedVisits,
    totalCancelledVisits: cancelledVisits,
    totalNoShowVisits: noShowVisits,
    pendingFollowups: folSummary.pending_followups || 0,
    completedFollowups: folSummary.completed_followups || 0,
    totalBookings,
    confirmationRate,
    completionRate,
    overallConversionRate
  };

  // 2. Trend Timeline (Grouped by scheduled_date or created_at)
  const trendsSql = `
    SELECT
      sv.scheduled_date as date,
      COUNT(DISTINCT sv.id) as visits_total,
      SUM(CASE WHEN sv.status IN ('confirmed', 'completed', 'arrived', 'checked_in') THEN 1 ELSE 0 END) as visits_confirmed,
      SUM(CASE WHEN sv.status = 'completed' THEN 1 ELSE 0 END) as visits_completed
    FROM site_visits sv
    ${visitWhere}
    GROUP BY sv.scheduled_date
    ORDER BY sv.scheduled_date ASC
    LIMIT 30
  `;
  const visitTrends = db.all(trendsSql) || [];

  // 3. Status Distributions for Charts
  const visitDistSql = `
    SELECT sv.status as label, COUNT(*) as count
    FROM site_visits sv
    ${visitWhere}
    GROUP BY sv.status
  `;
  const visitDistributions = db.all(visitDistSql) || [];

  const invDistSql = `
    SELECT i.status as label, COUNT(*) as count
    FROM invitations i
    ${invWhere}
    GROUP BY i.status
  `;
  const invDistributions = db.all(invDistSql) || [];

  const folDistSql = `
    SELECT f.status as label, COUNT(*) as count
    FROM followups f
    ${folWhere}
    GROUP BY f.status
  `;
  const folDistributions = db.all(folDistSql) || [];

  // 4. Project Performance Breakdown
  const projectPerfSql = `
    SELECT
      p.id as project_id,
      p.name as project_name,
      d.name as developer_name,
      (SELECT COUNT(*) FROM invitations i WHERE i.project_id = p.id AND ${orgWhere('i')} AND ${effectiveAssocClause('i')}) as invitations_count,
      (SELECT COUNT(*) FROM site_visits sv WHERE sv.project_id = p.id AND sv.status IN ('confirmed', 'completed', 'arrived') AND ${orgWhere('sv')} AND ${effectiveAssocClause('sv')}) as confirmed_visits,
      (SELECT COUNT(*) FROM site_visits sv WHERE sv.project_id = p.id AND sv.status = 'completed' AND ${orgWhere('sv')} AND ${effectiveAssocClause('sv')}) as completed_visits,
      (SELECT COUNT(*) FROM customers c WHERE c.interested_project_id = p.id AND c.status = 'booked' AND ${orgWhere('c')}) as bookings_closed
    FROM projects p
    LEFT JOIN developers d ON p.developer_id = d.id
    WHERE ${orgWhere('p')}
    ORDER BY completed_visits DESC, confirmed_visits DESC
    LIMIT 20
  `;
  const rawProjectPerf = db.all(projectPerfSql) || [];
  const projectPerformance = rawProjectPerf.map(r => ({
    ...r,
    conversion_rate: r.invitations_count > 0 ? Number(((r.completed_visits / r.invitations_count) * 100).toFixed(1)) : 0
  }));

  // 5. Sales Head Reports Table
  let salesHeadReports = [];
  if (user.role === 'admin' || user.role === 'super_admin') {
    let shSql = `
      SELECT
        sh.id as head_id,
        sh.name as head_name,
        sh.email,
        sh.phone,
        (SELECT COUNT(*) FROM users u WHERE u.sales_head_id = sh.id AND u.status = 'active') as associates_count,
        (SELECT COUNT(*) FROM customers c WHERE (c.assigned_sales_head_id = sh.id OR c.assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND ${orgWhere('c')}) as customers_count,
        (SELECT COUNT(*) FROM invitations i WHERE (i.sales_head_id = sh.id OR i.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND ${orgWhere('i')}) as invitations_created,
        (SELECT COUNT(*) FROM invitations i WHERE (i.sales_head_id = sh.id OR i.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND i.status IN ('sent', 'viewed', 'scheduled', 'confirmed', 'completed') AND ${orgWhere('i')}) as invitations_sent,
        (SELECT COUNT(*) FROM site_visits sv WHERE (sv.sales_head_id = sh.id OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND sv.status IN ('confirmed', 'arrived', 'completed') AND ${orgWhere('sv')}) as confirmed_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE (sv.sales_head_id = sh.id OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND sv.status = 'completed' AND ${orgWhere('sv')}) as completed_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE (sv.sales_head_id = sh.id OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND sv.status = 'cancelled' AND ${orgWhere('sv')}) as cancelled_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE (sv.sales_head_id = sh.id OR sv.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND sv.status = 'no_show' AND ${orgWhere('sv')}) as no_show_visits,
        (SELECT COUNT(*) FROM followups f WHERE (f.sales_head_id = sh.id OR f.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND f.status IN ('pending', 'overdue') AND ${orgWhere('f')}) as pending_followups,
        (SELECT COUNT(*) FROM followups f WHERE (f.sales_head_id = sh.id OR f.associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND f.status = 'completed' AND ${orgWhere('f')}) as completed_followups,
        (SELECT COUNT(*) FROM customers c WHERE (c.assigned_sales_head_id = sh.id OR c.assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = sh.id)) AND c.status = 'booked' AND ${orgWhere('c')}) as bookings
      FROM users sh
      WHERE ${orgWhere('sh')} AND sh.role = 'sales_head' AND sh.status = 'active'
    `;
    if (headIdsList.length > 0) {
      const quoted = headIdsList.map(h => `'${h}'`).join(',');
      shSql += ` AND sh.id IN (${quoted})`;
    }
    shSql += ` ORDER BY completed_visits DESC, customers_count DESC`;
    const rawHeads = db.all(shSql) || [];
    salesHeadReports = rawHeads.map(h => ({
      ...h,
      conversion_rate: h.invitations_created > 0 ? Number(((h.completed_visits / h.invitations_created) * 100).toFixed(1)) : 0
    }));
  }

  // 6. Sales Associate Reports Table
  let salesAssociateReports = [];
  if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'sales_head') {
    let saSql = `
      SELECT
        sa.id as associate_id,
        sa.name as associate_name,
        sa.email,
        sa.phone,
        sh.name as reporting_sales_head,
        (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = sa.id AND ${orgWhere('c')}) as customers_count,
        (SELECT COUNT(*) FROM invitations i WHERE i.associate_id = sa.id AND ${orgWhere('i')}) as invitations_created,
        (SELECT COUNT(*) FROM invitations i WHERE i.associate_id = sa.id AND i.status IN ('sent', 'viewed', 'scheduled', 'confirmed', 'completed') AND ${orgWhere('i')}) as invitations_sent,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = sa.id AND sv.status IN ('confirmed', 'arrived', 'completed') AND ${orgWhere('sv')}) as confirmed_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = sa.id AND sv.status = 'completed' AND ${orgWhere('sv')}) as completed_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = sa.id AND sv.status = 'cancelled' AND ${orgWhere('sv')}) as cancelled_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = sa.id AND sv.status = 'no_show' AND ${orgWhere('sv')}) as no_show_visits,
        (SELECT COUNT(*) FROM followups f WHERE f.associate_id = sa.id AND f.status IN ('pending', 'overdue') AND ${orgWhere('f')}) as pending_followups,
        (SELECT COUNT(*) FROM followups f WHERE f.associate_id = sa.id AND f.status = 'completed' AND ${orgWhere('f')}) as completed_followups,
        (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = sa.id AND c.status = 'booked' AND ${orgWhere('c')}) as bookings
      FROM users sa
      LEFT JOIN users sh ON sa.sales_head_id = sh.id
      WHERE ${orgWhere('sa')} AND sa.role = 'sales_associate' AND sa.status = 'active'
    `;
    if (user.role === 'sales_head') {
      saSql += ` AND sa.sales_head_id = '${user.id}'`;
    } else {
      if (headIdsList.length > 0) {
        const quoted = headIdsList.map(h => `'${h}'`).join(',');
        saSql += ` AND sa.sales_head_id IN (${quoted})`;
      }
      if (assocIdsList.length > 0) {
        const quoted = assocIdsList.map(a => `'${a}'`).join(',');
        saSql += ` AND sa.id IN (${quoted})`;
      }
    }
    saSql += ` ORDER BY completed_visits DESC, customers_count DESC`;
    const rawAssocs = db.all(saSql) || [];
    salesAssociateReports = rawAssocs.map(a => ({
      ...a,
      conversion_rate: a.invitations_created > 0 ? Number(((a.completed_visits / a.invitations_created) * 100).toFixed(1)) : 0
    }));
  }

  // 7. Organization-wise comparison (for Super Admin)
  let orgPerformance = [];
  if (user.role === 'super_admin') {
    const orgSql = `
      SELECT
        o.id,
        o.name,
        o.slug,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'admin') as admins_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'sales_head') as heads_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'sales_associate') as associates_count,
        (SELECT COUNT(*) FROM customers c WHERE c.organization_id = o.id) as customers_count,
        (SELECT COUNT(*) FROM invitations i WHERE i.organization_id = o.id) as invitations_count,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.organization_id = o.id AND sv.status = 'completed') as completed_visits
      FROM organizations o
      ORDER BY customers_count DESC, invitations_count DESC
    `;
    orgPerformance = db.all(orgSql) || [];
  }

  // 8. Filter options available for the current role
  let filterOptions = {
    organizations: [],
    salesHeads: [],
    salesAssociates: [],
    developers: [],
    projects: []
  };

  if (user.role === 'super_admin') {
    filterOptions.organizations = db.all('SELECT id, name FROM organizations ORDER BY name ASC') || [];
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    filterOptions.salesHeads = db.all(`SELECT id, name FROM users WHERE ${orgWhere('users')} AND role = 'sales_head' AND status = 'active' ORDER BY name ASC`) || [];
  }

  if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'sales_head') {
    let assocSql = `SELECT id, name, sales_head_id FROM users WHERE ${orgWhere('users')} AND role = 'sales_associate' AND status = 'active'`;
    if (user.role === 'sales_head') {
      assocSql += ` AND sales_head_id = '${user.id}'`;
    }
    assocSql += ` ORDER BY name ASC`;
    filterOptions.salesAssociates = db.all(assocSql) || [];
  }

  filterOptions.developers = db.all(`SELECT id, name FROM developers WHERE ${orgWhere('developers')} ORDER BY name ASC`) || [];
  filterOptions.projects = db.all(`SELECT id, name, developer_id FROM projects WHERE ${orgWhere('projects')} ORDER BY name ASC`) || [];

  return {
    kpis,
    trends: visitTrends,
    distributions: {
      visit_status: visitDistributions,
      invitation_status: invDistributions,
      followup_status: folDistributions
    },
    projectPerformance,
    salesHeadReports,
    salesAssociateReports,
    orgPerformance,
    filterOptions,
    dateRange
  };
}

// GET /api/reports/analytics - Main unified analytics endpoint
router.get('/analytics', (req, res) => {
  try {
    const ctx = buildReportContext(req.user, req.query);
    const data = fetchAggregatedReportData(ctx);
    return res.json({
      success: true,
      role: req.user.role,
      ...data
    });
  } catch (err) {
    console.error('Reports Analytics Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/sales-head/:id/team-details - Drill down for Sales Head
router.get('/sales-head/:id/team-details', (req, res) => {
  try {
    const user = req.user;
    const headId = req.params.id;

    if (user.role === 'sales_associate') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (user.role === 'sales_head' && user.id !== headId) {
      return res.status(403).json({ error: 'Cannot access another Sales Head details' });
    }

    const head = db.get(`SELECT id, name, email, phone, organization_id FROM users WHERE id = ? AND role = 'sales_head'`, [headId]);
    if (!head) return res.status(404).json({ error: 'Sales Head not found' });

    const associates = db.all(`
      SELECT
        u.id, u.name, u.email, u.phone,
        (SELECT COUNT(*) FROM customers c WHERE c.assigned_associate_id = u.id) as customers_count,
        (SELECT COUNT(*) FROM invitations i WHERE i.associate_id = u.id) as invitations_count,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'confirmed') as confirmed_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'completed') as completed_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'cancelled') as cancelled_visits,
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.associate_id = u.id AND sv.status = 'no_show') as no_show_visits,
        (SELECT COUNT(*) FROM followups f WHERE f.associate_id = u.id AND f.status = 'pending') as pending_followups
      FROM users u
      WHERE u.sales_head_id = ? AND u.status = 'active'
      ORDER BY completed_visits DESC
    `, [headId]);

    return res.json({ success: true, head, associates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/export/excel - Excel export with summary and details
router.get('/export/excel', async (req, res) => {
  try {
    const ctx = buildReportContext(req.user, req.query);
    const data = fetchAggregatedReportData(ctx);

    const tables = [];
    if (data.salesHeadReports && data.salesHeadReports.length) {
      tables.push({
        name: 'Sales Heads',
        rows: data.salesHeadReports.map(h => ({
          'Sales Head': h.head_name,
          'Email': h.email,
          'Phone': h.phone,
          'Associates': h.associates_count,
          'Customers': h.customers_count,
          'Invitations Created': h.invitations_created,
          'Invitations Sent': h.invitations_sent,
          'Confirmed Visits': h.confirmed_visits,
          'Completed Visits': h.completed_visits,
          'Cancelled Visits': h.cancelled_visits,
          'No Shows': h.no_show_visits,
          'Pending Follow-ups': h.pending_followups,
          'Completed Follow-ups': h.completed_followups,
          'Conversion Rate (%)': `${h.conversion_rate}%`
        }))
      });
    }

    if (data.salesAssociateReports && data.salesAssociateReports.length) {
      tables.push({
        name: 'Sales Associates',
        rows: data.salesAssociateReports.map(a => ({
          'Associate Name': a.associate_name,
          'Reporting Head': a.reporting_sales_head || 'Direct',
          'Email': a.email,
          'Phone': a.phone,
          'Customers': a.customers_count,
          'Invitations Created': a.invitations_created,
          'Invitations Sent': a.invitations_sent,
          'Confirmed Visits': a.confirmed_visits,
          'Completed Visits': a.completed_visits,
          'Cancelled Visits': a.cancelled_visits,
          'No Shows': a.no_show_visits,
          'Pending Follow-ups': a.pending_followups,
          'Completed Follow-ups': a.completed_followups,
          'Conversion Rate (%)': `${a.conversion_rate}%`
        }))
      });
    }

    if (data.projectPerformance && data.projectPerformance.length) {
      tables.push({
        name: 'Project Performance',
        rows: data.projectPerformance.map(p => ({
          'Project': p.project_name,
          'Developer': p.developer_name || '-',
          'Invitations': p.invitations_count,
          'Confirmed Visits': p.confirmed_visits,
          'Completed Visits': p.completed_visits,
          'Bookings': p.bookings_closed,
          'Conversion Rate (%)': `${p.conversion_rate}%`
        }))
      });
    }

    const excelBuffer = generateExcelReport({
      title: 'Visit Studio Performance Report',
      subtitle: `Role: ${req.user.role.toUpperCase()} | User: ${req.user.name}`,
      dateRange: data.dateRange.label,
      filters: {
        'Sales Heads Filter': ctx.headIdsList.length ? `${ctx.headIdsList.length} Selected` : 'All',
        'Associates Filter': ctx.assocIdsList.length ? `${ctx.assocIdsList.length} Selected` : 'All',
        'Developer': ctx.developer_id || 'All',
        'Project': ctx.project_id || 'All'
      },
      kpis: data.kpis,
      tables
    });

    const filename = `visit_studio_report_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(excelBuffer);
  } catch (err) {
    console.error('Excel Export Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/export/csv - CSV export
router.get('/export/csv', (req, res) => {
  try {
    const ctx = buildReportContext(req.user, req.query);
    const data = fetchAggregatedReportData(ctx);

    let rows = [];
    if (data.salesAssociateReports && data.salesAssociateReports.length) {
      rows = data.salesAssociateReports.map(a => ({
        'Associate Name': a.associate_name,
        'Reporting Head': a.reporting_sales_head || 'Direct',
        'Email': a.email,
        'Phone': a.phone,
        'Customers': a.customers_count,
        'Invitations Created': a.invitations_created,
        'Invitations Sent': a.invitations_sent,
        'Confirmed Visits': a.confirmed_visits,
        'Completed Visits': a.completed_visits,
        'Cancelled Visits': a.cancelled_visits,
        'No Shows': a.no_show_visits,
        'Pending Follow-ups': a.pending_followups,
        'Completed Follow-ups': a.completed_followups,
        'Conversion Rate': `${a.conversion_rate}%`
      }));
    } else if (data.projectPerformance && data.projectPerformance.length) {
      rows = data.projectPerformance.map(p => ({
        'Project Name': p.project_name,
        'Developer': p.developer_name || '-',
        'Invitations': p.invitations_count,
        'Confirmed Visits': p.confirmed_visits,
        'Completed Visits': p.completed_visits,
        'Bookings': p.bookings_closed,
        'Conversion Rate': `${p.conversion_rate}%`
      }));
    }

    const csvContent = generateCSVReport({
      title: 'Visit Studio Performance Report',
      dateRange: data.dateRange.label,
      filters: {
        'Role': req.user.role,
        'Sales Heads Filter': ctx.headIdsList.length ? `${ctx.headIdsList.length} Selected` : 'All',
        'Associates Filter': ctx.assocIdsList.length ? `${ctx.assocIdsList.length} Selected` : 'All'
      },
      kpis: data.kpis,
      rows
    });

    const filename = `visit_studio_report_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('CSV Export Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/export/pdf - Clean styled PDF export
router.get('/export/pdf', async (req, res) => {
  try {
    const ctx = buildReportContext(req.user, req.query);
    const data = fetchAggregatedReportData(ctx);

    const tables = [];
    if (data.salesHeadReports && data.salesHeadReports.length) {
      tables.push({
        name: 'Sales Heads Performance',
        rows: data.salesHeadReports.slice(0, 15).map(h => ({
          'Name': h.head_name,
          'Team': h.associates_count,
          'Cust': h.customers_count,
          'Invites': h.invitations_created,
          'Confirmed': h.confirmed_visits,
          'Completed': h.completed_visits,
          'Conv %': `${h.conversion_rate}%`
        }))
      });
    }

    if (data.salesAssociateReports && data.salesAssociateReports.length) {
      tables.push({
        name: 'Sales Associates Performance',
        rows: data.salesAssociateReports.slice(0, 20).map(a => ({
          'Associate': a.associate_name,
          'Head': (a.reporting_sales_head || '-').split(' ')[0],
          'Cust': a.customers_count,
          'Invites': a.invitations_created,
          'Confirmed': a.confirmed_visits,
          'Completed': a.completed_visits,
          'Conv %': `${a.conversion_rate}%`
        }))
      });
    }

    const pdfBuffer = await generatePDFReport({
      title: 'Visit Studio Performance & Analytics Report',
      subtitle: `Role: ${req.user.role.toUpperCase()}  |  User: ${req.user.name}`,
      dateRange: data.dateRange.label,
      filters: {
        'Scope': req.user.role,
        'Date Preset': ctx.dateRange.label
      },
      kpis: {
        'Customers': data.kpis.totalCustomers,
        'Invitations': data.kpis.totalInvitationsCreated,
        'Confirmed': data.kpis.totalConfirmedVisits,
        'Completed': data.kpis.totalCompletedVisits,
        'Follow-ups': data.kpis.pendingFollowups,
        'Conversion': `${data.kpis.overallConversionRate}%`
      },
      tables
    });

    const filename = `visit_studio_report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Export Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Legacy backward-compatibility routes
router.get('/dashboard', (req, res) => {
  const ctx = buildReportContext(req.user, req.query);
  const data = fetchAggregatedReportData(ctx);
  return res.json({
    metrics: {
      totalCustomers: data.kpis.totalCustomers,
      totalInvitations: data.kpis.totalInvitationsCreated,
      totalVisits: (data.kpis.totalConfirmedVisits + data.kpis.totalCompletedVisits + data.kpis.totalCancelledVisits + data.kpis.totalNoShowVisits),
      confirmedVisits: data.kpis.totalConfirmedVisits,
      completedVisits: data.kpis.totalCompletedVisits,
      cancelledVisits: data.kpis.totalCancelledVisits,
      noShowVisits: data.kpis.totalNoShowVisits,
      pendingFollowups: data.kpis.pendingFollowups,
      totalBookings: data.kpis.totalBookings,
      confirmationRate: data.kpis.confirmationRate,
      completionRate: data.kpis.completionRate,
      bookingConversionRate: data.kpis.overallConversionRate
    },
    upcomingVisits: [],
    associatePerformance: data.salesAssociateReports
  });
});

router.get('/export/performance', (req, res) => {
  res.redirect('/api/reports/export/csv');
});

// ==========================================
// LEAD MANAGEMENT REAL-TIME REPORT ENDPOINTS
// ==========================================

// GET /api/reports/overview - Complete Lead KPIs, trends, distributions & leaderboards
router.get('/overview', (req, res) => {
  try {
    const data = getLeadOverviewReport(req.user, req.query);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/leads - Lead trend & stage breakdown
router.get('/leads', (req, res) => {
  try {
    const data = getLeadOverviewReport(req.user, req.query);
    return res.json({
      dateRange: data.dateRange,
      granularity: data.granularity,
      kpis: data.kpis,
      kpiDefinitions: data.kpiDefinitions,
      trends: data.trends,
      stageDistribution: data.stageDistribution,
      budgetDistribution: data.budgetDistribution,
      configurationDistribution: data.configurationDistribution,
      timelineDistribution: data.timelineDistribution,
      lostReasons: data.lostReasons
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/sources
router.get('/sources', (req, res) => {
  try {
    const data = getLeadOverviewReport(req.user, req.query);
    return res.json({ dateRange: data.dateRange, sources: data.sourcePerformance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/projects
router.get('/projects', (req, res) => {
  try {
    const data = getLeadOverviewReport(req.user, req.query);
    return res.json({ dateRange: data.dateRange, projects: data.projectPerformance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/associates
router.get('/associates', (req, res) => {
  try {
    const data = getLeadOverviewReport(req.user, req.query);
    return res.json({ dateRange: data.dateRange, associates: data.associatePerformance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/sales-heads
router.get('/sales-heads', (req, res) => {
  try {
    const data = getLeadOverviewReport(req.user, req.query);
    return res.json({ dateRange: data.dateRange, salesHeads: data.salesHeadPerformance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/lead-export - Authorized Excel / CSV / PDF export for Lead Reports
router.get('/lead-export', async (req, res) => {
  try {
    const format = String(req.query.format || 'excel').toLowerCase();
    const data = getLeadOverviewReport(req.user, req.query);

    const projectRows = (data.projectPerformance || []).map(p => ({
      'Project': p.project_name,
      'Developer': p.developer_name || '—',
      'Total Leads': p.total_leads,
      'Interested': p.interested_leads,
      'Visits Scheduled': p.visits_scheduled,
      'Visits Completed': p.visits_completed,
      'Booked': p.booked_leads,
      'Lost': p.lost_leads,
      'Conversion %': `${p.conversion_rate}%`
    }));

    const sourceRows = (data.sourcePerformance || []).map(s => ({
      'Lead Source': s.source,
      'Total Leads': s.total_leads,
      'Visits Completed': s.visits_completed,
      'Booked': s.booked_leads,
      'Lost': s.lost_leads,
      'Conversion %': `${s.conversion_rate}%`
    }));

    const associateRows = (data.associatePerformance || []).map(a => ({
      'Associate': a.associate_name,
      'Sales Head': a.sales_head_name,
      'Total Leads': a.total_leads,
      'Visits Scheduled': a.visits_scheduled,
      'Visits Completed': a.visits_completed,
      'Booked': a.booked_leads,
      'Lost': a.lost_leads,
      'Conversion %': `${a.conversion_rate}%`
    }));

    const tables = [];
    if (projectRows.length) tables.push({ name: 'Project Performance', rows: projectRows });
    if (sourceRows.length) tables.push({ name: 'Source Performance', rows: sourceRows });
    if (associateRows.length) tables.push({ name: 'Associate Performance', rows: associateRows });

    if (format === 'csv') {
      const csv = generateCSVReport({
        title: 'Visit Studio Lead Management Report',
        dateRange: data.dateRange.label,
        kpis: data.kpis,
        tables
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="lead_report_${Date.now()}.csv"`);
      return res.send(csv);
    }

    if (format === 'pdf') {
      const pdf = await generatePDFReport({
        title: 'Visit Studio Lead Management Report',
        subtitle: `Role: ${req.user.role.toUpperCase()} | User: ${req.user.name}`,
        dateRange: data.dateRange.label,
        filters: { Scope: req.user.role, Period: data.dateRange.label },
        kpis: {
          'Total Leads': data.kpis.totalLeads,
          'New': data.kpis.newLeads,
          'Visited': data.kpis.siteVisitsCompleted,
          'Booked': data.kpis.bookedLeads,
          'Lost': data.kpis.lostLeads,
          'Conversion': `${data.kpis.conversionRate}%`
        },
        tables
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="lead_report_${Date.now()}.pdf"`);
      return res.send(pdf);
    }

    const xlsxBuf = generateExcelReport({
      title: 'Visit Studio Lead Management Report',
      subtitle: `Role: ${req.user.role.toUpperCase()} | User: ${req.user.name}`,
      dateRange: data.dateRange.label,
      filters: { Scope: req.user.role, Period: data.dateRange.label },
      kpis: data.kpis,
      tables
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="lead_report_${Date.now()}.xlsx"`);
    return res.send(xlsxBuf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
