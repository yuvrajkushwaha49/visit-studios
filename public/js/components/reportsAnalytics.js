// Comprehensive Reports & Conversion Analytics Component
// Supports Super Admin, Admin, Sales Head, and Sales Associate roles
// Real-time Database queries, Multi-select filtering, Chart.js integrations, and Multi-format Exports

App.reportsState = {
  activeTab: null,
  filters: {
    date_preset: 'last_30_days',
    date_from: '',
    date_to: '',
    sales_head_ids: [],
    associate_ids: [],
    developer_id: '',
    project_id: '',
    invitation_status: '',
    visit_status: '',
    followup_status: '',
    organization_id: ''
  },
  charts: {},
  data: null
};

App.renderReportsAnalytics = async function(container) {
  const user = this.currentUser || this.state?.user || {};
  const role = user.role || 'admin';

  // Set default active tab based on role
  if (!App.reportsState.activeTab) {
    if (role === 'sales_associate') App.reportsState.activeTab = 'personal';
    else if (role === 'sales_head') App.reportsState.activeTab = 'my_performance';
    else if (role === 'super_admin') App.reportsState.activeTab = 'platform_overview';
    else App.reportsState.activeTab = 'overview';
  }

  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px; color: var(--muted);">
      <div class="inv-loader-spinner" style="margin:0 auto 16px;"></div>
      <div style="font-size:14px; font-weight:600; color:var(--ink);">Loading intelligence & performance analytics...</div>
      <div style="font-size:12px; margin-top:4px;">Aggregating real-time records and computing conversion funnels</div>
    </div>
  `;

  await App.fetchAndRenderReports(container);
};

App.fetchAndRenderReports = async function(container) {
  const user = this.currentUser || this.state?.user || {};
  const role = user.role || 'admin';
  const state = App.reportsState;

  // Build query string from filters
  const params = new URLSearchParams();
  params.set('view', state.activeTab);
  params.set('date_preset', state.filters.date_preset);
  if (state.filters.date_from) params.set('date_from', state.filters.date_from);
  if (state.filters.date_to) params.set('date_to', state.filters.date_to);
  if (state.filters.sales_head_ids.length) params.set('sales_head_ids', state.filters.sales_head_ids.join(','));
  if (state.filters.associate_ids.length) params.set('associate_ids', state.filters.associate_ids.join(','));
  if (state.filters.developer_id) params.set('developer_id', state.filters.developer_id);
  if (state.filters.project_id) params.set('project_id', state.filters.project_id);
  if (state.filters.invitation_status) params.set('invitation_status', state.filters.invitation_status);
  if (state.filters.visit_status) params.set('visit_status', state.filters.visit_status);
  if (state.filters.followup_status) params.set('followup_status', state.filters.followup_status);
  if (state.filters.organization_id) params.set('organization_id', state.filters.organization_id);

  try {
    const res = await API.get(`/reports/analytics?${params.toString()}`);
    state.data = res;

    // Destroy any existing charts before recreating DOM
    Object.values(state.charts).forEach(c => {
      try { if (c) c.destroy(); } catch (e) {}
    });
    state.charts = {};

    App.renderReportsUI(container, res);
  } catch (err) {
    container.innerHTML = `
      <div class="panel" style="padding: 30px; text-align:center;">
        <div style="color:var(--red); font-weight:600; font-size:16px; margin-bottom:8px;">Unable to load reports</div>
        <div style="color:var(--muted); font-size:13px; margin-bottom:16px;">${Utils.escapeHTML(err.message)}</div>
        <button class="btn primary" onclick="App.renderReportsAnalytics(document.getElementById('contentContainer'))">Try Again</button>
      </div>
    `;
  }
};

App.renderReportsUI = function(container, data) {
  const user = this.currentUser || this.state?.user || {};
  const role = user.role || 'admin';
  const state = App.reportsState;
  const k = data.kpis || {};
  const filterOpts = data.filterOptions || {};

  // Build Tabs based on Role
  let tabsHtml = '';
  if (role === 'admin') {
    tabsHtml = `
      <div class="reports-nav-tabs">
        <button type="button" class="reports-tab-btn ${state.activeTab === 'overview' ? 'active' : ''}" onclick="App.switchReportTab('overview')">
          <span>📊</span> Tab 1: Organization Overview
        </button>
        <button type="button" class="reports-tab-btn ${state.activeTab === 'sales_heads' ? 'active' : ''}" onclick="App.switchReportTab('sales_heads')">
          <span>👔</span> Tab 2: Sales Head Reports (${(data.salesHeadReports || []).length})
        </button>
        <button type="button" class="reports-tab-btn ${state.activeTab === 'sales_associates' ? 'active' : ''}" onclick="App.switchReportTab('sales_associates')">
          <span>👥</span> Tab 3: Sales Associate Reports (${(data.salesAssociateReports || []).length})
        </button>
      </div>
    `;
  } else if (role === 'sales_head') {
    tabsHtml = `
      <div class="reports-nav-tabs">
        <button type="button" class="reports-tab-btn ${state.activeTab === 'my_performance' ? 'active' : ''}" onclick="App.switchReportTab('my_performance')">
          <span>👤</span> Tab 1: My Performance
        </button>
        <button type="button" class="reports-tab-btn ${state.activeTab === 'team_performance' ? 'active' : ''}" onclick="App.switchReportTab('team_performance')">
          <span>👥</span> Tab 2: My Team Performance (${(data.salesAssociateReports || []).length} Associates)
        </button>
      </div>
    `;
  } else if (role === 'super_admin') {
    tabsHtml = `
      <div class="reports-nav-tabs">
        <button type="button" class="reports-tab-btn ${state.activeTab === 'platform_overview' ? 'active' : ''}" onclick="App.switchReportTab('platform_overview')">
          <span>🌐</span> Platform Overview
        </button>
        <button type="button" class="reports-tab-btn ${state.activeTab === 'org_performance' ? 'active' : ''}" onclick="App.switchReportTab('org_performance')">
          <span>🏢</span> Organization Performance
        </button>
        <button type="button" class="reports-tab-btn ${state.activeTab === 'sales_heads' ? 'active' : ''}" onclick="App.switchReportTab('sales_heads')">
          <span>👔</span> Sales Heads (${(data.salesHeadReports || []).length})
        </button>
        <button type="button" class="reports-tab-btn ${state.activeTab === 'sales_associates' ? 'active' : ''}" onclick="App.switchReportTab('sales_associates')">
          <span>👥</span> Sales Associates (${(data.salesAssociateReports || []).length})
        </button>
      </div>
    `;
  } else {
    // Sales Associate
    tabsHtml = `
      <div class="reports-nav-tabs">
        <button type="button" class="reports-tab-btn active">
          <span>👤</span> My Performance Analytics
        </button>
      </div>
    `;
  }

  // Filter Bar HTML
  const filterBarHtml = `
    <div class="reports-filter-panel">
      <div class="reports-filter-grid">
        <!-- Date Preset Filter -->
        <div class="reports-filter-group">
          <label>Date Range Preset</label>
          <select id="rfDatePreset" onchange="App.handleDatePresetChange(this.value)">
            <option value="today" ${state.filters.date_preset === 'today' ? 'selected' : ''}>Today</option>
            <option value="yesterday" ${state.filters.date_preset === 'yesterday' ? 'selected' : ''}>Yesterday</option>
            <option value="last_7_days" ${state.filters.date_preset === 'last_7_days' ? 'selected' : ''}>Last 7 Days</option>
            <option value="last_30_days" ${state.filters.date_preset === 'last_30_days' ? 'selected' : ''}>Last 30 Days</option>
            <option value="this_week" ${state.filters.date_preset === 'this_week' ? 'selected' : ''}>This Week</option>
            <option value="last_week" ${state.filters.date_preset === 'last_week' ? 'selected' : ''}>Last Week</option>
            <option value="this_month" ${state.filters.date_preset === 'this_month' ? 'selected' : ''}>This Month</option>
            <option value="last_month" ${state.filters.date_preset === 'last_month' ? 'selected' : ''}>Last Month</option>
            <option value="custom" ${state.filters.date_preset === 'custom' ? 'selected' : ''}>Custom Range...</option>
          </select>
        </div>

        <!-- Custom Date Range Inputs (Visible only when custom is selected) -->
        <div id="rfCustomDateRangeWrap" style="display:${state.filters.date_preset === 'custom' ? 'contents' : 'none'};">
          <div class="reports-filter-group">
            <label>From Date</label>
            <input type="date" id="rfDateFrom" value="${state.filters.date_from || ''}">
          </div>
          <div class="reports-filter-group">
            <label>To Date</label>
            <input type="date" id="rfDateTo" value="${state.filters.date_to || ''}">
          </div>
        </div>

        <!-- Sales Head Multi-Select Filter (Admin & Super Admin) -->
        ${(role === 'admin' || role === 'super_admin') ? `
          <div class="reports-filter-group">
            <label>Sales Head</label>
            <div class="multi-select-wrap" id="rfHeadMultiWrap">
              <div class="multi-select-trigger" onclick="App.toggleMultiSelectDropdown('rfHeadDropdown')">
                <span id="rfHeadTriggerLabel">${state.filters.sales_head_ids.length ? `${state.filters.sales_head_ids.length} Selected` : 'All Sales Heads'}</span>
                <span style="font-size:10px; color:#94a3b8;">▼</span>
              </div>
              <div id="rfHeadDropdown" class="multi-select-dropdown hidden">
                <input type="text" class="multi-select-search" placeholder="Search sales heads..." oninput="App.filterMultiSelectOptions(this, 'rfHeadOptions')">
                <div class="multi-select-options" id="rfHeadOptions">
                  ${(filterOpts.salesHeads || []).map(h => `
                    <label class="multi-select-item">
                      <input type="checkbox" value="${h.id}" ${state.filters.sales_head_ids.includes(h.id) ? 'checked' : ''} onchange="App.handleHeadMultiSelectChange()">
                      <span>${Utils.escapeHTML(h.name)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Sales Associate Multi-Select Filter (Admin, Super Admin, Sales Head) -->
        ${(role !== 'sales_associate') ? `
          <div class="reports-filter-group">
            <label>Sales Associate</label>
            <div class="multi-select-wrap" id="rfAssocMultiWrap">
              <div class="multi-select-trigger" onclick="App.toggleMultiSelectDropdown('rfAssocDropdown')">
                <span id="rfAssocTriggerLabel">${state.filters.associate_ids.length ? `${state.filters.associate_ids.length} Selected` : 'All Associates'}</span>
                <span style="font-size:10px; color:#94a3b8;">▼</span>
              </div>
              <div id="rfAssocDropdown" class="multi-select-dropdown hidden">
                <input type="text" class="multi-select-search" placeholder="Search associates..." oninput="App.filterMultiSelectOptions(this, 'rfAssocOptions')">
                <div class="multi-select-options" id="rfAssocOptions">
                  ${(filterOpts.salesAssociates || []).map(a => `
                    <label class="multi-select-item">
                      <input type="checkbox" value="${a.id}" ${state.filters.associate_ids.includes(a.id) ? 'checked' : ''} onchange="App.handleAssocMultiSelectChange()">
                      <span>${Utils.escapeHTML(a.name)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Developer Filter -->
        <div class="reports-filter-group">
          <label>Developer</label>
          <select id="rfDeveloper" onchange="App.handleFilterChange('developer_id', this.value)">
            <option value="">All Developers</option>
            ${(filterOpts.developers || []).map(d => `
              <option value="${d.id}" ${state.filters.developer_id === d.id ? 'selected' : ''}>${Utils.escapeHTML(d.name)}</option>
            `).join('')}
          </select>
        </div>

        <!-- Project Filter -->
        <div class="reports-filter-group">
          <label>Project</label>
          <select id="rfProject" onchange="App.handleFilterChange('project_id', this.value)">
            <option value="">All Projects</option>
            ${(filterOpts.projects || []).map(p => `
              <option value="${p.id}" ${state.filters.project_id === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)}</option>
            `).join('')}
          </select>
        </div>

        <!-- Status Filter Group -->
        <div class="reports-filter-group">
          <label>Visit Status</label>
          <select id="rfVisitStatus" onchange="App.handleFilterChange('visit_status', this.value)">
            <option value="">All Visit Statuses</option>
            <option value="scheduled" ${state.filters.visit_status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
            <option value="confirmed" ${state.filters.visit_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="completed" ${state.filters.visit_status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${state.filters.visit_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            <option value="no_show" ${state.filters.visit_status === 'no_show' ? 'selected' : ''}>No Show</option>
          </select>
        </div>

        <!-- Filter Action Buttons -->
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn primary" onclick="App.applyReportsFilter()" style="padding:7px 14px; font-size:12.5px;">
            Apply
          </button>
          <button type="button" class="btn soft" onclick="App.resetReportsFilter()" style="padding:7px 12px; font-size:12.5px;" title="Reset Filters">
            ↺ Reset
          </button>
        </div>
      </div>
    </div>
  `;

  // Render Page Header & Container Frame
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="eyebrow">INTELLIGENCE & PERFORMANCE</div>
        <h1 class="page-title">Reports & Analytics</h1>
        <p class="page-desc">Comprehensive real-time reporting, team performance attribution, and conversion funnel analytics.</p>
      </div>
      <div class="export-btn-group">
        <button type="button" class="btn-export excel" onclick="App.exportReport('excel')" title="Download Excel (.xlsx) Report">
          <span>📊</span> Export Excel
        </button>
        <button type="button" class="btn-export" onclick="App.exportReport('csv')" title="Download CSV (.csv) Report">
          <span>📄</span> Export CSV
        </button>
        <button type="button" class="btn-export pdf" onclick="App.exportReport('pdf')" title="Download PDF (.pdf) Report">
          <span>📑</span> Export PDF
        </button>
      </div>
    </div>

    ${tabsHtml}
    ${filterBarHtml}

    <div id="reportsTabContent"></div>
  `;

  // Render tab content
  const contentArea = document.getElementById('reportsTabContent');
  if (state.activeTab === 'overview' || state.activeTab === 'my_performance' || state.activeTab === 'personal' || state.activeTab === 'platform_overview') {
    App.renderOverviewTab(contentArea, data);
  } else if (state.activeTab === 'sales_heads') {
    App.renderSalesHeadsTab(contentArea, data);
  } else if (state.activeTab === 'sales_associates' || state.activeTab === 'team_performance') {
    App.renderSalesAssociatesTab(contentArea, data);
  } else if (state.activeTab === 'org_performance') {
    App.renderOrgPerformanceTab(contentArea, data);
  }
};

/**
 * Render Overview Tab (12 KPIs, Funnels, and Interactive Chart.js)
 */
App.renderOverviewTab = function(container, data) {
  const k = data.kpis || {};
  const user = this.state.user || {};
  const role = user.role || 'admin';

  container.innerHTML = `
    <!-- Top 12 KPIs Grid -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 22px;">
      ${(role === 'super_admin' || role === 'admin') ? `
        <div class="kpi-card purple">
          <div class="kpi-label">Sales Heads</div>
          <div class="kpi-value">${k.totalSalesHeads}</div>
          <div class="kpi-sub">Active leaders</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-label">Sales Associates</div>
          <div class="kpi-value">${k.totalSalesAssociates}</div>
          <div class="kpi-sub">Active advisors</div>
        </div>
      ` : ''}

      <div class="kpi-card">
        <div class="kpi-label">Total Customers</div>
        <div class="kpi-value">${k.totalCustomers}</div>
        <div class="kpi-sub">${k.totalBookings} booked</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Invitations Created</div>
        <div class="kpi-value">${k.totalInvitationsCreated}</div>
        <div class="kpi-sub">${k.totalInvitationsSent} dispatched</div>
      </div>

      <div class="kpi-card green">
        <div class="kpi-label">Confirmed Visits</div>
        <div class="kpi-value">${k.totalConfirmedVisits}</div>
        <div class="kpi-sub">${k.confirmationRate}% confirm rate</div>
      </div>

      <div class="kpi-card green">
        <div class="kpi-label">Completed Visits</div>
        <div class="kpi-value">${k.totalCompletedVisits}</div>
        <div class="kpi-sub">${k.completionRate}% completion rate</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Cancelled Visits</div>
        <div class="kpi-value" style="color:#ef4444;">${k.totalCancelledVisits}</div>
        <div class="kpi-sub">Revoked appointments</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">No-Show Visits</div>
        <div class="kpi-value" style="color:#dc2626;">${k.totalNoShowVisits}</div>
        <div class="kpi-sub">Client missed</div>
      </div>

      <div class="kpi-card gold">
        <div class="kpi-label">Pending Follow-ups</div>
        <div class="kpi-value">${k.pendingFollowups}</div>
        <div class="kpi-sub">${k.completedFollowups} completed</div>
      </div>

      <div class="kpi-card gold">
        <div class="kpi-label">Overall Conversion Rate</div>
        <div class="kpi-value">${k.overallConversionRate}%</div>
        <div class="kpi-sub">Walkthrough to completion</div>
      </div>
    </div>

    <!-- Charts Row 1: Timeline Trend & Project Performance -->
    <div class="reports-chart-grid">
      <div class="reports-chart-card">
        <div class="reports-chart-title">
          <span>Site Visit Trends Timeline</span>
          <small style="color:var(--muted); font-size:11px;">Scheduled & Completed Visits</small>
        </div>
        <div class="reports-chart-canvas-wrap">
          <canvas id="chartVisitTrends"></canvas>
        </div>
      </div>

      <div class="reports-chart-card">
        <div class="reports-chart-title">
          <span>Project Performance</span>
          <small style="color:var(--muted); font-size:11px;">Visits & Conversions per Project</small>
        </div>
        <div class="reports-chart-canvas-wrap">
          <canvas id="chartProjectPerf"></canvas>
        </div>
      </div>
    </div>

    <!-- Charts Row 2: Distribution Donut Charts -->
    <div class="reports-chart-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
      <div class="reports-chart-card">
        <div class="reports-chart-title">Visit Status Distribution</div>
        <div class="reports-chart-canvas-wrap">
          <canvas id="chartVisitDist"></canvas>
        </div>
      </div>

      <div class="reports-chart-card">
        <div class="reports-chart-title">Invitation Status Distribution</div>
        <div class="reports-chart-canvas-wrap">
          <canvas id="chartInvDist"></canvas>
        </div>
      </div>

      <div class="reports-chart-card">
        <div class="reports-chart-title">Follow-up Status Distribution</div>
        <div class="reports-chart-canvas-wrap">
          <canvas id="chartFolDist"></canvas>
        </div>
      </div>
    </div>
  `;

  // Instantiate Chart.js visualizations
  setTimeout(() => App.initReportCharts(data), 50);
};

/**
 * Initialize all Chart.js instances with DB data
 */
App.initReportCharts = function(data) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js library not yet loaded.');
    return;
  }

  const state = App.reportsState;
  const trends = data.trends || [];
  const projects = data.projectPerformance || [];
  const dist = data.distributions || {};

  // 1. Visit Trends Line Chart
  const elTrends = document.getElementById('chartVisitTrends');
  if (elTrends) {
    const labels = trends.length ? trends.map(t => t.date) : ['Today'];
    const totalData = trends.length ? trends.map(t => t.visits_total) : [0];
    const completedData = trends.length ? trends.map(t => t.visits_completed) : [0];

    state.charts.trends = new Chart(elTrends, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Visits',
            data: totalData,
            borderColor: '#6c54a0',
            backgroundColor: 'rgba(108, 84, 160, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          },
          {
            label: 'Completed Visits',
            data: completedData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 2. Project Performance Bar Chart
  const elProject = document.getElementById('chartProjectPerf');
  if (elProject) {
    const pLabels = projects.slice(0, 6).map(p => p.project_name);
    const pConfirmed = projects.slice(0, 6).map(p => p.confirmed_visits);
    const pCompleted = projects.slice(0, 6).map(p => p.completed_visits);

    state.charts.projects = new Chart(elProject, {
      type: 'bar',
      data: {
        labels: pLabels.length ? pLabels : ['No Projects Recorded'],
        datasets: [
          {
            label: 'Confirmed',
            data: pConfirmed.length ? pConfirmed : [0],
            backgroundColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: 'Completed',
            data: pCompleted.length ? pCompleted : [0],
            backgroundColor: '#10b981',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // 3. Visit Distribution Donut
  const elVisitDist = document.getElementById('chartVisitDist');
  if (elVisitDist) {
    const vRows = dist.visit_status || [];
    const vLabels = vRows.length ? vRows.map(r => r.label) : ['No Visits'];
    const vData = vRows.length ? vRows.map(r => r.count) : [1];
    const vColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

    state.charts.visitDist = new Chart(elVisitDist, {
      type: 'doughnut',
      data: {
        labels: vLabels,
        datasets: [{ data: vData, backgroundColor: vColors.slice(0, vLabels.length) }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
      }
    });
  }

  // 4. Invitation Distribution Donut
  const elInvDist = document.getElementById('chartInvDist');
  if (elInvDist) {
    const iRows = dist.invitation_status || [];
    const iLabels = iRows.length ? iRows.map(r => r.label) : ['No Invitations'];
    const iData = iRows.length ? iRows.map(r => r.count) : [1];
    const iColors = ['#6c54a0', '#38bdf8', '#fbbf24', '#34d399', '#cbd5e1'];

    state.charts.invDist = new Chart(elInvDist, {
      type: 'doughnut',
      data: {
        labels: iLabels,
        datasets: [{ data: iData, backgroundColor: iColors.slice(0, iLabels.length) }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
      }
    });
  }

  // 5. Follow-up Distribution Donut
  const elFolDist = document.getElementById('chartFolDist');
  if (elFolDist) {
    const fRows = dist.followup_status || [];
    const fLabels = fRows.length ? fRows.map(r => r.label) : ['No Follow-ups'];
    const fData = fRows.length ? fRows.map(r => r.count) : [1];
    const fColors = ['#f59e0b', '#10b981', '#ef4444', '#94a3b8'];

    state.charts.folDist = new Chart(elFolDist, {
      type: 'doughnut',
      data: {
        labels: fLabels,
        datasets: [{ data: fData, backgroundColor: fColors.slice(0, fLabels.length) }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
      }
    });
  }
};

/**
 * Render Sales Heads Tab (Tab 2 for Admin & Super Admin)
 */
App.renderSalesHeadsTab = function(container, data) {
  const heads = data.salesHeadReports || [];

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 class="panel-title">Sales Head Performance Reports</h3>
          <p class="panel-desc" style="margin-top:2px; font-size:12px; color:var(--muted);">
            Consolidated metrics for all sales heads and their reporting teams.
          </p>
        </div>
        <div style="font-size:12px; font-weight:600; color:var(--purple); background:rgba(108,84,160,0.08); padding:5px 10px; border-radius:6px;">
          ${heads.length} Sales Heads Active
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sales Head Name</th>
              <th>Total Associates</th>
              <th>Customers</th>
              <th>Invites Created</th>
              <th>Invites Sent</th>
              <th>Confirmed Visits</th>
              <th>Completed Visits</th>
              <th>Cancelled</th>
              <th>No-Show</th>
              <th>Pending Follow-ups</th>
              <th>Completed Follow-ups</th>
              <th>Conversion Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${heads.length ? heads.map(h => `
              <tr>
                <td>
                  <strong>${Utils.escapeHTML(h.head_name)}</strong>
                  <div style="font-size:11px; color:var(--muted);">${Utils.escapeHTML(h.email || h.phone || '')}</div>
                </td>
                <td style="text-align:center;"><span class="badge purple">${h.associates_count}</span></td>
                <td>${h.customers_count}</td>
                <td>${h.invitations_created}</td>
                <td>${h.invitations_sent}</td>
                <td style="color:var(--green); font-weight:600;">${h.confirmed_visits}</td>
                <td style="color:var(--purple); font-weight:700;">${h.completed_visits}</td>
                <td style="color:var(--muted);">${h.cancelled_visits}</td>
                <td style="color:var(--red);">${h.no_show_visits}</td>
                <td style="color:var(--gold); font-weight:600;">${h.pending_followups}</td>
                <td>${h.completed_followups}</td>
                <td>
                  <span class="badge ${h.conversion_rate >= 25 ? 'confirmed' : (h.conversion_rate > 0 ? 'pending' : '')}">
                    ${h.conversion_rate}%
                  </span>
                </td>
                <td>
                  <button type="button" class="btn small soft" onclick="App.openSalesHeadDetailsModal('${h.head_id}', '${Utils.escapeHTML(h.head_name)}')">
                    View Team
                  </button>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="13" style="text-align:center; padding:35px; color:var(--muted);">
                  No sales heads match the current filter criteria.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/**
 * Render Sales Associates Tab (Tab 3 for Admin, Tab 2 for Sales Head)
 */
App.renderSalesAssociatesTab = function(container, data) {
  const assocs = data.salesAssociateReports || [];
  const user = this.state.user || {};
  const isHead = user.role === 'sales_head';

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 class="panel-title">${isHead ? 'My Team Performance' : 'Sales Associate Performance Reports'}</h3>
          <p class="panel-desc" style="margin-top:2px; font-size:12px; color:var(--muted);">
            Individual advisor throughput, customer handling, invitation volume, and verified walkthrough conversion.
          </p>
        </div>
        <div style="font-size:12px; font-weight:600; color:var(--green); background:rgba(16,185,129,0.08); padding:5px 10px; border-radius:6px;">
          ${assocs.length} Associates
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Associate Name</th>
              ${!isHead ? `<th>Reporting Sales Head</th>` : ''}
              <th>Customers</th>
              <th>Invites Created</th>
              <th>Invites Sent</th>
              <th>Confirmed Visits</th>
              <th>Completed Visits</th>
              <th>Cancelled</th>
              <th>No-Show</th>
              <th>Pending Follow-ups</th>
              <th>Completed Follow-ups</th>
              <th>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            ${assocs.length ? assocs.map(a => `
              <tr>
                <td>
                  <strong>${Utils.escapeHTML(a.associate_name)}</strong>
                  <div style="font-size:11px; color:var(--muted);">${Utils.escapeHTML(a.email || a.phone || '')}</div>
                </td>
                ${!isHead ? `
                  <td>
                    <span class="badge soft">${Utils.escapeHTML(a.reporting_sales_head || 'Direct')}</span>
                  </td>
                ` : ''}
                <td>${a.customers_count}</td>
                <td>${a.invitations_created}</td>
                <td>${a.invitations_sent}</td>
                <td style="color:var(--green); font-weight:600;">${a.confirmed_visits}</td>
                <td style="color:var(--purple); font-weight:700;">${a.completed_visits}</td>
                <td style="color:var(--muted);">${a.cancelled_visits}</td>
                <td style="color:var(--red);">${a.no_show_visits}</td>
                <td style="color:var(--gold); font-weight:600;">${a.pending_followups}</td>
                <td>${a.completed_followups}</td>
                <td>
                  <span class="badge ${a.conversion_rate >= 25 ? 'confirmed' : (a.conversion_rate > 0 ? 'pending' : '')}">
                    ${a.conversion_rate}%
                  </span>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="${!isHead ? '12' : '11'}" style="text-align:center; padding:35px; color:var(--muted);">
                  No sales associates match the current filter criteria.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/**
 * Render Super Admin Organization Performance Tab
 */
App.renderOrgPerformanceTab = function(container, data) {
  const orgs = data.orgPerformance || [];

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Organization Performance Comparison</h3>
        <p class="panel-desc" style="margin-top:2px; font-size:12px; color:var(--muted);">
          Cross-organization tenant metrics, leadership ratios, and completed walkthrough totals.
        </p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Admins</th>
              <th>Sales Heads</th>
              <th>Associates</th>
              <th>Customers</th>
              <th>Invitations</th>
              <th>Completed Visits</th>
            </tr>
          </thead>
          <tbody>
            ${orgs.length ? orgs.map(o => `
              <tr>
                <td><strong>${Utils.escapeHTML(o.name)}</strong></td>
                <td>${o.admins_count}</td>
                <td>${o.heads_count}</td>
                <td>${o.associates_count}</td>
                <td>${o.customers_count}</td>
                <td>${o.invitations_count}</td>
                <td><strong style="color:var(--green);">${o.completed_visits}</strong></td>
              </tr>
            `).join('') : `
              <tr><td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">No organization records available.</td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/**
 * Tab Switching Handler
 */
App.switchReportTab = function(tabName) {
  App.reportsState.activeTab = tabName;
  App.renderReportsAnalytics(document.getElementById('contentContainer'));
};

/**
 * Date Preset Change Handler
 */
App.handleDatePresetChange = function(preset) {
  App.reportsState.filters.date_preset = preset;
  const wrap = document.getElementById('rfCustomDateRangeWrap');
  if (wrap) {
    wrap.style.display = (preset === 'custom') ? 'contents' : 'none';
  }
};

/**
 * Single Value Filter Change Handler
 */
App.handleFilterChange = function(key, val) {
  App.reportsState.filters[key] = val;
};

/**
 * Multi-Select Dropdown Toggle & Filter
 */
App.toggleMultiSelectDropdown = function(dropdownId) {
  const dd = document.getElementById(dropdownId);
  if (!dd) return;
  const isHidden = dd.classList.contains('hidden');
  document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
  if (isHidden) dd.classList.remove('hidden');
};

App.filterMultiSelectOptions = function(inputEl, optionsContainerId) {
  const filter = inputEl.value.toLowerCase().trim();
  const container = document.getElementById(optionsContainerId);
  if (!container) return;
  const items = container.querySelectorAll('.multi-select-item');
  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(filter) ? 'flex' : 'none';
  });
};

App.handleHeadMultiSelectChange = function() {
  const checked = Array.from(document.querySelectorAll('#rfHeadOptions input:checked')).map(i => i.value);
  App.reportsState.filters.sales_head_ids = checked;
  const label = document.getElementById('rfHeadTriggerLabel');
  if (label) {
    label.innerText = checked.length ? `${checked.length} Selected` : 'All Sales Heads';
  }
};

App.handleAssocMultiSelectChange = function() {
  const checked = Array.from(document.querySelectorAll('#rfAssocOptions input:checked')).map(i => i.value);
  App.reportsState.filters.associate_ids = checked;
  const label = document.getElementById('rfAssocTriggerLabel');
  if (label) {
    label.innerText = checked.length ? `${checked.length} Selected` : 'All Associates';
  }
};

// Close multi-select on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.multi-select-wrap')) {
    document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
  }
});

/**
 * Apply Filters
 */
App.applyReportsFilter = function() {
  const state = App.reportsState;
  const preset = document.getElementById('rfDatePreset')?.value;
  if (preset) state.filters.date_preset = preset;

  if (preset === 'custom') {
    state.filters.date_from = document.getElementById('rfDateFrom')?.value || '';
    state.filters.date_to = document.getElementById('rfDateTo')?.value || '';
  } else {
    state.filters.date_from = '';
    state.filters.date_to = '';
  }

  App.renderReportsAnalytics(document.getElementById('contentContainer'));
};

/**
 * Reset Filters
 */
App.resetReportsFilter = function() {
  App.reportsState.filters = {
    date_preset: 'last_30_days',
    date_from: '',
    date_to: '',
    sales_head_ids: [],
    associate_ids: [],
    developer_id: '',
    project_id: '',
    invitation_status: '',
    visit_status: '',
    followup_status: '',
    organization_id: ''
  };
  App.renderReportsAnalytics(document.getElementById('contentContainer'));
};

/**
 * Export Handler (Excel, CSV, PDF)
 */
App.exportReport = function(format) {
  const state = App.reportsState;
  const params = new URLSearchParams();
  params.set('view', state.activeTab || 'overview');
  params.set('date_preset', state.filters.date_preset);
  if (state.filters.date_from) params.set('date_from', state.filters.date_from);
  if (state.filters.date_to) params.set('date_to', state.filters.date_to);
  if (state.filters.sales_head_ids.length) params.set('sales_head_ids', state.filters.sales_head_ids.join(','));
  if (state.filters.associate_ids.length) params.set('associate_ids', state.filters.associate_ids.join(','));
  if (state.filters.developer_id) params.set('developer_id', state.filters.developer_id);
  if (state.filters.project_id) params.set('project_id', state.filters.project_id);
  if (state.filters.invitation_status) params.set('invitation_status', state.filters.invitation_status);
  if (state.filters.visit_status) params.set('visit_status', state.filters.visit_status);
  if (state.filters.followup_status) params.set('followup_status', state.filters.followup_status);
  if (state.filters.organization_id) params.set('organization_id', state.filters.organization_id);

  // Authenticated file download trigger
  const token = localStorage.getItem('auth_token');
  const exportUrl = `/api/reports/export/${format}?${params.toString()}`;

  Utils.toast(`Generating ${format.toUpperCase()} export...`);

  // Use fetch with Authorization header to download binary blob
  fetch(exportUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Export failed with status ${res.status}`);
      }
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visit_studio_report_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 4000);
      Utils.toast(`${format.toUpperCase()} export downloaded successfully!`);
    })
    .catch(err => {
      Utils.toast(`Export error: ${err.message}`);
    });
};

/**
 * Sales Head Detailed Team Modal
 */
App.openSalesHeadDetailsModal = async function(headId, headName) {
  Utils.showModal(`
    <div style="text-align:center; padding:30px; color:var(--muted);">
      <div class="inv-loader-spinner" style="margin:0 auto 12px;"></div>
      <div>Loading team performance for ${Utils.escapeHTML(headName)}...</div>
    </div>
  `);

  try {
    const res = await API.get(`/reports/sales-head/${headId}/team-details`);
    const head = res.head || {};
    const associates = res.associates || [];

    const html = `
      <div style="margin-bottom:18px;">
        <div class="eyebrow">SALES HEAD TEAM BREAKDOWN</div>
        <h3 class="modal-title" style="margin-bottom:4px;">${Utils.escapeHTML(head.name)}</h3>
        <p style="font-size:12.5px; color:var(--muted);">${Utils.escapeHTML(head.email || '')} • ${Utils.escapeHTML(head.phone || '')}</p>
      </div>

      <div style="margin-bottom:18px; max-height:420px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
        <table style="width:100%; font-size:12px;">
          <thead style="position:sticky; top:0; background:#f8fafc;">
            <tr>
              <th style="padding:8px 10px;">Associate</th>
              <th style="padding:8px 10px;">Customers</th>
              <th style="padding:8px 10px;">Invites</th>
              <th style="padding:8px 10px;">Confirmed</th>
              <th style="padding:8px 10px;">Completed</th>
              <th style="padding:8px 10px;">Pending Follow-ups</th>
            </tr>
          </thead>
          <tbody>
            ${associates.length ? associates.map(a => `
              <tr>
                <td style="padding:8px 10px;">
                  <strong>${Utils.escapeHTML(a.name)}</strong>
                  <div style="font-size:10.5px; color:var(--muted);">${Utils.escapeHTML(a.phone || a.email || '')}</div>
                </td>
                <td style="padding:8px 10px; text-align:center;">${a.customers_count}</td>
                <td style="padding:8px 10px; text-align:center;">${a.invitations_count}</td>
                <td style="padding:8px 10px; text-align:center; color:var(--green); font-weight:600;">${a.confirmed_visits}</td>
                <td style="padding:8px 10px; text-align:center; color:var(--purple); font-weight:700;">${a.completed_visits}</td>
                <td style="padding:8px 10px; text-align:center; color:var(--gold);">${a.pending_followups}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="6" style="text-align:center; padding:20px; color:var(--muted);">No associates assigned under this sales head.</td></tr>
            `}
          </tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:flex-end;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Close</button>
      </div>
    `;

    Utils.showModal(html);
  } catch (err) {
    Utils.showModal(`
      <div style="padding:20px; color:var(--red);">
        Failed to load team details: ${Utils.escapeHTML(err.message)}
        <div style="margin-top:15px; text-align:right;">
          <button type="button" class="btn" onclick="Utils.closeModal()">Close</button>
        </div>
      </div>
    `);
  }
};
