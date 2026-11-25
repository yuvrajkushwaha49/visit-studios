// Sales Team Management Component with Full CRUD
App.teamFilters = App.teamFilters || {
  search: '',
  teams: [],
  members: [],
  statuses: []
};

App.normalizeTeamFilters = function() {
  const current = this.teamFilters || {};
  const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
  this.teamFilters = {
    search: current.search || '',
    teams: asList(current.teams),
    members: asList(current.members),
    statuses: asList(current.statuses)
  };
  return this.teamFilters;
};

App.teamHeadName = function(person, users) {
  if (!person) return 'Direct / Unassigned';
  if (person.sales_head_name) return person.sales_head_name;
  const head = (users || []).find(user => user.id === person.sales_head_id);
  return head ? head.name : 'Direct / Unassigned';
};

App.applyTeamFilters = function(users, filters) {
  const heads = users.filter(user => user.role === 'sales_head');
  const associates = users.filter(user => user.role === 'sales_associate');
  const query = String(filters.search || '').trim().toLowerCase();
  const matchesText = (user) => {
    if (!query) return true;
    const headName = user.role === 'sales_associate' ? this.teamHeadName(user, users) : '';
    return [user.name, user.email, user.phone, headName].join(' ').toLowerCase().includes(query);
  };
  const matchesStatus = (user) => !filters.statuses.length || filters.statuses.includes(user.status);

  let filteredHeads = heads.filter(head =>
    matchesText(head) && matchesStatus(head) && (!filters.teams.length || filters.teams.includes(head.id))
  );
  const filteredAssociates = associates.filter(associate =>
    matchesText(associate) &&
    matchesStatus(associate) &&
    (!filters.teams.length || filters.teams.includes(associate.sales_head_id)) &&
    (!filters.members.length || filters.members.includes(associate.id))
  );

  if (filters.members.length && !filters.teams.length) {
    const headIds = new Set(filteredAssociates.map(associate => associate.sales_head_id).filter(Boolean));
    filteredHeads = heads.filter(head => headIds.has(head.id) && matchesStatus(head) && matchesText(head));
  }

  return { heads: filteredHeads, associates: filteredAssociates };
};

App.teamStatusButton = function(user) {
  const isActive = user.status === 'active';
  const next = isActive ? 'inactive' : 'active';
  const label = isActive ? 'Deactivate' : 'Activate';
  const style = isActive
    ? 'color:#b45309; border-color:#fcd34d; background:#fffbeb;'
    : 'color:#059669; border-color:#a7f3d0; background:#f0fdf4;';
  return `<button class="btn small" onclick="App.toggleTeamMemberStatus('${user.id}', '${next}')" style="${style}">${label}</button>`;
};

