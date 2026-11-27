// In-App Notifications Center & Topbar Badge Helper
App.refreshNotificationBadge = async function() {
  try {
    if (!API.getToken()) return;
    const res = await API.get('/notifications', { limit: 5 });
    const badge = document.getElementById('notifBellBadge');
    if (badge) {
      const cnt = Number(res.unreadCount || 0);
      badge.textContent = cnt > 99 ? '99+' : String(cnt);
      badge.classList.toggle('hidden', cnt === 0);
    }
  } catch (_) {}
};

App.renderNotificationsCenter = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading notifications...</div>`;
  try {
    const [notifsRes, logsRes] = await Promise.all([
      API.get('/notifications', { limit: 50 }),
      API.get('/notifications/logs').catch(() => ({ logs: [] }))
    ]);
    const notifications = notifsRes.notifications || [];
    const logs = logsRes.logs || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">ALERTS & ACTIVITY</div>
          <h1 class="page-title">Notifications Center</h1>
          <p class="page-desc">Real-time lead alerts, follow-up reminders, and delivery history.</p>
        </div>
        <div class="actions">
          <button class="btn soft" onclick="App.markAllNotificationsRead()">Mark All Read ✓</button>
          <button class="btn primary" onclick="App.navigate('lead_settings')">Preferences</button>
        </div>
      </div>

      <div class="panel" style="margin-bottom:20px;">
        <div class="panel-header"><h3 class="panel-title">Inbox (${notifications.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Alert</th><th>Details</th><th>Time</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${notifications.length ? notifications.map(n => `
                <tr style="${n.is_read ? 'opacity:0.75;' : 'background:rgba(37,99,235,0.03);'}">
                  <td><strong>${Utils.escapeHTML(n.title)}</strong><small>${Utils.escapeHTML(n.event_type.replace(/_/g, ' '))}</small></td>
                  <td>${Utils.escapeHTML(n.message)}</td>
                  <td>${Utils.formatDate(n.created_at)}</td>
                  <td><span class="badge ${n.is_read ? 'active' : 'pending'}">${n.is_read ? 'Read' : 'Unread'}</span></td>
                  <td>
                    <div class="actions">
                      ${!n.is_read ? `<button class="btn small soft" onclick="App.markNotificationRead('${n.id}')">Mark Read</button>` : ''}
                      ${n.entity_type === 'leads' && n.entity_id ? `<button class="btn small primary" onclick="App.openLeadDetailModal('${n.entity_id}')">Open Lead</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="text-align:center; padding:28px; color:var(--muted);">You're all caught up! No notifications yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3 class="panel-title">Delivery Audit Logs (${logs.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Event</th><th>Channel</th><th>Status</th><th>Attempts</th><th>Time</th></tr></thead>
            <tbody>
              ${logs.length ? logs.slice(0, 25).map(lg => `
                <tr>
                  <td>${Utils.escapeHTML(lg.event_type)}</td>
                  <td><code>${Utils.escapeHTML(lg.channel)}</code></td>
                  <td><span class="badge ${lg.status === 'sent' ? 'confirmed' : (lg.status === 'failed' ? 'cancelled' : 'pending')}">${Utils.escapeHTML(lg.status)}</span></td>
                  <td>${lg.attempts || 0}/${lg.max_attempts || 3}</td>
                  <td>${Utils.formatDate(lg.created_at)}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No delivery logs yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
    App.refreshNotificationBadge();
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.markNotificationRead = async function(id) {
  await API.post(`/notifications/${id}/read`, {});
  App.renderNotificationsCenter(document.getElementById('pageContent'));
};

App.markAllNotificationsRead = async function() {
  await API.post('/notifications/read-all', {});
  Utils.toast('All notifications marked read.');
  App.renderNotificationsCenter(document.getElementById('pageContent'));
};
