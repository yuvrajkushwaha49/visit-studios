// Super Admin View Component
App.renderOrganizations = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading organizations...</div>`;

  try {
    const data = await API.get('/organizations');
    const orgs = data.organizations || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">ENTERPRISE SAAS</div>
          <h1 class="page-title">Real Estate Organizations</h1>
          <p class="page-desc">Manage tenant enterprises, administrator credentials, and subscription status.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openCreateOrgModal()">
            + Register Organization
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Slug</th>
                <th>Admins</th>
                <th>Sales Team</th>
                <th>Customers</th>
                <th>Visits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orgs.length ? orgs.map(o => `
                <tr>
                  <td>
                    <strong>${Utils.escapeHTML(o.name)}</strong>
                    <small>${Utils.escapeHTML(o.email || '')} · ${Utils.escapeHTML(o.phone || '')}</small>
                  </td>
                  <td><code>${Utils.escapeHTML(o.slug)}</code></td>
                  <td>${o.total_admins || 0}</td>
                  <td>${(o.total_sales_heads || 0) + (o.total_associates || 0)} members</td>
                  <td>${o.total_customers || 0}</td>
                  <td>${o.total_visits || 0}</td>
                  <td>
                    <span class="badge ${o.status === 'active' ? 'active' : 'inactive'}">
                      ${o.status}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn small soft" onclick="App.toggleOrgStatus('${o.id}', '${o.status === 'active' ? 'inactive' : 'active'}')">
                        ${o.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button class="btn small" onclick="App.openEditOrgModal('${o.id}')">
                        Edit
                      </button>
                      <button class="btn small danger" onclick="App.deleteOrg('${o.id}', '${Utils.escapeHTML(o.name)}')">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="8" style="text-align:center; padding:30px; color:var(--muted);">No organizations found.</td></tr>
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

App.openCreateOrgModal = function() {
  const html = `
    <h3 class="modal-title">Register New Real Estate Organization</h3>
    <form onsubmit="App.handleCreateOrgSubmit(event)">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label>Organization Name *</label>
          <input id="orgName" required placeholder="e.g. Skyline Luxury Realty">
        </div>
        <div>
          <label>Unique URL Slug *</label>
          <input id="orgSlug" required placeholder="e.g. skyline-luxury">
        </div>
        <div>
          <label>Primary Phone</label>
          <input id="orgPhone" placeholder="+91 ...">
        </div>
        <div>
          <label>Official Email</label>
          <input id="orgEmail" type="email" placeholder="contact@skylinerealty.com">
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label>Headquarters Address</label>
        <input id="orgAddress" placeholder="City, State">
      </div>

      <h4 style="font-size:12px; font-weight:700; color:var(--purple); margin:16px 0 10px; text-transform:uppercase;">Primary Administrator Account</h4>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;">
        <div>
          <label>Admin Name *</label>
          <input id="orgAdminName" required placeholder="Administrator Full Name">
        </div>
        <div>
          <label>Admin Email *</label>
          <input id="orgAdminEmail" type="email" required placeholder="admin@skylinerealty.com">
        </div>
        <div style="grid-column:1/-1;">
          <label>Admin Initial Password *</label>
          <input id="orgAdminPass" type="password" required value="Password@123">
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Create Organization & Admin</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleCreateOrgSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('orgName').value.trim(),
    slug: document.getElementById('orgSlug').value.trim(),
    phone: document.getElementById('orgPhone').value.trim(),
    email: document.getElementById('orgEmail').value.trim(),
    address: document.getElementById('orgAddress').value.trim(),
    adminName: document.getElementById('orgAdminName').value.trim(),
    adminEmail: document.getElementById('orgAdminEmail').value.trim(),
    adminPassword: document.getElementById('orgAdminPass').value
  };

  try {
    const res = await API.post('/organizations', payload);
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderOrganizations(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.toggleOrgStatus = async function(id, status) {
  try {
    await API.patch(`/organizations/${id}/status`, { status });
    Utils.toast(`Organization status changed to ${status}`);
    App.renderOrganizations(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openEditOrgModal = async function(orgId) {
  Utils.showModal('<div style="text-align:center; padding:30px; color:var(--muted);">Loading organization...</div>');
  try {
    const data = await API.get(`/organizations/${orgId}`);
    const o = data.organization;

    const html = `
      <h3 class="modal-title">Edit Organization Details</h3>
      <p class="modal-desc">Update corporate agency settings for ${Utils.escapeHTML(o.name)}.</p>
      <form onsubmit="App.handleEditOrgSubmit(event, '${orgId}')">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Organization Name *</label>
            <input id="editOrgName" required value="${Utils.escapeHTML(o.name || '')}">
          </div>
          <div>
            <label>Unique URL Slug *</label>
            <input id="editOrgSlug" required value="${Utils.escapeHTML(o.slug || '')}">
          </div>
          <div>
            <label>Primary Phone</label>
            <input id="editOrgPhone" value="${Utils.escapeHTML(o.phone || '')}">
          </div>
          <div>
            <label>Official Email</label>
            <input id="editOrgEmail" type="email" value="${Utils.escapeHTML(o.email || '')}">
          </div>
        </div>
        <div style="margin-bottom:16px;">
          <label>Headquarters Address</label>
          <input id="editOrgAddress" value="${Utils.escapeHTML(o.address || '')}">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Save Changes</button>
        </div>
      </form>
    `;
    Utils.showModal(html);
  } catch (err) {
    Utils.showModal(`<div style="padding:20px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`);
  }
};

