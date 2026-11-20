// Sales Team Management Component with Full CRUD
App.renderTeamManagement = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading sales team...</div>`;

  try {
    const data = await API.get('/users');
    const users = data.users || [];
    if (!this.currentUser) {
      this.currentUser = (typeof API !== 'undefined' && API.getUser ? API.getUser() : null) || {};
    }
    const role = this.currentUser.role || 'admin';

    this.cache = this.cache || {};
    this.cache.users = users;
    const salesHeads = users.filter(u => u.role === 'sales_head');
    const associates = users.filter(u => u.role === 'sales_associate');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">ORGANIZATION</div>
          <h1 class="page-title">Sales Team</h1>
          <p class="page-desc">Structure & members: Admin manages Sales Heads; Sales Heads manage their designated Sales Associates.</p>
        </div>
        <div class="actions">
          ${role === 'admin' ? `
            <button class="btn primary" onclick="App.openAddUserModal('sales_head')">
              + Add Sales Head
            </button>
            <button class="btn soft" onclick="App.openImportTeamModal()" style="color:#2563eb; font-weight:600; border-color:#93c5fd; background:#eff6ff;">
              📊 Import Team (Excel)
            </button>
            <button class="btn soft" onclick="App.openBroadcastCredentialsModal()" style="color:#059669; font-weight:600; border-color:#a7f3d0; background:#ecfdf5;">
              ✉ Email Credentials (Bulk)
            </button>
          ` : ''}
          <button class="btn soft" onclick="App.openAddUserModal('sales_associate')">
            + Add Sales Associate
          </button>
        </div>
      </div>

      <!-- Sales Heads Section (Admins) -->
      ${role === 'admin' ? `
        <div class="panel" style="margin-bottom: 28px;">
          <div class="panel-header">
            <h3 class="panel-title">Sales Heads / Team Leaders (${salesHeads.length})</h3>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sales Head</th>
                  <th>Email & Phone</th>
                  <th>Direct Associates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${salesHeads.length ? salesHeads.map(sh => {
                  const directCount = associates.filter(a => a.sales_head_id === sh.id).length;
                  return `
                    <tr>
                      <td>
                        <strong>${Utils.escapeHTML(sh.name)}</strong>
                      </td>
                      <td>
                        ${Utils.escapeHTML(sh.email)}
                        <small>${Utils.escapeHTML(sh.phone || 'No phone')}</small>
                      </td>
                      <td>
                        <span class="badge completed">${directCount} Associates</span>
                      </td>
                      <td>
                        <span class="badge active">${sh.status}</span>
                      </td>
                      <td>
                        <div class="actions">
                          <button class="btn small soft" onclick="App.sendCredentialsToUser('${sh.id}', '${Utils.escapeHTML(sh.name)}', '${Utils.escapeHTML(sh.email)}', '${Utils.escapeHTML(sh.phone || '')}', 'Sales Head')" title="Send Login ID & Password via Email" style="color:#059669; border-color:#a7f3d0; background:#f0fdf4;">
                            ✉ Send Login
                          </button>
                          <button class="btn small soft" onclick="App.openEditUserModal('${sh.id}')">
                            Edit
                          </button>
                          <button class="btn small danger" onclick="App.deleteUser('${sh.id}', '${Utils.escapeHTML(sh.name)}')">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No Sales Heads created yet.</td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Sales Associates Section -->
      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Sales Associates (${associates.length})</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Associate</th>
                <th>Contact</th>
                <th>Reporting Sales Head</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${associates.length ? associates.map(a => `
                <tr>
                  <td>
                    <strong>${Utils.escapeHTML(a.name)}</strong>
                  </td>
                  <td>
                    ${Utils.escapeHTML(a.email)}
                    <small>${Utils.escapeHTML(a.phone || '')}</small>
                  </td>
                  <td>
                    <span style="font-weight:600; color:var(--purple);">
                      ${Utils.escapeHTML(a.sales_head_name || 'Direct / Unassigned')}
                    </span>
                  </td>
                  <td>
                    <span class="badge active">${a.status}</span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn small soft" onclick="App.sendCredentialsToUser('${a.id}', '${Utils.escapeHTML(a.name)}', '${Utils.escapeHTML(a.email)}', '${Utils.escapeHTML(a.phone || '')}', 'Sales Associate')" title="Send Login ID & Password via Email" style="color:#059669; border-color:#a7f3d0; background:#f0fdf4;">
                        ✉ Send Login
                      </button>
                      <button class="btn small soft" onclick="App.openEditUserModal('${a.id}')">
                        Edit
                      </button>
                      ${role === 'admin' ? `
                        <button class="btn small" onclick="App.openAssignHeadModal('${a.id}', '${Utils.escapeHTML(a.name)}')">
                          Assign Head
                        </button>
                        <button class="btn small danger" onclick="App.deleteUser('${a.id}', '${Utils.escapeHTML(a.name)}')">
                          Delete
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No Sales Associates found.</td></tr>
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

// Add User Modal
App.openAddUserModal = async function(defaultRole = 'sales_associate') {
  const headsRes = await API.get('/users/sales-heads');
  const salesHeads = headsRes.salesHeads || [];

  const html = `
    <h3 class="modal-title">Create New Team Member</h3>
    <form onsubmit="App.handleAddUserSubmit(event)">
      <div style="margin-bottom:14px;">
        <label>Account Role *</label>
        <select id="addUserRole" onchange="App.onAddUserRoleChange(this.value)">
          ${this.currentUser.role === 'admin' ? `<option value="sales_head" ${defaultRole === 'sales_head' ? 'selected' : ''}>Sales Head</option>` : ''}
          <option value="sales_associate" ${defaultRole === 'sales_associate' ? 'selected' : ''}>Sales Associate</option>
        </select>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        <div>
          <label>Full Name *</label>
          <input id="addUserName" required placeholder="e.g. Rahul Sharma">
        </div>
        <div>
          <label>Email Address *</label>
          <input id="addUserEmail" type="email" required placeholder="rahul@company.com">
        </div>
        <div>
          <label>Mobile Number</label>
          <input id="addUserPhone" type="tel" placeholder="+91 98100 ...">
        </div>
        <div>
          <label>Temporary Password *</label>
          <input id="addUserPassword" type="password" required value="Password@123">
        </div>
      </div>

      <div id="addAssociateHeadRow" style="margin-bottom:18px; ${defaultRole === 'sales_head' ? 'display:none;' : ''}">
        <label>Reporting Sales Head</label>
        <select id="addUserHeadSelect">
          <option value="">-- No Direct Sales Head --</option>
          ${salesHeads.map(h => `<option value="${h.id}">${Utils.escapeHTML(h.name)} (${Utils.escapeHTML(h.email)})</option>`).join('')}
        </select>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Create Account</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.onAddUserRoleChange = function(role) {
  const row = document.getElementById('addAssociateHeadRow');
  if (row) {
    row.style.display = role === 'sales_head' ? 'none' : 'block';
  }
};

App.handleAddUserSubmit = async function(e) {
  e.preventDefault();
  const role = document.getElementById('addUserRole').value;
  const payload = {
    role,
    name: document.getElementById('addUserName').value.trim(),
    email: document.getElementById('addUserEmail').value.trim(),
    phone: document.getElementById('addUserPhone').value.trim(),
    password: document.getElementById('addUserPassword').value,
    sales_head_id: role === 'sales_associate' ? document.getElementById('addUserHeadSelect').value : null
  };

  try {
    const res = await API.post('/users', payload);
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderTeamManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Edit User Modal
App.openEditUserModal = async function(userId) {
  let user = (App.cache?.users || []).find(u => u.id === userId);
  if (!user) {
    try {
      const data = await API.get('/users');
      App.cache = App.cache || {};
      App.cache.users = data.users || [];
      user = App.cache.users.find(u => u.id === userId);
    } catch (e) {}
  }
  if (!user) {
    Utils.toast('Employee record not found');
    return;
  }

  const headsRes = await API.get('/users/sales-heads');
  const salesHeads = headsRes.salesHeads || [];

  const html = `
    <h3 class="modal-title">Edit Team Member</h3>
    <form onsubmit="App.handleEditUserSubmit(event, '${user.id}')">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        <div>
          <label>Full Name *</label>
          <input id="editUserName" required value="${Utils.escapeHTML(user.name)}">
        </div>
        <div>
          <label>Email Address *</label>
          <input id="editUserEmail" type="email" required value="${Utils.escapeHTML(user.email)}">
        </div>
        <div>
          <label>Mobile Number *</label>
          <input id="editUserPhone" type="tel" required placeholder="e.g. 9876543210" value="${Utils.escapeHTML(user.phone || '')}">
          <small style="color:#059669; font-size:11px; display:block; margin-top:3px; font-weight:600;">
            🔑 Mobile number automatically syncs as the login password.
          </small>
        </div>
        <div>
          <label>Account Status</label>
          <select id="editUserStatus">
            <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label>Custom Password Override (Optional)</label>
        <input id="editUserPassword" type="text" placeholder="Leave empty to use mobile number as password">
        <small style="color:var(--muted); font-size:11px; display:block; margin-top:3px;">
          Leave empty to automatically set password to the mobile number above.
        </small>
      </div>

      ${user.role === 'sales_associate' ? `
        <div style="margin-bottom:18px;">
          <label>Reporting Sales Head</label>
          <select id="editUserHeadSelect">
            <option value="">-- Direct / No Sales Head --</option>
            ${salesHeads.map(h => `
              <option value="${h.id}" ${h.id === user.sales_head_id ? 'selected' : ''}>
                ${Utils.escapeHTML(h.name)}
              </option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Changes</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleEditUserSubmit = async function(e, userId) {
  e.preventDefault();
  const password = document.getElementById('editUserPassword').value;
  const phone = document.getElementById('editUserPhone').value.trim();
  const payload = {
    name: document.getElementById('editUserName').value.trim(),
    email: document.getElementById('editUserEmail').value.trim(),
    phone: phone,
    status: document.getElementById('editUserStatus').value,
    sales_head_id: document.getElementById('editUserHeadSelect')?.value || null
  };
  if (password && password.trim()) {
    payload.password = password.trim();
  }

  try {
    const res = await API.put(`/users/${userId}`, payload);
    Utils.toast(res.message || 'User updated successfully');
    Utils.closeModal();

    const container = document.getElementById('pageContent');
    if (container && typeof App.renderTeamManagement === 'function') {
      await App.renderTeamManagement(container);
    }
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteUser = async function(userId, userName) {
  if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return;
  try {
    const res = await API.delete(`/users/${userId}`);
    Utils.toast(res.message);
    App.renderTeamManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Reassign Sales Head Modal
App.openAssignHeadModal = async function(userId, associateName) {
  const headsRes = await API.get('/users/sales-heads');
  const salesHeads = headsRes.salesHeads || [];

  const html = `
    <h3 class="modal-title">Reassign Sales Associate</h3>
    <p class="modal-desc">Assign ${Utils.escapeHTML(associateName)} to a Sales Head. All associated customer records and invitations will follow this hierarchy.</p>

    <form onsubmit="App.handleAssignHeadSubmit(event, '${userId}')">
      <div style="margin-bottom:18px;">
        <label>Select Sales Head</label>
        <select id="reassignHeadSelect" required>
          ${salesHeads.map(h => `<option value="${h.id}">${Utils.escapeHTML(h.name)}</option>`).join('')}
        </select>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Assignment</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleAssignHeadSubmit = async function(e, userId) {
  e.preventDefault();
  const sales_head_id = document.getElementById('reassignHeadSelect').value;

  try {
    const res = await API.patch(`/users/${userId}/assign-head`, { sales_head_id });
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderTeamManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Import Sales Team from Excel Modal
App.openImportTeamModal = function() {
  const html = `
    <h3 class="modal-title">Import Sales Team from Excel</h3>
    <p class="modal-desc">Upload an Excel (.xlsx, .xls) or CSV file with columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Phone</strong>, and <strong>(Head Name)</strong>.</p>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:16px; font-size:12px; line-height:1.6;">
      <div style="font-weight:700; color:#1e293b; margin-bottom:4px;">📋 Excel Rules & Auto-Credentials:</div>
      <ul style="margin:0; padding-left:18px; color:#475569;">
        <li><strong>Username:</strong> Will be set to the user's <strong>Email</strong>.</li>
        <li><strong>Password:</strong> Will be automatically set to the user's <strong>Phone Number</strong>.</li>
        <li><strong>Sales Head vs Associate:</strong> Employees with no Head Name (or where Head matches themselves) become <strong>Sales Heads</strong>. Others become <strong>Sales Associates</strong> mapped to their designated Head.</li>
      </ul>
    </div>

    <form onsubmit="App.handleImportTeamSubmit(event)">
      <div style="margin-bottom:18px;">
        <label>Select Excel / CSV File *</label>
        <input type="file" id="teamExcelFile" accept=".xlsx, .xls, .csv" required style="padding:8px; border:1px dashed #cbd5e1; border-radius:8px; width:100%; background:#ffffff;">
      </div>

      <div id="importTeamProgress" class="hidden" style="margin-bottom:14px; padding:10px; background:#eff6ff; border-radius:8px; color:#1d4ed8; font-size:12px; text-align:center;">
        Processing sheet and generating encrypted employee credentials...
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" id="btnSubmitTeamImport" class="btn primary">Upload & Create Team</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleImportTeamSubmit = async function(e) {
  e.preventDefault();
  const fileInput = document.getElementById('teamExcelFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    return Utils.toast('Please select an Excel file');
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  const btn = document.getElementById('btnSubmitTeamImport');
  const progress = document.getElementById('importTeamProgress');
  if (btn) btn.disabled = true;
  if (progress) progress.classList.remove('hidden');

  try {
    const res = await API.upload('/users/import-excel', formData);
    Utils.toast(res.message || 'Team imported successfully!');
    Utils.closeModal();
    App.renderTeamManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Import failed: ' + err.message);
    if (btn) btn.disabled = false;
    if (progress) progress.classList.add('hidden');
  }
};

// Send Credentials to a Single User Modal
App.sendCredentialsToUser = function(userId, userName, userEmail, userPhone, userRole) {
  const currentUrl = window.location.origin;
  const html = `
    <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
      <span>✉ Send Login Credentials via Email</span>
    </h3>
    <p class="modal-desc">Deliver account username, password, and Invitation Meeting Portal link directly to the member's inbox.</p>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #2563eb; border-radius:8px; padding:16px; margin-bottom:18px;">
      <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:8px;">Delivery Details:</div>
      <table style="width:100%; font-size:13px; line-height:1.7;">
        <tr>
          <td style="color:#64748b; width:120px;">Member:</td>
          <td style="font-weight:600; color:#0f172a;">${Utils.escapeHTML(userName)} (${userRole})</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Recipient Email:</td>
          <td style="font-weight:700; color:#2563eb;">${Utils.escapeHTML(userEmail)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Login Password:</td>
          <td style="font-weight:700; color:#0f172a; font-family:monospace;">${Utils.escapeHTML(userPhone || '12345678')}</td>
        </tr>
      </table>
    </div>

    <form onsubmit="App.handleSendSingleCredentialsSubmit(event, '${userId}')">
      <div style="margin-bottom:14px;">
        <label>Invitation Meeting Portal Link (Included in Email)</label>
        <input type="url" id="sendPortalUrl" required value="${currentUrl}">
        <small style="color:var(--muted); font-size:11px; display:block; margin-top:3px;">
          The employee will click this link to open the login page directly.
        </small>
      </div>

      <div style="margin-bottom:18px;">
        <label>Override Password (Optional)</label>
        <input type="text" id="sendCustomPassword" placeholder="Default is employee phone: ${Utils.escapeHTML(userPhone || '')}" value="">
        <small style="color:var(--muted); font-size:11px; display:block; margin-top:3px;">
          Leave empty to automatically send their registered phone number as the password.
        </small>
      </div>

      <div id="sendCredStatus" class="hidden" style="margin-bottom:14px; padding:10px; background:#eff6ff; border-radius:6px; color:#1e40af; font-size:12px; text-align:center;">
        Connecting to SMTP mail server and sending credentials email...
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" id="btnSubmitSendCred" class="btn primary">
          ✉ Send Credentials Now
        </button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleSendSingleCredentialsSubmit = async function(e, userId) {
  e.preventDefault();
  const portalUrl = document.getElementById('sendPortalUrl').value.trim();
  const customPassword = document.getElementById('sendCustomPassword').value.trim();
  const btn = document.getElementById('btnSubmitSendCred');
  const status = document.getElementById('sendCredStatus');

  if (btn) btn.disabled = true;
  if (status) status.classList.remove('hidden');

  try {
    const res = await API.post(`/users/${userId}/send-credentials`, {
      portal_url: portalUrl,
      custom_password: customPassword || undefined
    });
    Utils.toast(res.message || 'Credentials email sent successfully!');
    Utils.closeModal();
  } catch (err) {
    if (err.data && err.data.notConfigured) {
      Utils.toast('SMTP Not Set Up: Please configure SMTP in Settings first');
    } else {
      Utils.toast('Failed to send email: ' + err.message);
    }
    if (btn) btn.disabled = false;
    if (status) status.classList.add('hidden');
  }
};

// Broadcast Credentials to Entire Team Modal
App.openBroadcastCredentialsModal = function() {
  const currentUrl = window.location.origin;
  const users = App.cache.users || [];
  const eligible = users.filter(u => ['sales_head', 'sales_associate'].includes(u.role) && u.status === 'active');
  const heads = eligible.filter(u => u.role === 'sales_head');
  const associates = eligible.filter(u => u.role === 'sales_associate');

  const html = `
    <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
      <span>✉ Broadcast Credentials to Team</span>
    </h3>
    <p class="modal-desc">Send personalized login credentials (User ID, password & Invitation Meeting Portal link) to your team via email.</p>

    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin-bottom:18px;">
      <div style="font-weight:700; color:#166534; font-size:14px; margin-bottom:6px;">
        👥 Recipients Summary:
      </div>
      <div style="display:flex; gap:16px; font-size:13px; color:#15803d;">
        <div><strong>Total Eligible:</strong> ${eligible.length} members</div>
        <div><strong>Sales Heads:</strong> ${heads.length}</div>
        <div><strong>Sales Associates:</strong> ${associates.length}</div>
      </div>
      <div style="margin-top:8px; font-size:12px; color:#166534; line-height:1.5;">
        Each member receives a personalized email with their unique <strong>Username (Email)</strong> and <strong>Password (Phone Number)</strong>.
      </div>
    </div>

    <form onsubmit="App.handleBroadcastCredentialsSubmit(event)">
      <div style="margin-bottom:14px;">
        <label>Recipient Filter *</label>
        <select id="broadcastRoleFilter" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px; background:#fff;">
          <option value="">All Team Members (Heads + Associates - ${eligible.length})</option>
          <option value="sales_head">Sales Heads Only (${heads.length})</option>
          <option value="sales_associate">Sales Associates Only (${associates.length})</option>
        </select>
      </div>

      <div style="margin-bottom:18px;">
        <label>Invitation Meeting Portal Link (Included in Email) *</label>
        <input type="url" id="broadcastPortalUrl" required value="${currentUrl}">
        <small style="color:var(--muted); font-size:11px; display:block; margin-top:3px;">
          This link will be clickable in each employee's email.
        </small>
      </div>

      <div id="broadcastStatus" class="hidden" style="margin-bottom:16px; padding:14px; background:#eff6ff; border-radius:8px; color:#1e40af; font-size:13px; text-align:center;">
        <div style="font-weight:700; margin-bottom:4px;">Dispatches in progress...</div>
        <div>Please wait while credentials are sent to each employee inbox.</div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" id="btnSubmitBroadcast" class="btn primary" style="background:#059669; border-color:#059669;">
          🚀 Dispatch Credentials to Team
        </button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleBroadcastCredentialsSubmit = async function(e) {
  e.preventDefault();
  const roleFilter = document.getElementById('broadcastRoleFilter').value;
  const portalUrl = document.getElementById('broadcastPortalUrl').value.trim();
  const btn = document.getElementById('btnSubmitBroadcast');
  const status = document.getElementById('broadcastStatus');

  if (btn) btn.disabled = true;
  if (status) status.classList.remove('hidden');

  try {
    const res = await API.post('/users/broadcast-credentials', {
      role_filter: roleFilter || undefined,
      portal_url: portalUrl
    });

    Utils.toast(res.message || 'Credentials broadcast completed successfully!');
    Utils.closeModal();

    if (res.summary && res.summary.failed > 0) {
      alert(`Sent: ${res.summary.sent}\nFailed: ${res.summary.failed}\nCheck email addresses for failed members.`);
    }
  } catch (err) {
    if (err.data && err.data.notConfigured) {
      Utils.toast('SMTP Not Set Up: Please configure SMTP in Settings first');
    } else {
      Utils.toast('Broadcast failed: ' + err.message);
    }
    if (btn) btn.disabled = false;
    if (status) status.classList.add('hidden');
  }
};