App.toggleTeamMemberStatus = async function(userId, nextStatus) {
  try {
    await API.put(`/users/${userId}`, { status: nextStatus });
    Utils.toast(nextStatus === 'active' ? 'Team member activated' : 'Team member deactivated');
    this.reloadTeamScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openTeamMember = function(userId) {
  this.selectedTeamMemberId = userId;
  this.navigate('team_member');
};

App.reloadTeamScreen = function() {
  const container = document.getElementById('pageContent');
  if (!container) return;
  if (this.activePage === 'team_member') return this.renderTeamMemberDetail(container);
  return this.renderTeamManagement(container);
};

App.renderTeamMemberDetail = async function(container) {
  const userId = this.selectedTeamMemberId;
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading team member...</div>`;
  if (!userId) {
    container.innerHTML = `<div class="panel" style="padding:30px;">Choose a team member from Sales Team.</div>`;
    return;
  }

  try {
    if (!this.currentUser) {
      this.currentUser = (typeof API !== 'undefined' && API.getUser ? API.getUser() : null) || {};
    }
    const role = this.currentUser.role || 'admin';
    const directory = await API.get('/users');
    const users = directory.users || [];
    const person = users.find(user => user.id === userId);
    if (!person || (person.role !== 'sales_head' && person.role !== 'sales_associate')) {
      container.innerHTML = `
        <div class="panel" style="padding:30px;">
          <p>This team member is not available.</p>
          <button class="btn" onclick="App.navigate('team')">Back to Sales Team</button>
        </div>
      `;
      return;
    }

    const isHead = person.role === 'sales_head';
    const teamAssociates = users.filter(user => user.role === 'sales_associate' && user.sales_head_id === person.id);
    const reportingHead = users.find(user => user.id === person.sales_head_id);
    const invitationQuery = isHead ? { team_ids: person.id } : { associate_ids: person.id };
    const [invRes, visitsRes, customersRes] = await Promise.all([
      API.get('/invitations', invitationQuery),
      API.get('/visits').catch(() => ({ visits: [] })),
      API.get('/customers').catch(() => ({ customers: [] }))
    ]);

    const seenInvites = new Set();
    const invitations = [];
    (invRes.invitations || []).forEach(invitation => {
      if (!invitation.id || seenInvites.has(invitation.id)) return;
      seenInvites.add(invitation.id);
      invitations.push(invitation);
    });
    const associateIds = new Set(teamAssociates.map(associate => associate.id));
    const visits = (visitsRes.visits || []).filter(visit => isHead
      ? visit.sales_head_id === person.id || associateIds.has(visit.associate_id)
      : visit.associate_id === person.id);
    const customers = (customersRes.customers || []).filter(customer => isHead
      ? customer.assigned_sales_head_id === person.id || associateIds.has(customer.assigned_associate_id)
      : customer.assigned_associate_id === person.id);
    const countStatus = (status) => invitations.filter(invitation => invitation.status === status).length;
    const badge = person.status === 'active' ? 'active' : 'inactive';
    const roleLabel = isHead ? 'Sales Head' : 'Sales Associate';
    const crumb = document.getElementById('topbarCrumb');
    if (crumb) crumb.textContent = person.name;

    const invitationRows = invitations.slice(0, 12).map(invitation => `
      <tr>
        <td><strong>${Utils.escapeHTML(invitation.customer_name || '—')}</strong><small>${Utils.escapeHTML(invitation.customer_phone || '')}</small></td>
        <td>${Utils.escapeHTML(invitation.project_name || '—')}<small>${Utils.escapeHTML(invitation.developer_name || '')}</small></td>
        <td><strong>${Utils.formatDate(String(invitation.visit_date || '').slice(0, 10))}</strong><small>${Utils.formatTime(invitation.visit_time)}</small></td>
        <td>${Utils.escapeHTML(invitation.associate_name || '—')}</td>
        <td><span class="badge ${invitation.status}">${Utils.escapeHTML(String(invitation.status || '').replace(/_/g, ' '))}</span></td>
      </tr>
    `).join('');
    const visitRows = visits.slice(0, 8).map(visit => `
      <tr>
        <td><strong>${Utils.escapeHTML(visit.customer_name || '—')}</strong></td>
        <td>${Utils.escapeHTML(visit.project_name || '—')}</td>
        <td>${Utils.formatDate(String(visit.scheduled_date || '').slice(0, 10))} <small>${Utils.formatTime(visit.scheduled_time)}</small></td>
        <td><span class="badge ${visit.status}">${Utils.escapeHTML(String(visit.status || '').replace(/_/g, ' '))}</span></td>
      </tr>
    `).join('');
    const associateRows = teamAssociates.map(associate => `
      <tr>
        <td><button type="button" class="row-link" onclick="App.openTeamMember('${associate.id}')">${Utils.escapeHTML(associate.name)}</button></td>
        <td>${Utils.escapeHTML(associate.email || '')}<small>${Utils.escapeHTML(associate.phone || '')}</small></td>
        <td>${invitations.filter(invitation => invitation.associate_id === associate.id).length}</td>
        <td><span class="badge ${associate.status === 'active' ? 'active' : 'inactive'}">${Utils.escapeHTML(associate.status)}</span></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">${roleLabel.toUpperCase()}</div>
          <h1 class="page-title">${Utils.escapeHTML(person.name)}</h1>
          <p class="page-desc">${Utils.escapeHTML(person.email || '')}${person.phone ? ` · ${Utils.escapeHTML(person.phone)}` : ''}</p>
        </div>
        <div class="actions">
          <button class="btn" onclick="App.navigate('team')">Back to Sales Team</button>
          ${this.teamStatusButton(person)}
          <button class="btn small soft" onclick="App.sendCredentialsToUser('${person.id}', '${Utils.escapeHTML(person.name)}', '${Utils.escapeHTML(person.email)}', '${Utils.escapeHTML(person.phone || '')}', '${roleLabel}')">✉ Send Login</button>
          <button class="btn small soft" onclick="App.openEditUserModal('${person.id}')">Edit</button>
          ${role === 'admin' && !isHead ? `<button class="btn small" onclick="App.openAssignHeadModal('${person.id}', '${Utils.escapeHTML(person.name)}')">Assign Head</button>` : ''}
          ${role === 'admin' ? `<button class="btn small danger" onclick="App.deleteUser('${person.id}', '${Utils.escapeHTML(person.name)}')">Delete</button>` : ''}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card purple"><div class="kpi-label">Status</div><div class="kpi-value" style="font-size:22px;"><span class="badge ${badge}">${Utils.escapeHTML(person.status)}</span></div><div class="kpi-sub">Joined ${Utils.formatDate(String(person.created_at || '').slice(0, 10))}</div></div>
        ${isHead
          ? `<div class="kpi-card blue"><div class="kpi-label">Associates</div><div class="kpi-value">${teamAssociates.length}</div><div class="kpi-sub">Direct team members</div></div>`
          : `<div class="kpi-card blue"><div class="kpi-label">Sales Head</div><div class="kpi-value" style="font-size:20px;">${reportingHead ? `<button type="button" class="row-link" onclick="App.openTeamMember('${reportingHead.id}')">${Utils.escapeHTML(reportingHead.name)}</button>` : 'Unassigned'}</div><div class="kpi-sub">Reporting manager</div></div>`}
        <div class="kpi-card gold"><div class="kpi-label">Invitations</div><div class="kpi-value">${invitations.length}</div><div class="kpi-sub">${countStatus('confirmed')} confirmed · ${countStatus('opened')} opened</div></div>
        <div class="kpi-card green"><div class="kpi-label">Visits</div><div class="kpi-value">${visits.length}</div><div class="kpi-sub">${customers.length} customers</div></div>
      </div>

      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header"><h3 class="panel-title">Profile</h3></div>
        <div style="padding:18px 20px; display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px;">
          <div><div class="kpi-label">Role</div><strong>${roleLabel}</strong></div>
          <div><div class="kpi-label">Email</div><strong>${Utils.escapeHTML(person.email || '—')}</strong></div>
          <div><div class="kpi-label">Phone</div><strong>${Utils.escapeHTML(person.phone || '—')}</strong></div>
          <div><div class="kpi-label">${isHead ? 'Team' : 'Reports To'}</div><strong>${isHead ? `${Utils.escapeHTML(person.name)} Team` : (reportingHead ? Utils.escapeHTML(reportingHead.name) : 'Unassigned')}</strong></div>
        </div>
      </div>

      ${isHead ? `
        <div class="panel" style="margin-bottom:24px;">
          <div class="panel-header"><h3 class="panel-title">Sales Associates (${teamAssociates.length})</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Associate</th><th>Contact</th><th>Invitations</th><th>Status</th></tr></thead>
              <tbody>
                ${associateRows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No associates on this team.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header"><h3 class="panel-title">Invitations (${invitations.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Project</th><th>Schedule</th><th>Sent By</th><th>Status</th></tr></thead>
            <tbody>
              ${invitationRows || `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--muted);">No invitations yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3 class="panel-title">Site Visits (${visits.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Project</th><th>Schedule</th><th>Status</th></tr></thead>
            <tbody>
              ${visitRows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No site visits yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.teamHeadRow = function(head, associates) {
  const directCount = associates.filter(associate => associate.sales_head_id === head.id).length;
  const badge = head.status === 'active' ? 'active' : 'inactive';
  return `
    <tr>
      <td><button type="button" class="row-link" onclick="App.openTeamMember('${head.id}')">${Utils.escapeHTML(head.name)}</button></td>
      <td>
        ${Utils.escapeHTML(head.email)}
        <small>${Utils.escapeHTML(head.phone || 'No phone')}</small>
      </td>
      <td><span class="badge completed">${directCount} Associates</span></td>
      <td><span class="badge ${badge}">${Utils.escapeHTML(head.status)}</span></td>
      <td>
        <div class="actions">
          <button class="btn small soft" onclick="App.openTeamMember('${head.id}')">View</button>
          <button class="btn small soft" onclick="App.openEditUserModal('${head.id}')">Edit</button>
          ${this.teamStatusButton(head)}
        </div>
      </td>
    </tr>
  `;
};

App.teamAssociateRow = function(associate, users, role) {
  const badge = associate.status === 'active' ? 'active' : 'inactive';
  return `
    <tr>
      <td><button type="button" class="row-link" onclick="App.openTeamMember('${associate.id}')">${Utils.escapeHTML(associate.name)}</button></td>
      <td>
        ${Utils.escapeHTML(associate.email)}
        <small>${Utils.escapeHTML(associate.phone || '')}</small>
      </td>
      <td>
        <span style="font-weight:600; color:var(--purple);">${Utils.escapeHTML(this.teamHeadName(associate, users))}</span>
      </td>
      <td><span class="badge ${badge}">${Utils.escapeHTML(associate.status)}</span></td>
      <td>
        <div class="actions">
          <button class="btn small soft" onclick="App.openTeamMember('${associate.id}')">View</button>
          <button class="btn small soft" onclick="App.openEditUserModal('${associate.id}')">Edit</button>
          ${this.teamStatusButton(associate)}
        </div>
      </td>
    </tr>
  `;
};

App.paintTeamDirectory = function(users, filters) {
  const role = this.currentUser?.role || 'admin';
  const filtered = this.applyTeamFilters(users, filters);
  const headsBody = document.getElementById('teamHeadsBody');
  const associatesBody = document.getElementById('teamAssociatesBody');
  if (headsBody) {
    headsBody.innerHTML = filtered.heads.length
      ? filtered.heads.map(head => this.teamHeadRow(head, users.filter(user => user.role === 'sales_associate'))).join('')
      : `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No sales heads match these filters.</td></tr>`;
  }
  if (associatesBody) {
    associatesBody.innerHTML = filtered.associates.length
      ? filtered.associates.map(associate => this.teamAssociateRow(associate, users, role)).join('')
      : `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No sales associates match these filters.</td></tr>`;
  }
  const headsTitle = document.getElementById('teamHeadsTitle');
  const associatesTitle = document.getElementById('teamAssociatesTitle');
  if (headsTitle) headsTitle.textContent = `Sales Heads / Team Leaders (${filtered.heads.length})`;
  if (associatesTitle) associatesTitle.textContent = `Sales Associates (${filtered.associates.length})`;
  const count = document.getElementById('teamFilterCount');
  if (count) {
    const parts = [];
    if (role === 'admin' || role === 'super_admin') parts.push(`${filtered.heads.length} team${filtered.heads.length === 1 ? '' : 's'}`);
    parts.push(`${filtered.associates.length} member${filtered.associates.length === 1 ? '' : 's'}`);
    count.textContent = parts.join(' · ');
  }
};

App.renderTeamManagement = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading sales team...</div>`;

  try {
    const data = await API.get('/users');
    const users = data.users || [];
    if (!this.currentUser) {
      this.currentUser = (typeof API !== 'undefined' && API.getUser ? API.getUser() : null) || {};
    }
    const role = this.currentUser.role || 'admin';
    const showTeam = role === 'admin' || role === 'super_admin';
    const filters = this.normalizeTeamFilters();

    this.cache = this.cache || {};
    this.cache.users = users;
    const salesHeads = users.filter(user => user.role === 'sales_head').sort((a, b) => a.name.localeCompare(b.name));
    const associates = users.filter(user => user.role === 'sales_associate').sort((a, b) => a.name.localeCompare(b.name));
    const filtered = this.applyTeamFilters(users, filters);
    const selectionLabel = (count, emptyLabel) => count ? `${count} Selected` : emptyLabel;
    const statusOptions = [
      { id: 'active', name: 'Active' },
      { id: 'inactive', name: 'Inactive' },
      { id: 'suspended', name: 'Suspended' }
    ];
    const headLabel = (head) => head.organization_name ? `${head.name} · ${head.organization_name}` : head.name;
    const multiSelect = (id, emptyLabel, options, selected, onchangeName) => `
      <div class="multi-select-wrap">
        <div class="multi-select-trigger" onclick="App.toggleMultiSelectDropdown('${id}Dropdown')">
          <span id="${id}Label">${selectionLabel(selected.length, emptyLabel)}</span>
          <span style="font-size:10px; color:#94a3b8;">▼</span>
        </div>
        <div id="${id}Dropdown" class="multi-select-dropdown hidden">
          <input type="text" class="multi-select-search" placeholder="Search..." oninput="App.filterMultiSelectOptions(this, '${id}Options')">
          <div class="multi-select-options" id="${id}Options">
            ${options.length ? options.map(opt => `
              <label class="multi-select-item" ${opt.sales_head_id ? `data-head="${Utils.escapeHTML(opt.sales_head_id)}"` : ''}>
                <input type="checkbox" value="${Utils.escapeHTML(opt.id)}" ${selected.includes(opt.id) ? 'checked' : ''} onchange="${onchangeName}">
                <span>${Utils.escapeHTML(opt.name)}</span>
              </label>
            `).join('') : `<div class="multi-select-item">No options</div>`}
          </div>
        </div>
      </div>
    `;

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

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="teamSearch" placeholder="Name, email or phone" value="${Utils.escapeHTML(filters.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault();App.searchTeam();}">
          </label>
        </div>
        <div class="inv-filters-grid">
          ${showTeam ? `
            <div class="inv-filter-field">
              <span>Team</span>
              ${multiSelect('teamTeam', 'All Teams', salesHeads.map(head => ({ id: head.id, name: headLabel(head) })), filters.teams, 'App.onTeamTeamsChange()')}
            </div>
          ` : ''}
          <div class="inv-filter-field">
            <span>Member</span>
            ${multiSelect('teamMember', 'All Members', associates.map(associate => ({ id: associate.id, name: associate.name, sales_head_id: associate.sales_head_id || '' })), filters.members, 'App.onTeamMembersChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Status</span>
            ${multiSelect('teamStatus', 'All Statuses', statusOptions, filters.statuses, 'App.onTeamStatusesChange()')}
          </div>
        </div>
        <div class="inv-filters-actions">
          <span id="teamFilterCount" class="inv-filter-count"></span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetTeamFilters()">Reset</button>
            <button type="button" class="btn small primary" id="teamSearchBtn" onclick="App.searchTeam()">Search</button>
            <button type="button" class="btn small gold" id="teamExportBtn" onclick="App.exportTeamExcel()">Export Excel</button>
          </div>
        </div>
      </div>

      ${showTeam ? `
        <div class="panel" style="margin-bottom: 28px;">
          <div class="panel-header">
            <h3 class="panel-title" id="teamHeadsTitle">Sales Heads / Team Leaders (${filtered.heads.length})</h3>
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
              <tbody id="teamHeadsBody"></tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title" id="teamAssociatesTitle">Sales Associates (${filtered.associates.length})</h3>
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
            <tbody id="teamAssociatesBody"></tbody>
          </table>
        </div>
      </div>
    `;
    this.paintTeamDirectory(users, filters);
    if (showTeam) this.onTeamTeamsChange();
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.checkedTeamValues = function(optionsId) {
  return [...document.querySelectorAll(`#${optionsId} input:checked`)].map(input => input.value);
};

App.setTeamMultiLabel = function(labelId, count, emptyLabel) {
  const label = document.getElementById(labelId);
  if (label) label.textContent = count ? `${count} Selected` : emptyLabel;
};

App.onTeamTeamsChange = function() {
  const teams = this.checkedTeamValues('teamTeamOptions');
  this.setTeamMultiLabel('teamTeamLabel', teams.length, 'All Teams');
  document.querySelectorAll('#teamMemberOptions .multi-select-item').forEach(item => {
    const headId = item.getAttribute('data-head') || '';
    const visible = !teams.length || teams.includes(headId);
    item.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      const box = item.querySelector('input');
      if (box) box.checked = false;
    }
  });
  this.onTeamMembersChange();
};

App.onTeamMembersChange = function() {
  const count = this.checkedTeamValues('teamMemberOptions').length;
  this.setTeamMultiLabel('teamMemberLabel', count, 'All Members');
};

App.onTeamStatusesChange = function() {
  const count = this.checkedTeamValues('teamStatusOptions').length;
  this.setTeamMultiLabel('teamStatusLabel', count, 'All Statuses');
};

App.readTeamFilters = function() {
  return {
    search: (document.getElementById('teamSearch')?.value || '').trim(),
    teams: this.checkedTeamValues('teamTeamOptions'),
    members: this.checkedTeamValues('teamMemberOptions'),
    statuses: this.checkedTeamValues('teamStatusOptions')
  };
};

App.exportTeamExcel = async function() {
  const filters = this.readTeamFilters();
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.teams.length) params.set('team_ids', filters.teams.join(','));
  if (filters.members.length) params.set('associate_ids', filters.members.join(','));
  if (filters.statuses.length) params.set('statuses', filters.statuses.join(','));
  const button = document.getElementById('teamExportBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Exporting...';
  }
  Utils.toast('Preparing Excel export...');
  try {
    const response = await fetch(`/api/users/export/excel?${params.toString()}`, {
      headers: { Authorization: `Bearer ${API.getToken()}` }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_team_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    Utils.toast('Excel downloaded');
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Export Excel';
    }
  }
};

App.searchTeam = async function() {
  const filters = this.readTeamFilters();
  this.teamFilters = filters;
  const button = document.getElementById('teamSearchBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Searching...';
  }
  try {
    const data = await API.get('/users');
    this.cache = this.cache || {};
    this.cache.users = data.users || [];
    this.paintTeamDirectory(this.cache.users, filters);
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Search';
    }
  }
};

App.resetTeamFilters = function() {
  this.teamFilters = { search: '', teams: [], members: [], statuses: [] };
  const search = document.getElementById('teamSearch');
  if (search) search.value = '';
  document.querySelectorAll('#teamTeamOptions input, #teamMemberOptions input, #teamStatusOptions input').forEach(input => {
    input.checked = false;
  });
  document.querySelectorAll('#teamMemberOptions .multi-select-item').forEach(item => {
    item.style.display = 'flex';
  });
  this.onTeamTeamsChange();
  this.onTeamStatusesChange();
  this.searchTeam();
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

    App.reloadTeamScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteUser = async function(userId, userName) {
  if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return;
  try {
    const res = await API.delete(`/users/${userId}`);
    Utils.toast(res.message);
    if (App.activePage === 'team_member' && App.selectedTeamMemberId === userId) {
      App.navigate('team');
    } else {
      App.reloadTeamScreen();
    }
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
    App.reloadTeamScreen();
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
