const db = require('../db');
const { sanitizeIdList, sanitizeText } = require('../validators/leadValidators');

/**
 * KPI Definitions (documented for API & UI consistency):
 * - totalLeads: Count of leads matching active scope & filters (date filter uses l.submitted_at).
 * - newLeads / contactedLeads / interestedLeads / bookedLeads / lostLeads: Count of leads in each stage.
 * - siteVisitsScheduled / siteVisitsCompleted: Count of site_visits linked to scoped leads or matching scoped filters (by stage or site_visit status).
 * - pendingFollowups / overdueFollowups: Count of followups in scope with status='pending' (overdue when follow_up_date < current date in org timezone).
 * - conversionRate: (bookedLeads / totalLeads) * 100 when totalLeads > 0, else 0.
 */

function resolveDateRange(preset, dateFrom, dateTo) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0, 10);

  if (preset === 'today') {
    const d = fmt(now);
    return { from: d, to: d, label: 'Today' };
  }
  if (preset === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const s = fmt(d);
    return { from: s, to: s, label: 'Yesterday' };
  }
  if (preset === 'last_7_days') {
    const p = new Date(now);
    p.setDate(p.getDate() - 6);
    return { from: fmt(p), to: fmt(now), label: 'Last 7 Days' };
  }
  if (preset === 'last_30_days') {
    const p = new Date(now);
    p.setDate(p.getDate() - 29);
    return { from: fmt(p), to: fmt(now), label: 'Last 30 Days' };
  }
  if (preset === 'this_month') {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      label: 'This Month'
    };
  }
  if (preset === 'last_month') {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
      label: 'Last Month'
    };
  }
  if (dateFrom || dateTo) {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(dateFrom || '') ? dateFrom : '1970-01-01';
    const t = /^\d{4}-\d{2}-\d{2}$/.test(dateTo || '') ? dateTo : '2099-12-31';
    return { from: f, to: t, label: `${f} to ${t}` };
  }
  return { from: null, to: null, label: 'All Time' };
}

