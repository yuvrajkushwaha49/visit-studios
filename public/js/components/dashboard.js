// Dashboard View Component
App.renderDashboard = async function(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px; color: var(--muted);">
      Loading live dashboard metrics...
    </div>
  `;

  try {
    const data = await API.get('/reports/dashboard');
    const m = data.metrics || {};
    const role = this.currentUser.role;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">${role.replace('_', ' ').toUpperCase()} DASHBOARD</div>
          <h1 class="page-title">Welcome back, ${Utils.escapeHTML(this.currentUser.name)}</h1>
          <p class="page-desc">Live operational performance and site visit attendance tracking.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.navigate('create_invitation')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4v16m8-8H4"/></svg>
            Create Invitation
          </button>
          <button class="btn soft" onclick="App.openCheckInModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4v1m6 11h1M4 12h1m14 0h1m-7 7v1M6.34 6.34l.7.7m10.92 10.92l.7.7M6.34 17.66l.7-.7m10.92-10.92l.7-.7"/></svg>
            QR Check-in
          </button>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="kpi-grid">
        <div class="kpi-card purple">
          <div class="kpi-label">Total Invitations</div>
          <div class="kpi-value">${m.totalInvitations || 0}</div>
          <div class="kpi-sub">Issued digital property invites</div>
        </div>

        <div class="kpi-card gold">
          <div class="kpi-label">Confirmed Visits</div>
          <div class="kpi-value">${m.confirmedVisits || 0}</div>
          <div class="kpi-sub">
            <span style="color:var(--green); font-weight:600;">${m.confirmationRate}%</span> confirmation rate
          </div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-label">Completed Visits</div>
          <div class="kpi-value">${m.completedVisits || 0}</div>
          <div class="kpi-sub">
            <span style="color:var(--green); font-weight:600;">${m.completionRate}%</span> attendance rate
          </div>
        </div>

        <div class="kpi-card blue">
          <div class="kpi-label">Bookings Closed</div>
          <div class="kpi-value">${m.totalBookings || 0}</div>
          <div class="kpi-sub">
            <span style="color:var(--purple); font-weight:600;">${m.bookingConversionRate}%</span> visit conversion
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Pending Follow-ups</div>
          <div class="kpi-value" style="color: var(--amber);">${m.pendingFollowups || 0}</div>
          <div class="kpi-sub">Pipeline tasks needing action</div>
        </div>
      </div>

      <!-- Quick Operational Sections -->
      <div style="display: grid; grid-template-columns: minmax(320px, 1.2fr) minmax(300px, 0.8fr); gap: 24px;">
        <!-- Upcoming Visits Table -->
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Upcoming Scheduled Site Visits</h3>
            <button class="btn small" onclick="App.navigate('visits')">View All Visits →</button>
          </div>
          <div class="table-wrap">
            ${(data.upcomingVisits && data.upcomingVisits.length) ? `
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Residence</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.upcomingVisits.map(v => `
                    <tr>
                      <td>
                        <strong>${Utils.escapeHTML(v.customer_name)}</strong>
                        <small>${Utils.escapeHTML(v.customer_phone)}</small>
                      </td>
                      <td>
                        ${Utils.escapeHTML(v.project_name)}
                        <small>Advisor: ${Utils.escapeHTML(v.associate_name)}</small>
                      </td>
                      <td>
                        <strong>${Utils.formatDate(v.scheduled_date)}</strong>
                        <small>${Utils.formatTime(v.scheduled_time)}</small>
                      </td>
                      <td>
                        <span class="badge ${v.status}">${v.status.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <button class="btn small soft" onclick="App.openCheckInModal('${v.id}')">
                          Check-in
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="text-align:center; padding: 40px; color: var(--muted);">
                No upcoming visits scheduled for today or tomorrow.
                <br>
                <button class="btn small primary" style="margin-top:12px;" onclick="App.navigate('create_invitation')">Create Invitation +</button>
              </div>
            `}
          </div>
        </div>

        <!-- Associate Leaderboard (Admins & Sales Heads) or Quick Actions (Associates) -->
        ${data.associatePerformance && data.associatePerformance.length ? `
          <div class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Sales Associate Performance</h3>
              <button class="btn small" onclick="App.navigate('reports')">Full Report →</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Associate</th>
                    <th>Invites</th>
                    <th>Completed</th>
                    <th>Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.associatePerformance.map(a => `
                    <tr>
                      <td>
                        <strong>${Utils.escapeHTML(a.name)}</strong>
                        <small>${Utils.escapeHTML(a.email)}</small>
                      </td>
                      <td>${a.invitations_count}</td>
                      <td>
                        <strong style="color:var(--green);">${a.completed_visits}</strong>
                      </td>
                      <td>
                        <strong style="color:var(--purple);">${a.bookings_count}</strong>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <div class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Advisor Quick Toolkit</h3>
            </div>
            <div style="padding: 20px;">
              <p style="color:var(--muted); font-size:12px; margin-bottom:16px;">
                Schedule client property visits, share verified visit passes via WhatsApp, and track employee field visits in real-time.
              </p>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <button class="btn primary" style="justify-content:flex-start;" onclick="App.navigate('create_invitation')">
                  + Create New Digital Property Invitation
                </button>
                <button class="btn soft" style="justify-content:flex-start;" onclick="App.navigate('customers')">
                  + Register New Customer Lead
                </button>
                <button class="btn soft" style="justify-content:flex-start;" onclick="App.navigate('followups')">
                  + Schedule Customer Follow-up
                </button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="panel" style="padding: 30px; text-align:center;">
        <h3 style="color:var(--red);">Failed to load dashboard metrics</h3>
        <p style="color:var(--muted); margin: 8px 0 16px;">${Utils.escapeHTML(err.message)}</p>
        <button class="btn primary" onclick="App.navigate('dashboard')">Retry</button>
      </div>
    `;
  }
};

// Super Admin Global Overview Dashboard
App.renderSuperAdminDashboard = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading platform overview...</div>`;

  try {
    const data = await API.get('/organizations/global-kpis');
    const k = data.kpis || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">GLOBAL SUPER ADMIN PORTAL</div>
          <h1 class="page-title">Platform Operations Overview</h1>
          <p class="page-desc">System-wide monitoring across all real estate organizations.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openCreateOrgModal()">
            + Register Organization
          </button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card purple">
          <div class="kpi-label">Active Organizations</div>
          <div class="kpi-value">${k.totalOrganizations || 0}</div>
          <div class="kpi-sub">SaaS enterprise tenants</div>
        </div>

        <div class="kpi-card gold">
          <div class="kpi-label">Total Admins</div>
          <div class="kpi-value">${k.totalAdmins || 0}</div>
          <div class="kpi-sub">Business administrators</div>
        </div>

        <div class="kpi-card blue">
          <div class="kpi-label">Sales Team Members</div>
          <div class="kpi-value">${(k.totalSalesHeads || 0) + (k.totalSalesAssociates || 0)}</div>
          <div class="kpi-sub">${k.totalSalesHeads || 0} Heads · ${k.totalSalesAssociates || 0} Associates</div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-label">Total Site Visits</div>
          <div class="kpi-value">${k.totalSiteVisits || 0}</div>
          <div class="kpi-sub">${k.completedVisits || 0} visits completed</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Quick Actions & Platform Management</h3>
        </div>
        <div style="padding: 24px; display:flex; gap:16px; flex-wrap:wrap;">
          <button class="btn primary" onclick="App.navigate('organizations')">
            Manage Real Estate Organizations
          </button>
          <button class="btn soft" onclick="App.navigate('activity_logs')">
            View Global Security & Audit Logs
          </button>
          <button class="btn" onclick="App.resetSeed()">
            Reset Demo Database to Initial State
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};
