// Sales Team Management Component with Full CRUD
App.renderTeamManagement = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading sales team...</div>`;

  try {
    const data = await API.get('/users');
    const users = data.users || [];
    const role = this.currentUser.role;

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
  const user = (this.cache.users || []).find(u => u.id === userId);
  if (!user) return;

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
          <label>Mobile Number</label>
          <input id="editUserPhone" type="tel" value="${Utils.escapeHTML(user.phone || '')}">
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
        <label>Reset Password (leave empty to keep current)</label>
        <input id="editUserPassword" type="password" placeholder="New password...">
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
  const payload = {
    name: document.getElementById('editUserName').value.trim(),
    email: document.getElementById('editUserEmail').value.trim(),
    phone: document.getElementById('editUserPhone').value.trim(),
    status: document.getElementById('editUserStatus').value,
    sales_head_id: document.getElementById('editUserHeadSelect')?.value || null
  };
  if (password && password.trim()) {
    payload.password = password.trim();
  }

  try {
    const res = await API.put(`/users/${userId}`, payload);
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderTeamManagement(document.getElementById('pageContent'));
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