function buildLeadWhereClause(user, query = {}, tableAlias = 'l') {
  const p = tableAlias ? `${tableAlias}.` : '';
  const clauses = ['1=1'];
  const params = [];

  // Mandatory server-side RBAC isolation
  if (user.role === 'super_admin') {
    if (query.organization_id && query.organization_id !== 'all') {
      clauses.push(`${p}organization_id = ?`);
      params.push(sanitizeText(query.organization_id, 64));
    }
  } else if (user.role === 'admin') {
    clauses.push(`${p}organization_id = ?`);
    params.push(user.organization_id);
  } else if (user.role === 'sales_head') {
    clauses.push(`${p}organization_id = ?`);
    params.push(user.organization_id);
    if (query.scope === 'my_performance') {
      clauses.push(`(${p}assigned_associate_id = ? OR ${p}assigned_sales_head_id = ?)`);
      params.push(user.id, user.id);
    } else {
      clauses.push(`(${p}assigned_sales_head_id = ? OR ${p}original_sales_head_id = ? OR ${p}assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))`);
      params.push(user.id, user.id, user.id);
    }
  } else if (user.role === 'sales_associate') {
    clauses.push(`${p}organization_id = ? AND ${p}assigned_associate_id = ?`);
    params.push(user.organization_id, user.id);
  } else {
    clauses.push('1=0');
  }

  // Admin/Super Admin can select Associate without selecting Sales Head first
  const headIds = sanitizeIdList(query.sales_head_ids || query.sales_head_id || query.team_ids || query.team_id);
  if (headIds.length > 0 && user.role !== 'sales_associate') {
    const ph = headIds.map(() => '?').join(',');
    clauses.push(`(${p}assigned_sales_head_id IN (${ph}) OR ${p}assigned_associate_id IN (SELECT id FROM users WHERE sales_head_id IN (${ph})))`);
    params.push(...headIds, ...headIds);
  }

  const assocIds = sanitizeIdList(query.associate_ids || query.associate_id);
  if (assocIds.length > 0 && user.role !== 'sales_associate') {
    const ph = assocIds.map(() => '?').join(',');
    clauses.push(`${p}assigned_associate_id IN (${ph})`);
    params.push(...assocIds);
  }

  if (query.project_id) {
    clauses.push(`${p}project_id = ?`);
    params.push(sanitizeText(query.project_id, 64));
  }

  if (query.developer_id) {
    clauses.push(`${p}project_id IN (SELECT id FROM projects WHERE developer_id = ?)`);
    params.push(sanitizeText(query.developer_id, 64));
  }

  if (query.source) {
    clauses.push(`${p}enquiry_source = ?`);
    params.push(sanitizeText(query.source, 120));
  }

  if (query.campaign_id) {
    clauses.push(`${p}campaign_id = ?`);
    params.push(sanitizeText(query.campaign_id, 64));
  }

  if (query.stage) {
    clauses.push(`${p}stage = ?`);
    params.push(sanitizeText(query.stage, 40));
  }

  if (query.duplicate_status) {
    clauses.push(`${p}duplicate_status = ?`);
    params.push(sanitizeText(query.duplicate_status, 64));
  }

  if (query.visit_status) {
    clauses.push(`${p}site_visit_id IN (SELECT id FROM site_visits WHERE status = ?)`);
    params.push(sanitizeText(query.visit_status, 40));
  }

  if (query.followup_status) {
    if (query.followup_status === 'overdue') {
      clauses.push(`${p}customer_id IN (SELECT customer_id FROM followups WHERE status = 'pending' AND follow_up_date < date('now'))`);
    } else {
      clauses.push(`${p}customer_id IN (SELECT customer_id FROM followups WHERE status = ?)`);
      params.push(sanitizeText(query.followup_status, 40));
    }
  }

  const dateRange = resolveDateRange(query.date_preset, query.date_from, query.date_to);
  if (dateRange.from && dateRange.to) {
    clauses.push(`${p}submitted_at >= ? AND ${p}submitted_at <= ?`);
    params.push(`${dateRange.from} 00:00:00`, `${dateRange.to} 23:59:59`);
  }

  if (query.search && String(query.search).trim()) {
    const term = `%${String(query.search).trim()}%`;
    clauses.push(`(${p}enquiry_ref LIKE ? OR c.full_name LIKE ? OR c.mobile_number LIKE ? OR COALESCE(p.name, '') LIKE ?)`);
    params.push(term, term, term, term);
  }

  return { whereSql: clauses.join(' AND '), params, dateRange };
}