App.handleEditOrgSubmit = async function(e, orgId) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('editOrgName').value.trim(),
    slug: document.getElementById('editOrgSlug').value.trim(),
    phone: document.getElementById('editOrgPhone').value.trim(),
    email: document.getElementById('editOrgEmail').value.trim(),
    address: document.getElementById('editOrgAddress').value.trim()
  };

  try {
    await API.put(`/organizations/${orgId}`, payload);
    Utils.toast('Organization updated successfully!');
    Utils.closeModal();
    App.renderOrganizations(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteOrg = async function(orgId, name) {
  if (!confirm(`Are you sure you want to permanently delete organization "${name}"? All associated data will be removed.`)) return;
  try {
    await API.delete(`/organizations/${orgId}`);
    Utils.toast('Organization deleted successfully');
    App.renderOrganizations(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Activity Logs Component
App.renderActivityLogs = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading audit logs...</div>`;

  try {
    const data = await API.get('/organizations/activity-logs');
    const logs = data.logs || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">AUDIT & COMPLIANCE</div>
          <h1 class="page-title">System Activity Logs</h1>
          <p class="page-desc">Immutable audit trails of staff authentication, invitation dispatch, and check-in events.</p>
        </div>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor User</th>
                <th>Entity Target</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length ? logs.map(l => `
                <tr>
                  <td>
                    <code style="color:var(--purple); font-weight:700;">${Utils.escapeHTML(l.action)}</code>
                  </td>
                  <td>
                    <strong>${Utils.escapeHTML(l.user_name || 'System')}</strong>
                    <small>${Utils.escapeHTML(l.user_role || '')}</small>
                  </td>
                  <td>
                    <code>${Utils.escapeHTML(l.entity_type)}</code>
                  </td>
                  <td style="max-width:300px; font-size:11.5px; color:var(--muted); line-height:1.4;">
                    ${Utils.escapeHTML(l.details || '')}
                  </td>
                  <td><small>${Utils.escapeHTML(l.ip_address || '127.0.0.1')}</small></td>
                  <td><small>${Utils.formatDate(l.created_at)} ${l.created_at?.slice(11, 16) || ''}</small></td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" style="text-align:center; padding:30px; color:var(--muted);">No logs recorded.</td></tr>
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
