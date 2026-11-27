// Lead Dashboard Component (Role-Based: Associate, Sales Head, Admin, Super Admin)
App.renderLeadDashboard = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading Lead Management dashboard...</div>`;
  try {
    const user = this.currentUser || {};
    const role = user.role || 'sales_associate';
    const [overview, linksRes, overdueRes, leadsRes] = await Promise.all([
      API.get('/reports/overview', { date_preset: 'last_30_days' }),
      API.get('/lead-links', { page: 1, limit: 5 }).catch(() => ({ links: [] })),
      API.get('/followups/overdue').catch(() => ({ followups: [] })),
      API.get('/leads', { page: 1, limit: 8 }).catch(() => ({ leads: [] }))
    ]);

    const k = overview.kpis || {};
    const links = linksRes.links || [];
    const overdue = overdueRes.followups || [];
    const recentLeads = leadsRes.leads || [];
    const roleLabel = role.replace(/_/g, ' ').toUpperCase();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">${roleLabel} · LEAD MANAGEMENT</div>
          <h1 class="page-title">Lead Management Dashboard</h1>
          <p class="page-desc">Real-time enquiries, attribution performance, pipeline stages, and follow-up cadence (Last 30 Days).</p>
        </div>
        <div class="actions">
          ${role !== 'super_admin' ? `
            <button class="btn primary" onclick="App.navigate('lead_generation')">+ Generate Enquiry Link</button>
          ` : ''}
          <button class="btn soft" onclick="App.navigate('lead_pipeline')">Open Pipeline</button>
          <button class="btn soft" onclick="App.navigate('lead_reports')">Lead Reports</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card purple">
          <div class="kpi-label">Total Leads</div>
          <div class="kpi-value">${k.totalLeads || 0}</div>
          <div class="kpi-sub">New: ${k.newLeads || 0} · Contacted: ${k.contactedLeads || 0}</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-label">Interested</div>
          <div class="kpi-value">${k.interestedLeads || 0}</div>
          <div class="kpi-sub">Negotiation: ${k.negotiationLeads || 0}</div>
        </div>
        <div class="kpi-card gold">
          <div class="kpi-label">Site Visits</div>
          <div class="kpi-value">${k.siteVisitsScheduled || 0}</div>
          <div class="kpi-sub">Completed: ${k.siteVisitsCompleted || 0}</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Booked / Won</div>
          <div class="kpi-value">${k.bookedLeads || 0}</div>
          <div class="kpi-sub">${k.conversionRate || 0}% conversion · Lost: ${k.lostLeads || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Follow-ups</div>
          <div class="kpi-value" style="color:${(k.overdueFollowups || 0) > 0 ? 'var(--red)' : 'var(--amber)'};">${k.pendingFollowups || 0}</div>
          <div class="kpi-sub">${k.overdueFollowups || 0} overdue alert${(k.overdueFollowups || 0) === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:20px; margin-bottom:24px;">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Recent Enquiries</h3>
            <button class="btn small" onclick="App.navigate('leads')">View All Leads →</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Ref / Customer</th><th>Project</th><th>Stage</th><th>Owner</th></tr>
              </thead>
              <tbody>
                ${recentLeads.length ? recentLeads.map(l => `
                  <tr>
                    <td>
                      <button type="button" class="row-link" onclick="App.openLeadDetailModal('${l.id}')">${Utils.escapeHTML(l.customer_name)}</button>
                      <small><code>${Utils.escapeHTML(l.enquiry_ref)}</code> · ${Utils.escapeHTML(l.enquiry_source || '')}</small>
                    </td>
                    <td>${Utils.escapeHTML(l.project_name || '—')}<small>${Utils.escapeHTML(l.apartment_size || '')}</small></td>
                    <td><span class="badge lead-stage-${l.stage}">${Utils.escapeHTML(l.stage.replace(/_/g, ' '))}</span></td>
                    <td>${Utils.escapeHTML(l.assigned_associate_name || l.assigned_sales_head_name || 'Unassigned')}</td>
                  </tr>
                `).join('') : `<tr><td colspan="4" style="text-align:center; padding:28px; color:var(--muted);">No enquiries recorded yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">${role === 'sales_associate' ? 'My Link Performance' : 'Top Tracking Links'}</h3>
            <button class="btn small" onclick="App.navigate('lead_generation')">Manage Links →</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Link / Project</th><th>Opens</th><th>Submissions</th><th>Actions</th></tr></thead>
              <tbody>
                ${links.length ? links.map(lnk => `
                  <tr>
                    <td>
                      <strong>${Utils.escapeHTML(lnk.title || lnk.project_name || 'Enquiry Link')}</strong>
                      <small><code>/e/${Utils.escapeHTML(lnk.short_code)}</code> · ${lnk.is_active ? 'Active' : 'Inactive'}</small>
                    </td>
                    <td>${lnk.total_opens || 0} <small>(${lnk.unique_opens || 0} uniq)</small></td>
                    <td><strong>${lnk.total_submissions || 0}</strong> <small>(${lnk.unique_submissions || 0} uniq)</small></td>
                    <td>
                      <button class="btn small soft" onclick="App.copyTextToClipboard('${Utils.escapeHTML(lnk.shortUrl)}', 'Enquiry link copied!')">Copy</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="4" style="text-align:center; padding:28px; color:var(--muted);">No tracking links created yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${(role === 'sales_head' || role === 'admin' || role === 'super_admin') ? `
        <div class="panel" style="margin-bottom:24px;">
          <div class="panel-header">
            <h3 class="panel-title">${role === 'super_admin' ? 'Organization Comparison' : (role === 'admin' ? 'Team & Associate Performance' : 'My Team Associate Performance')}</h3>
            <button class="btn small" onclick="App.navigate('lead_analytics')">Full Analytics →</button>
          </div>
          <div class="table-wrap">
            <table>
              ${role === 'super_admin' ? `
                <thead><tr><th>Organization</th><th>Total Leads</th><th>Visits Completed</th><th>Booked</th><th>Lost</th><th>Conv %</th></tr></thead>
                <tbody>
                  ${(overview.orgComparison || []).map(o => `
                    <tr>
                      <td><strong>${Utils.escapeHTML(o.organization_name)}</strong></td>
                      <td>${o.total_leads || 0}</td>
                      <td>${o.visits_completed || 0}</td>
                      <td>${o.booked_leads || 0}</td>
                      <td>${o.lost_leads || 0}</td>
                      <td><strong>${o.conversion_rate || 0}%</strong></td>
                    </tr>
                  `).join('') || `<tr><td colspan="6" style="text-align:center; padding:24px;">No organization data yet.</td></tr>`}
                </tbody>
              ` : `
                <thead><tr><th>Associate</th><th>Sales Head</th><th>Leads</th><th>Visits</th><th>Booked</th><th>Lost</th><th>Conv %</th></tr></thead>
                <tbody>
                  ${(overview.associatePerformance || []).map(a => `
                    <tr>
                      <td><strong>${Utils.escapeHTML(a.associate_name)}</strong></td>
                      <td>${Utils.escapeHTML(a.sales_head_name)}</td>
                      <td>${a.total_leads || 0}</td>
                      <td>${a.visits_completed || 0} / ${a.visits_scheduled || 0}</td>
                      <td>${a.booked_leads || 0}</td>
                      <td>${a.lost_leads || 0}</td>
                      <td><strong>${a.conversion_rate || 0}%</strong></td>
                    </tr>
                  `).join('') || `<tr><td colspan="7" style="text-align:center; padding:24px;">No associate lead activity yet.</td></tr>`}
                </tbody>
              `}
            </table>
          </div>
        </div>
      ` : ''}

      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Overdue Follow-ups (${overdue.length})</h3>
          <button class="btn small" onclick="App.navigate('followups')">Open Follow-ups →</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Due Date</th><th>Type</th><th>Notes</th><th>Advisor</th></tr></thead>
            <tbody>
              ${overdue.length ? overdue.slice(0, 6).map(f => `
                <tr>
                  <td><strong>${Utils.escapeHTML(f.customer_name)}</strong><small>${Utils.escapeHTML(f.customer_phone)}</small></td>
                  <td><span class="badge cancelled">${Utils.formatDate(f.follow_up_date)}</span></td>
                  <td>${Utils.escapeHTML(f.follow_up_type)}</td>
                  <td>${Utils.escapeHTML(f.notes)}</td>
                  <td>${Utils.escapeHTML(f.associate_name)}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--muted);">No overdue follow-ups!</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Failed to load Lead Dashboard: ${Utils.escapeHTML(err.message)}</div>`;
  }
};