function getLeadOverviewReport(user, query = {}) {
  const { whereSql, params, dateRange } = buildLeadWhereClause(user, query, 'l');

  const kpiRow = db.get(
    `SELECT
       COUNT(*) as total_leads,
       SUM(CASE WHEN l.stage = 'new_lead' THEN 1 ELSE 0 END) as new_leads,
       SUM(CASE WHEN l.stage = 'contacted' THEN 1 ELSE 0 END) as contacted_leads,
       SUM(CASE WHEN l.stage = 'interested' THEN 1 ELSE 0 END) as interested_leads,
       SUM(CASE WHEN l.stage = 'site_visit_scheduled' OR sv.id IS NOT NULL THEN 1 ELSE 0 END) as site_visits_scheduled,
       SUM(CASE WHEN l.stage = 'site_visit_completed' OR sv.status = 'completed' THEN 1 ELSE 0 END) as site_visits_completed,
       SUM(CASE WHEN l.stage = 'negotiation' THEN 1 ELSE 0 END) as negotiation_leads,
       SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
       SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads,
       SUM(CASE WHEN l.duplicate_status IN ('duplicate_flagged', 'existing_customer_new_project') THEN 1 ELSE 0 END) as duplicate_enquiries
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
     WHERE ${whereSql}`,
    params
  ) || {};

  // Follow-up KPIs strictly scoped to user & filters
  const folClauses = ['1=1'];
  const folParams = [];
  if (user.role === 'super_admin') {
    if (query.organization_id && query.organization_id !== 'all') {
      folClauses.push('f.organization_id = ?');
      folParams.push(query.organization_id);
    }
  } else if (user.role === 'admin') {
    folClauses.push('f.organization_id = ?');
    folParams.push(user.organization_id);
  } else if (user.role === 'sales_head') {
    folClauses.push('f.organization_id = ? AND (f.sales_head_id = ? OR f.associate_id IN (SELECT id FROM users WHERE sales_head_id = ?))');
    folParams.push(user.organization_id, user.id, user.id);
  } else if (user.role === 'sales_associate') {
    folClauses.push('f.organization_id = ? AND f.associate_id = ?');
    folParams.push(user.organization_id, user.id);
  }
  const assocFilter = sanitizeIdList(query.associate_ids || query.associate_id);
  if (assocFilter.length && user.role !== 'sales_associate') {
    folClauses.push(`f.associate_id IN (${assocFilter.map(() => '?').join(',')})`);
    folParams.push(...assocFilter);
  }
  const headFilter = sanitizeIdList(query.sales_head_ids || query.sales_head_id);
  if (headFilter.length && user.role !== 'sales_associate') {
    const ph = headFilter.map(() => '?').join(',');
    folClauses.push(`(f.sales_head_id IN (${ph}) OR f.associate_id IN (SELECT id FROM users WHERE sales_head_id IN (${ph})))`);
    folParams.push(...headFilter, ...headFilter);
  }
  if (dateRange.from && dateRange.to) {
    folClauses.push('f.follow_up_date >= ? AND f.follow_up_date <= ?');
    folParams.push(dateRange.from, dateRange.to);
  }

  const folStats = db.get(
    `SELECT
       SUM(CASE WHEN f.status = 'pending' THEN 1 ELSE 0 END) as pending_followups,
       SUM(CASE WHEN f.status = 'pending' AND f.follow_up_date < date('now') THEN 1 ELSE 0 END) as overdue_followups,
       SUM(CASE WHEN f.status = 'completed' THEN 1 ELSE 0 END) as completed_followups
     FROM followups f
     WHERE ${folClauses.join(' AND ')}`,
    folParams
  ) || {};

  const totalLeads = Number(kpiRow.total_leads || 0);
  const bookedLeads = Number(kpiRow.booked_leads || 0);
  const conversionRate = totalLeads > 0 ? Number(((bookedLeads / totalLeads) * 100).toFixed(1)) : 0;

  // Trend grouping (daily, weekly, monthly)
  const granularity = query.granularity === 'monthly' ? 'monthly' : (query.granularity === 'weekly' ? 'weekly' : 'daily');
  const periodExpr = granularity === 'monthly'
    ? "strftime('%Y-%m', l.submitted_at)"
    : granularity === 'weekly'
      ? "strftime('%Y-W%W', l.submitted_at)"
      : "date(l.submitted_at)";

  const trends = db.all(
    `SELECT
       ${periodExpr} as period,
       COUNT(*) as total_leads,
       SUM(CASE WHEN l.stage = 'site_visit_scheduled' OR l.site_visit_id IS NOT NULL THEN 1 ELSE 0 END) as visits_scheduled,
       SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
       SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     WHERE ${whereSql}
     GROUP BY ${periodExpr}
     ORDER BY period ASC
     LIMIT 60`,
    params
  );

  const stageDistribution = db.all(
    `SELECT l.stage as label, COUNT(*) as count
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     WHERE ${whereSql}
     GROUP BY l.stage
     ORDER BY count DESC`,
    params
  );

  const sourcePerformance = db.all(
    `SELECT COALESCE(NULLIF(l.enquiry_source, ''), 'Direct') as source,
       COUNT(*) as total_leads,
       SUM(CASE WHEN l.stage = 'site_visit_completed' OR sv.status = 'completed' THEN 1 ELSE 0 END) as visits_completed,
       SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
       SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
     WHERE ${whereSql}
     GROUP BY source
     ORDER BY total_leads DESC`,
    params
  ).map(r => ({
    ...r,
    conversion_rate: r.total_leads > 0 ? Number(((r.booked_leads / r.total_leads) * 100).toFixed(1)) : 0
  }));

  const projectPerformance = db.all(
    `SELECT COALESCE(p.id, 'unassigned') as project_id,
       COALESCE(p.name, 'General Enquiry') as project_name,
       COALESCE(d.name, '') as developer_name,
       COUNT(*) as total_leads,
       SUM(CASE WHEN l.stage = 'interested' THEN 1 ELSE 0 END) as interested_leads,
       SUM(CASE WHEN l.stage = 'site_visit_scheduled' OR l.site_visit_id IS NOT NULL THEN 1 ELSE 0 END) as visits_scheduled,
       SUM(CASE WHEN l.stage = 'site_visit_completed' OR sv.status = 'completed' THEN 1 ELSE 0 END) as visits_completed,
       SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
       SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     LEFT JOIN developers d ON p.developer_id = d.id
     LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
     WHERE ${whereSql}
     GROUP BY COALESCE(p.id, 'unassigned'), COALESCE(p.name, 'General Enquiry'), COALESCE(d.name, '')
     ORDER BY total_leads DESC`,
    params
  ).map(r => ({
    ...r,
    conversion_rate: r.total_leads > 0 ? Number(((r.booked_leads / r.total_leads) * 100).toFixed(1)) : 0
  }));

  const budgetDistribution = db.all(
    `SELECT COALESCE(NULLIF(l.budget, ''), 'Not Specified') as label, COUNT(*) as count
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     WHERE ${whereSql}
     GROUP BY label ORDER BY count DESC`,
    params
  );

  const configurationDistribution = db.all(
    `SELECT COALESCE(NULLIF(l.apartment_size, ''), 'Not Specified') as label, COUNT(*) as count
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     WHERE ${whereSql}
     GROUP BY label ORDER BY count DESC`,
    params
  );

  const timelineDistribution = db.all(
    `SELECT COALESCE(NULLIF(l.purchase_timeline, ''), 'Not Specified') as label, COUNT(*) as count
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     WHERE ${whereSql}
     GROUP BY label ORDER BY count DESC`,
    params
  );

  const lostReasons = db.all(
    `SELECT COALESCE(NULLIF(l.loss_reason, ''), 'Unspecified') as reason, COUNT(*) as count
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     WHERE ${whereSql} AND l.stage = 'lost'
     GROUP BY reason ORDER BY count DESC`,
    params
  );

  const associatePerformance = user.role === 'sales_associate'
    ? []
    : db.all(
      `SELECT COALESCE(u.id, 'unassigned') as associate_id,
           COALESCE(u.name, 'Unassigned Pool') as associate_name,
           COALESCE(sh.name, 'Direct / Admin') as sales_head_name,
           COUNT(*) as total_leads,
           SUM(CASE WHEN l.stage = 'contacted' THEN 1 ELSE 0 END) as contacted_leads,
           SUM(CASE WHEN l.stage = 'interested' THEN 1 ELSE 0 END) as interested_leads,
           SUM(CASE WHEN l.stage = 'site_visit_scheduled' OR l.site_visit_id IS NOT NULL THEN 1 ELSE 0 END) as visits_scheduled,
           SUM(CASE WHEN l.stage = 'site_visit_completed' OR sv.status = 'completed' THEN 1 ELSE 0 END) as visits_completed,
           SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
           SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads
         FROM leads l
         JOIN customers c ON l.customer_id = c.id
         LEFT JOIN projects p ON l.project_id = p.id
         LEFT JOIN users u ON l.assigned_associate_id = u.id
         LEFT JOIN users sh ON COALESCE(l.assigned_sales_head_id, u.sales_head_id) = sh.id
         LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
         WHERE ${whereSql}
         GROUP BY COALESCE(u.id, 'unassigned'), COALESCE(u.name, 'Unassigned Pool'), COALESCE(sh.name, 'Direct / Admin')
         ORDER BY total_leads DESC`,
      params
    ).map(r => ({
      ...r,
      conversion_rate: r.total_leads > 0 ? Number(((r.booked_leads / r.total_leads) * 100).toFixed(1)) : 0
    }));

  const salesHeadPerformance = (user.role === 'admin' || user.role === 'super_admin')
    ? db.all(
      `SELECT COALESCE(sh.id, 'unassigned') as sales_head_id,
           COALESCE(sh.name, 'Direct / Unassigned') as sales_head_name,
           COUNT(*) as total_leads,
           SUM(CASE WHEN l.stage = 'interested' THEN 1 ELSE 0 END) as interested_leads,
           SUM(CASE WHEN l.stage = 'site_visit_scheduled' OR l.site_visit_id IS NOT NULL THEN 1 ELSE 0 END) as visits_scheduled,
           SUM(CASE WHEN l.stage = 'site_visit_completed' OR sv.status = 'completed' THEN 1 ELSE 0 END) as visits_completed,
           SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
           SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads
         FROM leads l
         JOIN customers c ON l.customer_id = c.id
         LEFT JOIN projects p ON l.project_id = p.id
         LEFT JOIN users sh ON l.assigned_sales_head_id = sh.id
         LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
         WHERE ${whereSql}
         GROUP BY COALESCE(sh.id, 'unassigned'), COALESCE(sh.name, 'Direct / Unassigned')
         ORDER BY total_leads DESC`,
      params
    ).map(r => ({
      ...r,
      conversion_rate: r.total_leads > 0 ? Number(((r.booked_leads / r.total_leads) * 100).toFixed(1)) : 0
    }))
    : [];

  const orgComparison = user.role === 'super_admin'
    ? db.all(
      `SELECT o.id as organization_id, o.name as organization_name,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.stage = 'booked_won' THEN 1 ELSE 0 END) as booked_leads,
           SUM(CASE WHEN l.stage = 'lost' THEN 1 ELSE 0 END) as lost_leads,
           SUM(CASE WHEN l.stage = 'site_visit_completed' THEN 1 ELSE 0 END) as visits_completed
         FROM organizations o
         LEFT JOIN leads l ON l.organization_id = o.id
         GROUP BY o.id, o.name
         ORDER BY total_leads DESC`
    ).map(r => ({
      ...r,
      conversion_rate: r.total_leads > 0 ? Number(((r.booked_leads / r.total_leads) * 100).toFixed(1)) : 0
    }))
    : [];

  return {
    dateRange,
    granularity,
    kpiDefinitions: {
      totalLeads: 'Count of leads matching scope & submitted_at date range.',
      conversionRate: '(Booked / Won leads ÷ Total Leads) × 100.',
      overdueFollowups: 'Pending follow-ups with follow_up_date earlier than today.'
    },
    kpis: {
      totalLeads,
      newLeads: Number(kpiRow.new_leads || 0),
      contactedLeads: Number(kpiRow.contacted_leads || 0),
      interestedLeads: Number(kpiRow.interested_leads || 0),
      siteVisitsScheduled: Number(kpiRow.site_visits_scheduled || 0),
      siteVisitsCompleted: Number(kpiRow.site_visits_completed || 0),
      negotiationLeads: Number(kpiRow.negotiation_leads || 0),
      bookedLeads,
      lostLeads: Number(kpiRow.lost_leads || 0),
      duplicateEnquiries: Number(kpiRow.duplicate_enquiries || 0),
      pendingFollowups: Number(folStats.pending_followups || 0),
      overdueFollowups: Number(folStats.overdue_followups || 0),
      completedFollowups: Number(folStats.completed_followups || 0),
      conversionRate
    },
    trends,
    stageDistribution,
    sourcePerformance,
    projectPerformance,
    budgetDistribution,
    configurationDistribution,
    timelineDistribution,
    lostReasons,
    associatePerformance,
    salesHeadPerformance,
    orgComparison
  };
}

module.exports = {
  resolveDateRange,
  buildLeadWhereClause,
  getLeadOverviewReport
};
