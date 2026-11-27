// Lead Analytics & Reports Component
App.leadReportsState = {
  filters: {
    date_preset: 'last_30_days',
    date_from: '',
    date_to: '',
    granularity: 'daily',
    organization_id: '',
    sales_head_id: '',
    associate_id: '',
    project_id: '',
    developer_id: '',
    source: '',
    campaign_id: '',
    stage: '',
    followup_status: '',
    visit_status: ''
  },
  charts: {}
};

App.renderLeadReports = async function(container, isAnalyticsMode = false) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Aggregating lead intelligence & reports...</div>`;
  try {
    const user = this.currentUser || {};
    const role = user.role || 'sales_associate';
    const f = App.leadReportsState.filters;

    const [reportData, projsRes, devsRes, campsRes, usersRes, orgsRes] = await Promise.all([
      API.get('/reports/overview', f),
      API.get('/projects').catch(() => ({ projects: [] })),
      API.get('/developers').catch(() => ({ developers: [] })),
      API.get('/lead-links/campaigns').catch(() => ({ campaigns: [] })),
      role !== 'sales_associate' ? API.get('/users').catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
      role === 'super_admin' ? API.get('/organizations').catch(() => ({ organizations: [] })) : Promise.resolve({ organizations: [] })
    ]);

    const projects = projsRes.projects || [];
    const developers = devsRes.developers || [];
    const campaigns = campsRes.campaigns || [];
    const users = usersRes.users || [];
    const salesHeads = users.filter(u => u.role === 'sales_head');
    const associates = users.filter(u => u.role === 'sales_associate');
    const orgs = orgsRes.organizations || [];

    const k = reportData.kpis || {};
    const defs = reportData.kpiDefinitions || {};

    Object.values(App.leadReportsState.charts).forEach(ch => { try { if (ch) ch.destroy(); } catch (_) {} });
    App.leadReportsState.charts = {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">${isAnalyticsMode ? 'LEAD ANALYTICS' : 'LEAD REPORTS & EXPORTS'}</div>
          <h1 class="page-title">${isAnalyticsMode ? 'Lead Conversion Analytics' : 'Lead Management Reports'}</h1>
          <p class="page-desc">Server-aggregated metrics, multi-dimensional filters, and authorized Excel / CSV / PDF exports (${Utils.escapeHTML(reportData.dateRange?.label || 'Last 30 Days')}).</p>
        </div>
        <div class="actions">
          <button class="btn soft" onclick="App.downloadLeadReportExport('excel')">Export Excel</button>
          <button class="btn soft" onclick="App.downloadLeadReportExport('csv')">Export CSV</button>
          <button class="btn primary" onclick="App.downloadLeadReportExport('pdf')">Export PDF</button>
        </div>
      </div>

      <div class="panel" style="padding:16px; margin-bottom:20px;">
        <div class="fields-grid">
          <div>
            <label>Date Preset</label>
            <select onchange="App.updateLeadReportFilter('date_preset', this.value, ${isAnalyticsMode})">
              <option value="today" ${f.date_preset === 'today' ? 'selected' : ''}>Today</option>
              <option value="yesterday" ${f.date_preset === 'yesterday' ? 'selected' : ''}>Yesterday</option>
              <option value="last_7_days" ${f.date_preset === 'last_7_days' ? 'selected' : ''}>Last 7 Days</option>
              <option value="last_30_days" ${f.date_preset === 'last_30_days' ? 'selected' : ''}>Last 30 Days</option>
              <option value="this_month" ${f.date_preset === 'this_month' ? 'selected' : ''}>This Month</option>
              <option value="last_month" ${f.date_preset === 'last_month' ? 'selected' : ''}>Last Month</option>
              <option value="all_time" ${f.date_preset === 'all_time' ? 'selected' : ''}>All Time</option>
            </select>
          </div>
          <div>
            <label>From Date</label>
            <input type="date" value="${Utils.escapeHTML(f.date_from)}" onchange="App.leadReportsState.filters.date_preset='custom'; App.updateLeadReportFilter('date_from', this.value, ${isAnalyticsMode})">
          </div>
          <div>
            <label>To Date</label>
            <input type="date" value="${Utils.escapeHTML(f.date_to)}" onchange="App.leadReportsState.filters.date_preset='custom'; App.updateLeadReportFilter('date_to', this.value, ${isAnalyticsMode})">
          </div>
          <div>
            <label>Trend Granularity</label>
            <select onchange="App.updateLeadReportFilter('granularity', this.value, ${isAnalyticsMode})">
              <option value="daily" ${f.granularity === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${f.granularity === 'weekly' ? 'selected' : ''}>Weekly</option>
              <option value="monthly" ${f.granularity === 'monthly' ? 'selected' : ''}>Monthly</option>
            </select>
          </div>
          ${role === 'super_admin' ? `
            <div>
              <label>Organization</label>
              <select onchange="App.updateLeadReportFilter('organization_id', this.value, ${isAnalyticsMode})">
                <option value="">All Organizations</option>
                ${orgs.map(o => `<option value="${o.id}" ${f.organization_id === o.id ? 'selected' : ''}>${Utils.escapeHTML(o.name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          ${(role === 'admin' || role === 'super_admin') ? `
            <div>
              <label>Sales Head</label>
              <select onchange="App.updateLeadReportFilter('sales_head_id', this.value, ${isAnalyticsMode})">
                <option value="">All Sales Heads</option>
                ${salesHeads.map(sh => `<option value="${sh.id}" ${f.sales_head_id === sh.id ? 'selected' : ''}>${Utils.escapeHTML(sh.name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          ${role !== 'sales_associate' ? `
            <div>
              <label>Sales Associate</label>
              <select onchange="App.updateLeadReportFilter('associate_id', this.value, ${isAnalyticsMode})">
                <option value="">All Associates</option>
                ${associates.map(a => `<option value="${a.id}" ${f.associate_id === a.id ? 'selected' : ''}>${Utils.escapeHTML(a.name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          <div>
            <label>Developer</label>
            <select onchange="App.updateLeadReportFilter('developer_id', this.value, ${isAnalyticsMode})">
              <option value="">All Developers</option>
              ${developers.map(d => `<option value="${d.id}" ${f.developer_id === d.id ? 'selected' : ''}>${Utils.escapeHTML(d.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Project</label>
            <select onchange="App.updateLeadReportFilter('project_id', this.value, ${isAnalyticsMode})">
              <option value="">All Projects</option>
              ${projects.map(p => `<option value="${p.id}" ${f.project_id === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Campaign</label>
            <select onchange="App.updateLeadReportFilter('campaign_id', this.value, ${isAnalyticsMode})">
              <option value="">All Campaigns</option>
              ${campaigns.map(c => `<option value="${c.id}" ${f.campaign_id === c.id ? 'selected' : ''}>${Utils.escapeHTML(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Lead Stage</label>
            <select onchange="App.updateLeadReportFilter('stage', this.value, ${isAnalyticsMode})">
              <option value="">All Stages</option>
              <option value="new_lead" ${f.stage === 'new_lead' ? 'selected' : ''}>New Lead</option>
              <option value="contacted" ${f.stage === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="interested" ${f.stage === 'interested' ? 'selected' : ''}>Interested</option>
              <option value="site_visit_scheduled" ${f.stage === 'site_visit_scheduled' ? 'selected' : ''}>Site Visit Scheduled</option>
              <option value="site_visit_completed" ${f.stage === 'site_visit_completed' ? 'selected' : ''}>Site Visit Completed</option>
              <option value="negotiation" ${f.stage === 'negotiation' ? 'selected' : ''}>Negotiation</option>
              <option value="booked_won" ${f.stage === 'booked_won' ? 'selected' : ''}>Booked / Won</option>
              <option value="lost" ${f.stage === 'lost' ? 'selected' : ''}>Lost</option>
            </select>
          </div>
          <div>
            <label>Follow-up Status</label>
            <select onchange="App.updateLeadReportFilter('followup_status', this.value, ${isAnalyticsMode})">
              <option value="">All Follow-up Status</option>
              <option value="pending" ${f.followup_status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="overdue" ${f.followup_status === 'overdue' ? 'selected' : ''}>Overdue</option>
              <option value="completed" ${f.followup_status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <div>
            <label>Site Visit Status</label>
            <select onchange="App.updateLeadReportFilter('visit_status', this.value, ${isAnalyticsMode})">
              <option value="">All Visit Status</option>
              <option value="upcoming" ${f.visit_status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
              <option value="confirmed" ${f.visit_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="completed" ${f.visit_status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${f.visit_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:20px;">
        <div class="kpi-card purple"><div class="kpi-label">Total Leads</div><div class="kpi-value">${k.totalLeads || 0}</div><div class="kpi-sub">New: ${k.newLeads || 0} · Contacted: ${k.contactedLeads || 0}</div></div>
        <div class="kpi-card blue"><div class="kpi-label">Interested</div><div class="kpi-value">${k.interestedLeads || 0}</div><div class="kpi-sub">Negotiation: ${k.negotiationLeads || 0}</div></div>
        <div class="kpi-card gold"><div class="kpi-label">Visits Scheduled / Done</div><div class="kpi-value">${k.siteVisitsScheduled || 0} / ${k.siteVisitsCompleted || 0}</div></div>
        <div class="kpi-card green"><div class="kpi-label">Booked / Won</div><div class="kpi-value">${k.bookedLeads || 0}</div><div class="kpi-sub">${k.conversionRate || 0}% conversion · Lost: ${k.lostLeads || 0}</div></div>
        <div class="kpi-card"><div class="kpi-label">Follow-ups (Pend / Overdue)</div><div class="kpi-value">${k.pendingFollowups || 0} / ${k.overdueFollowups || 0}</div></div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:20px; margin-bottom:20px;">
        <div class="panel" style="padding:18px;">
          <h3 class="panel-title" style="margin-bottom:10px;">Lead Trends (${Utils.escapeHTML(f.granularity)})</h3>
          <canvas id="leadTrendChart" height="190"></canvas>
        </div>
        <div class="panel" style="padding:18px;">
          <h3 class="panel-title" style="margin-bottom:10px;">Lead Stage Distribution</h3>
          <canvas id="leadStageChart" height="190"></canvas>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:20px; margin-bottom:20px;">
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Project-wise Lead Performance</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Leads</th><th>Visits</th><th>Booked</th><th>Lost</th><th>Conv %</th></tr></thead>
              <tbody>
                ${(reportData.projectPerformance || []).map(p => `
                  <tr>
                    <td><strong>${Utils.escapeHTML(p.project_name)}</strong><small>${Utils.escapeHTML(p.developer_name)}</small></td>
                    <td>${p.total_leads}</td>
                    <td>${p.visits_completed} / ${p.visits_scheduled}</td>
                    <td>${p.booked_leads}</td>
                    <td>${p.lost_leads}</td>
                    <td><strong>${p.conversion_rate}%</strong></td>
                  </tr>
                `).join('') || `<tr><td colspan="6" style="text-align:center; padding:20px;">No data.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Source-wise Lead Performance</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Source</th><th>Leads</th><th>Visited</th><th>Booked</th><th>Conv %</th></tr></thead>
              <tbody>
                ${(reportData.sourcePerformance || []).map(s => `
                  <tr>
                    <td><strong>${Utils.escapeHTML(s.source)}</strong></td>
                    <td>${s.total_leads}</td>
                    <td>${s.visits_completed}</td>
                    <td>${s.booked_leads}</td>
                    <td><strong>${s.conversion_rate}%</strong></td>
                  </tr>
                `).join('') || `<tr><td colspan="5" style="text-align:center; padding:20px;">No data.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:20px; margin-bottom:20px;">
        <div class="panel" style="padding:16px;">
          <h4 style="margin-bottom:8px;">Budget Distribution</h4>
          ${(reportData.budgetDistribution || []).map(b => `<div style="display:flex; justify-content:space-between; font-size:12.5px; padding:4px 0;"><span>${Utils.escapeHTML(b.label)}</span><strong>${b.count}</strong></div>`).join('') || '<div style="color:var(--muted);">No data</div>'}
        </div>
        <div class="panel" style="padding:16px;">
          <h4 style="margin-bottom:8px;">Configuration Distribution</h4>
          ${(reportData.configurationDistribution || []).map(b => `<div style="display:flex; justify-content:space-between; font-size:12.5px; padding:4px 0;"><span>${Utils.escapeHTML(b.label)}</span><strong>${b.count}</strong></div>`).join('') || '<div style="color:var(--muted);">No data</div>'}
        </div>
        <div class="panel" style="padding:16px;">
          <h4 style="margin-bottom:8px;">Timeline Distribution</h4>
          ${(reportData.timelineDistribution || []).map(b => `<div style="display:flex; justify-content:space-between; font-size:12.5px; padding:4px 0;"><span>${Utils.escapeHTML(b.label)}</span><strong>${b.count}</strong></div>`).join('') || '<div style="color:var(--muted);">No data</div>'}
        </div>
        <div class="panel" style="padding:16px;">
          <h4 style="margin-bottom:8px;">Lost Lead Reasons</h4>
          ${(reportData.lostReasons || []).map(b => `<div style="display:flex; justify-content:space-between; font-size:12.5px; padding:4px 0;"><span>${Utils.escapeHTML(b.reason)}</span><strong>${b.count}</strong></div>`).join('') || '<div style="color:var(--muted);">No lost leads</div>'}
        </div>
      </div>

      <div class="panel" style="padding:14px 18px; font-size:12px; color:var(--muted);">
        <strong>KPI Definitions:</strong>
        Total Leads = ${Utils.escapeHTML(defs.totalLeads || '')} ·
        Conversion Rate = ${Utils.escapeHTML(defs.conversionRate || '')} ·
        Overdue Follow-ups = ${Utils.escapeHTML(defs.overdueFollowups || '')}
      </div>
    `;

    if (typeof Chart !== 'undefined') {
      const trendCtx = document.getElementById('leadTrendChart')?.getContext('2d');
      if (trendCtx) {
        const trends = reportData.trends || [];
        App.leadReportsState.charts.trend = new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: trends.map(t => t.period),
            datasets: [
              { label: 'Total Leads', data: trends.map(t => t.total_leads), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.3, fill: true },
              { label: 'Booked', data: trends.map(t => t.booked_leads), borderColor: '#15803d', tension: 0.3 }
            ]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
      }

      const stageCtx = document.getElementById('leadStageChart')?.getContext('2d');
      if (stageCtx) {
        const dist = reportData.stageDistribution || [];
        App.leadReportsState.charts.stage = new Chart(stageCtx, {
          type: 'doughnut',
          data: {
            labels: dist.map(d => d.label.replace(/_/g, ' ')),
            datasets: [{
              data: dist.map(d => d.count),
              backgroundColor: ['#2563eb', '#7c3aed', '#0891b2', '#d97706', '#059669', '#db2777', '#15803d', '#b91c1c']
            }]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.updateLeadReportFilter = function(key, value, isAnalyticsMode) {
  App.leadReportsState.filters[key] = value;
  App.renderLeadReports(document.getElementById('pageContent'), isAnalyticsMode);
};

App.downloadLeadReportExport = async function(format) {
  try {
    const params = new URLSearchParams({ format, ...App.leadReportsState.filters });
    const token = API.getToken();
    const res = await fetch(`/api/reports/lead-export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const ext = format === 'csv' ? 'csv' : (format === 'pdf' ? 'pdf' : 'xlsx');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visit_studio_lead_report.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    Utils.toast('Export failed: ' + err.message);
  }
};
