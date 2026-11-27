// Lead Settings & Notification Preferences Component
App.renderLeadSettings = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading Lead Settings...</div>`;
  try {
    const user = this.currentUser || {};
    const role = user.role || 'sales_associate';
    const isAdmin = role === 'admin' || role === 'super_admin';

    const [settingsRes, prefsRes] = await Promise.all([
      API.get('/lead-settings').catch(() => ({ settings: {} })),
      API.get('/notifications/preferences').catch(() => ({ preferences: {} }))
    ]);
    const s = settingsRes.settings || {};
    const p = prefsRes.preferences || { in_app_enabled: 1, email_enabled: 1, events: {} };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">CONFIGURATION</div>
          <h1 class="page-title">Lead Settings & Notifications</h1>
          <p class="page-desc">Configure lead attribution policies, campaign toggles, timezone for overdue follow-ups, and personal notification preferences.</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:20px;">
        ${isAdmin ? `
          <div class="panel" style="padding:20px;">
            <h3 class="panel-title" style="margin-bottom:14px;">Organization Lead Management Rules</h3>
            <form onsubmit="App.handleSaveLeadSettings(event)">
              <div style="margin-bottom:12px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" id="lsCampaignsEnabled" ${s.campaigns_enabled !== 0 ? 'checked' : ''}>
                  <span>Enable Campaigns in Lead Generation & Reports</span>
                </label>
              </div>
              <div style="margin-bottom:12px;">
                <label>Admin Link Assignment Policy (when Admin generates link)</label>
                <select id="lsAdminPolicy">
                  <option value="unassigned" ${s.admin_link_assignment_policy === 'unassigned' ? 'selected' : ''}>Explicit Unassigned Org Pool (Default)</option>
                  <option value="round_robin" ${s.admin_link_assignment_policy === 'round_robin' ? 'selected' : ''}>Auto Round-Robin to Active Associates</option>
                </select>
              </div>
              <div style="margin-bottom:12px;">
                <label>Sales Head Link Assignment Policy</label>
                <select id="lsHeadPolicy">
                  <option value="team_pool" ${s.sales_head_link_assignment_policy === 'team_pool' ? 'selected' : ''}>Sales Head Team Pool (Default)</option>
                  <option value="round_robin" ${s.sales_head_link_assignment_policy === 'round_robin' ? 'selected' : ''}>Auto Round-Robin Within Team</option>
                </select>
              </div>
              <div style="margin-bottom:12px;">
                <label>Duplicate Enquiry Policy</label>
                <select id="lsDupPolicy">
                  <option value="link_existing_customer_preserve_owner" ${s.duplicate_policy === 'link_existing_customer_preserve_owner' ? 'selected' : ''}>Link Existing Customer & Preserve Original Owner</option>
                  <option value="flag_for_review" ${s.duplicate_policy === 'flag_for_review' ? 'selected' : ''}>Flag All Duplicates for Review</option>
                </select>
              </div>
              <div style="margin-bottom:12px;">
                <label>Timezone (for Follow-up Overdue Calculation)</label>
                <select id="lsTimezone">
                  <option value="Asia/Kolkata" ${s.timezone === 'Asia/Kolkata' ? 'selected' : ''}>Asia/Kolkata (IST)</option>
                  <option value="Asia/Dubai" ${s.timezone === 'Asia/Dubai' ? 'selected' : ''}>Asia/Dubai (GST)</option>
                  <option value="UTC" ${s.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                </select>
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" id="lsStrictStages" ${s.strict_stage_transitions !== 0 ? 'checked' : ''}>
                  <span>Enforce Valid Pipeline Stage Transitions</span>
                </label>
              </div>
              <button type="submit" class="btn primary">Save Organization Lead Settings</button>
            </form>
          </div>
        ` : ''}

        <div class="panel" style="padding:20px;">
          <h3 class="panel-title" style="margin-bottom:14px;">My Notification Preferences</h3>
          <form onsubmit="App.handleSaveNotificationPrefs(event)">
            <div style="margin-bottom:10px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="npInApp" ${p.in_app_enabled ? 'checked' : ''}>
                <span>Enable In-App Notifications</span>
              </label>
            </div>
            <div style="margin-bottom:14px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="npEmail" ${p.email_enabled ? 'checked' : ''}>
                <span>Enable Email Notifications (when SMTP configured)</span>
              </label>
            </div>
            <div style="border-top:1px solid var(--line); padding-top:12px; margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              ${[
                ['new_enquiry', 'New Enquiry'],
                ['lead_assigned', 'Lead Assigned'],
                ['lead_reassigned', 'Lead Reassigned'],
                ['followup_due', 'Follow-up Due'],
                ['overdue_followup', 'Overdue Follow-up'],
                ['site_visit_scheduled', 'Visit Scheduled'],
                ['site_visit_completed', 'Visit Completed'],
                ['lead_converted', 'Lead Converted'],
                ['lead_marked_lost', 'Lead Marked Lost']
              ].map(([k, lbl]) => `
                <label style="display:flex; align-items:center; gap:6px; font-size:12.5px;">
                  <input type="checkbox" class="np-event-cb" data-event="${k}" ${p.events?.[k] !== false ? 'checked' : ''}>
                  <span>${lbl}</span>
                </label>
              `).join('')}
            </div>
            <button type="submit" class="btn primary">Save Notification Preferences</button>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.handleSaveLeadSettings = async function(e) {
  e.preventDefault();
  try {
    await API.put('/lead-settings', {
      campaigns_enabled: document.getElementById('lsCampaignsEnabled').checked,
      admin_link_assignment_policy: document.getElementById('lsAdminPolicy').value,
      sales_head_link_assignment_policy: document.getElementById('lsHeadPolicy').value,
      duplicate_policy: document.getElementById('lsDupPolicy').value,
      timezone: document.getElementById('lsTimezone').value,
      strict_stage_transitions: document.getElementById('lsStrictStages').checked
    });
    Utils.toast('Organization lead settings saved!');
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.handleSaveNotificationPrefs = async function(e) {
  e.preventDefault();
  try {
    const events = {};
    document.querySelectorAll('.np-event-cb').forEach(cb => {
      events[cb.dataset.event] = cb.checked;
    });
    await API.put('/notifications/preferences', {
      in_app_enabled: document.getElementById('npInApp').checked,
      email_enabled: document.getElementById('npEmail').checked,
      events
    });
    Utils.toast('Notification preferences saved!');
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
