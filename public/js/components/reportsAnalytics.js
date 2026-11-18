// Reports & Conversion Analytics Component
App.renderReportsAnalytics = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Computing conversion analytics...</div>`;

  try {
    const data = await API.get('/reports/dashboard');
    const m = data.metrics || {};
    const associates = data.associatePerformance || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">INTELLIGENCE & PERFORMANCE</div>
          <h1 class="page-title">Reports & Conversion Analytics</h1>
          <p class="page-desc">Comprehensive conversion funnel from digital invitation generation to confirmed walkthrough and closed booking.</p>
        </div>
        <div class="actions">
          <a href="/api/reports/export/performance" class="btn primary" target="_blank">
            Export Performance CSV ↓
          </a>
        </div>
      </div>

      <!-- Conversion Funnel Rates -->
      <div class="kpi-grid">
        <div class="kpi-card purple">
          <div class="kpi-label">Visit Confirmation Rate</div>
          <div class="kpi-value">${m.confirmationRate}%</div>
          <div class="kpi-sub">
            ${m.confirmedVisits} confirmed out of ${m.totalInvitations} total invitations
          </div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-label">Visit Completion Rate</div>
          <div class="kpi-value">${m.completionRate}%</div>
          <div class="kpi-sub">
            ${m.completedVisits} attended of ${m.totalVisits - m.cancelledVisits} scheduled visits
          </div>
        </div>

        <div class="kpi-card gold">
          <div class="kpi-label">Visit-to-Booking Rate</div>
          <div class="kpi-value">${m.bookingConversionRate}%</div>
          <div class="kpi-sub">
            ${m.totalBookings} booked from ${m.completedVisits} completed walkthroughs
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">No Show Rate</div>
          <div class="kpi-value" style="color:var(--red);">
            ${m.totalVisits > 0 ? ((m.noShowVisits / m.totalVisits) * 100).toFixed(1) : 0}%
          </div>
          <div class="kpi-sub">${m.noShowVisits} missed client visits</div>
        </div>
      </div>

      <!-- Team Associate Comparison Table -->
      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Associate Productivity & Conversion Leaderboard</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sales Associate</th>
                <th>Managed Customers</th>
                <th>Invitations Created</th>
                <th>Completed Site Visits</th>
                <th>Bookings Converted</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              ${associates.length ? associates.map(a => {
                const conv = a.completed_visits > 0 ? ((a.bookings_count / a.completed_visits) * 100).toFixed(1) : '0.0';
                return `
                  <tr>
                    <td>
                      <strong>${Utils.escapeHTML(a.name)}</strong>
                      <small>${Utils.escapeHTML(a.email)}</small>
                    </td>
                    <td>${a.customers_count}</td>
                    <td>${a.invitations_count}</td>
                    <td>
                      <strong style="color:var(--green);">${a.completed_visits}</strong>
                    </td>
                    <td>
                      <strong style="color:var(--purple);">${a.bookings_count}</strong>
                    </td>
                    <td>
                      <span class="badge ${Number(conv) > 30 ? 'confirmed' : 'pending'}">${conv}%</span>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="6" style="text-align:center; padding:30px; color:var(--muted);">No associate records available.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};
