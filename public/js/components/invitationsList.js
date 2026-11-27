// Invitations List Component
App.invitationFilters = App.invitationFilters || {
  search: '',
  teams: [],
  members: [],
  developers: [],
  projects: [],
  statuses: [],
  period: '',
  dateFrom: '',
  dateTo: ''
};

App.normalizeInvitationFilters = function() {
  const current = this.invitationFilters || {};
  const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
  this.invitationFilters = {
    search: current.search || '',
    teams: asList(current.teams || current.team),
    members: asList(current.members || current.member),
    developers: asList(current.developers || current.developer),
    projects: asList(current.projects || current.project),
    statuses: asList(current.statuses || current.status),
    period: current.period || '',
    dateFrom: current.dateFrom || '',
    dateTo: current.dateTo || ''
  };
  return this.invitationFilters;
};

App.invitationQuery = function(filters) {
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.teams.length) params.team_ids = filters.teams.join(',');
  if (filters.members.length) params.associate_ids = filters.members.join(',');
  if (filters.developers.length) params.developer_ids = filters.developers.join(',');
  if (filters.projects.length) params.project_ids = filters.projects.join(',');
  if (filters.statuses.length) params.statuses = filters.statuses.join(',');
  if (filters.period) params.period = filters.period;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  return params;
};

App.invitationHasFilters = function(filters) {
  return Boolean(
    filters.search || filters.teams.length || filters.members.length ||
    filters.developers.length || filters.projects.length || filters.statuses.length ||
    filters.period || filters.dateFrom || filters.dateTo
  );
};

App.invitationListFilters = App.invitationListFilters || {
  search: '',
  date_from: '',
  date_to: '',
  team_id: '',
  associate_id: '',
  developer_id: '',
  project_id: '',
  status: ''
};

App.onInvListFilterChange = function(key, value) {
  App.invitationListFilters[key] = value;
  if (key === 'developer_id') App.invitationListFilters.project_id = '';
  if (key === 'team_id') App.invitationListFilters.associate_id = '';
  this.ensurePager('digital_invitations', { resetPage: true });
  this.renderInvitationsList(document.getElementById('pageContent'));
};

App.resetInvListFilters = function() {
  App.invitationListFilters = {
    search: '', date_from: '', date_to: '',
    team_id: '', associate_id: '', developer_id: '', project_id: '', status: ''
  };
  this.ensurePager('digital_invitations', { resetPage: true });
  this.renderInvitationsList(document.getElementById('pageContent'));
};

App.renderInvitationsList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading invitations...</div>`;

  try {
    const lf = App.invitationListFilters;
    const query = {};
    Object.entries(lf).forEach(([k, v]) => { if (v) query[k] = v; });

    const [data, catalog] = await Promise.all([
      API.get('/invitations', query),
      App.getFilterCatalog()
    ]);
    const list = data.invitations || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">GUEST LIST & INVITATIONS</div>
          <h1 class="page-title">Digital Invitations</h1>
          <p class="page-desc">Track active invitation links, customer openings, and visit confirmations.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.navigate('create_invitation')">
            + New Invitation
          </button>
        </div>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="invSearch" placeholder="Search customer, builder, project or advisor..." value="${Utils.escapeHTML(lf.search)}" oninput="App.invitationListFilters.search=this.value; App.filterInvitationsTable(true)" onkeydown="if(event.key==='Enter'){event.preventDefault(); App.invitationListFilters.search=this.value; App.renderInvitationsList(document.getElementById('pageContent'));}">
          </label>
        </div>
        <div class="inv-filters-grid">
          ${App.buildStandardFilterFieldsHtml({
            state: lf,
            catalog,
            onChangeHandler: 'App.onInvListFilterChange',
            idPrefix: 'invL'
          })}
          <label class="inv-filter-field">
            <span>Status</span>
            <select id="invStatusFilter" onchange="App.invitationListFilters.status=this.value; App.filterInvitationsTable(true)">
              <option value="">All Statuses</option>
              <option value="sent" ${lf.status === 'sent' ? 'selected' : ''}>Sent</option>
              <option value="opened" ${lf.status === 'opened' ? 'selected' : ''}>Opened</option>
              <option value="confirmed" ${lf.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="reschedule_requested" ${lf.status === 'reschedule_requested' ? 'selected' : ''}>Reschedule Requested</option>
              <option value="cancelled" ${lf.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </label>
        </div>
        <div class="inv-filters-actions">
          <span class="inv-filter-count">${list.length} invitation${list.length === 1 ? '' : 's'}</span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetInvListFilters()">Reset</button>
            <button type="button" class="btn small primary" onclick="App.invitationListFilters.search=document.getElementById('invSearch').value; App.renderInvitationsList(document.getElementById('pageContent'));">Search</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="invitationsTable">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Residence</th>
                <th>Schedule</th>
                <th>Created</th>
                <th>Advisor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.length ? list.map(inv => `
                <tr data-search="${Utils.escapeHTML((inv.customer_name + ' ' + inv.project_name + ' ' + (inv.developer_name || '') + ' ' + inv.associate_name).toLowerCase())}" data-status="${inv.status}">
                  <td>
                    <strong>${Utils.escapeHTML(inv.customer_name)}</strong>
                    <small>${Utils.escapeHTML(inv.customer_phone || '')}</small>
                  </td>
                  <td>
                    ${Utils.escapeHTML(inv.project_name)}
                    <small>${Utils.escapeHTML(inv.developer_name || '')}</small>
                  </td>
                  <td>
                    <strong>${Utils.formatDate(inv.visit_date)}</strong>
                    <small>${Utils.formatTime(inv.visit_time)}</small>
                  </td>
                  <td>
                    <strong>${Utils.formatDate(inv.created_at)}</strong>
                    <small>${Utils.formatTime(inv.created_at)}</small>
                  </td>
                  <td>${Utils.escapeHTML(inv.associate_name)}</td>
                  <td>
                    <span class="badge ${inv.status}">${inv.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn small gold" onclick="App.openShareModalForId('${inv.id}')" title="Share with generated Pass Card & Short Link">
                        Share Pass ↗
                      </button>
                      <a href="#invite=${inv.token}" target="_blank" class="btn small soft" title="Open customer page">
                        View ↗
                      </a>
                      <button class="btn small" onclick="App.copyInviteLink('${inv.token}', '${inv.short_code || ''}')" title="Copy short link">
                        Copy Link
                      </button>
                      <button class="btn small" onclick="App.openRescheduleModal('${inv.id}', '${inv.visit_date}', '${inv.visit_time}')">
                        Reschedule
                      </button>
                      <button class="btn small soft" onclick="App.openEditInvitationModal('${inv.id}')" title="Edit invitation">
                        Edit
                      </button>
                      <button class="btn small danger" onclick="App.revokeInvitation('${inv.id}')" title="Revoke link">
                        Revoke
                      </button>
                      <button class="btn small danger" onclick="App.deleteInvitation('${inv.id}')" title="Delete record">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
                    No invitations found. Click "New Invitation" to create one.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        <div id="digitalInvPagination" class="table-pagination"></div>
      </div>
    `;
    this.filterInvitationsTable(true);
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.filterInvitationsTable = Utils.debounce(function(resetPage) {
  const query = (document.getElementById('invSearch')?.value || '').toLowerCase();
  const status = document.getElementById('invStatusFilter')?.value || '';
  App.applyDomTablePager({
    key: 'digital_invitations',
    tableId: 'invitationsTable',
    pagerId: 'digitalInvPagination',
    resetPage: resetPage === true,
    noun: 'invitations',
    matchRow: (row) => {
      const s = row.getAttribute('data-search') || '';
      const st = row.getAttribute('data-status') || '';
      return (!query || s.includes(query)) && (!status || st === status);
    }
  });
}, 100);

App.reloadInvitationScreen = function() {
  const container = document.getElementById('pageContent');
  if (!container) return;
  if (this.activePage === 'digital_invitations') return this.renderDigitalInvitations(container);
  return this.renderInvitationsList(container);
};

App.renderDigitalInvitations = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading invitations...</div>`;

  try {
    const role = this.currentUser?.role || '';
    const showTeam = role === 'admin' || role === 'super_admin';
    const showMember = showTeam || role === 'sales_head';
    const filters = this.normalizeInvitationFilters();

    const [data, usersRes, projectsRes, devsRes] = await Promise.all([
      API.get('/invitations', this.invitationQuery(filters)),
      showMember ? API.get('/users') : Promise.resolve({ users: [] }),
      API.get('/projects').catch(() => ({ projects: [] })),
      API.get('/developers').catch(() => ({ developers: [] }))
    ]);
    const list = data.invitations || [];
    const users = usersRes.users || [];
    const developerOptions = (devsRes.developers || [])
      .map(d => ({ id: d.id, name: d.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const heads = users
      .filter(u => u.role === 'sales_head' && u.status === 'active')
      .map(u => ({ id: u.id, name: u.name, organization_name: u.organization_name || '' }));
    const members = users
      .filter(u => u.role === 'sales_associate' && u.status === 'active')
      .map(u => ({ id: u.id, name: u.name, sales_head_id: u.sales_head_id || '' }));

    list.forEach(inv => {
      if (inv.team_id && !heads.some(h => h.id === inv.team_id)) {
        heads.push({ id: inv.team_id, name: inv.team_name || 'Team', organization_name: '' });
      }
      if (inv.associate_id && inv.associate_role === 'sales_associate' && !members.some(m => m.id === inv.associate_id)) {
        members.push({ id: inv.associate_id, name: inv.associate_name || 'Member', sales_head_id: inv.team_id || '' });
      }
    });
    heads.sort((a, b) => a.name.localeCompare(b.name));
    members.sort((a, b) => a.name.localeCompare(b.name));

    const projectOptions = [];
    const seenProjects = new Set();
    (projectsRes.projects || []).forEach(p => {
      if (!seenProjects.has(p.id)) {
        seenProjects.add(p.id);
        projectOptions.push({ id: p.id, name: p.name });
      }
    });
    list.forEach(inv => {
      if (inv.project_id && !seenProjects.has(inv.project_id)) {
        seenProjects.add(inv.project_id);
        projectOptions.push({ id: inv.project_id, name: inv.project_name || 'Project' });
      }
    });
    projectOptions.sort((a, b) => a.name.localeCompare(b.name));

    this.invitationDirectory = { heads, members, projects: projectOptions };

    const memberChoices = members;
    const headLabel = (h) => h.organization_name ? `${h.name} · ${h.organization_name}` : h.name;
    const selectionLabel = (count, emptyLabel) => count ? `${count} Selected` : emptyLabel;
    const statusOptions = [
      { id: 'draft', name: 'Draft' },
      { id: 'sent', name: 'Sent' },
      { id: 'opened', name: 'Opened' },
      { id: 'confirmed', name: 'Confirmed' },
      { id: 'reschedule_requested', name: 'Reschedule Requested' },
      { id: 'cancelled', name: 'Cancelled' },
      { id: 'expired', name: 'Expired' }
    ];
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
          <div class="eyebrow">MANAGEMENT REPORT</div>
          <h1 class="page-title">Invitations Report</h1>
          <p class="page-desc">Filter invitations by team, member, and period, then export the workbook.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.navigate('create_invitation')">
            + New Invitation
          </button>
        </div>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="invSearch" placeholder="Customer, project, phone or advisor" value="${Utils.escapeHTML(filters.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault();App.searchInvitations();}">
          </label>
        </div>
        <div class="inv-filters-grid">
          ${showTeam ? `
            <div class="inv-filter-field">
              <span>Team</span>
              ${multiSelect('invTeam', 'All Teams', heads.map(h => ({ id: h.id, name: headLabel(h) })), filters.teams, 'App.onInvitationTeamsChange()')}
            </div>
          ` : ''}
          ${showMember ? `
            <div class="inv-filter-field">
              <span>Member</span>
              ${multiSelect('invMember', 'All Members', memberChoices, filters.members, 'App.onInvitationMembersChange()')}
            </div>
          ` : ''}
          <label class="inv-filter-field">
            <span>Period</span>
            <select id="invPeriodFilter" onchange="App.onInvitationPeriodChange()">
              <option value="" ${filters.period === '' ? 'selected' : ''}>All Periods</option>
              <option value="today" ${filters.period === 'today' ? 'selected' : ''}>Today</option>
              <option value="tomorrow" ${filters.period === 'tomorrow' ? 'selected' : ''}>Tomorrow</option>
              <option value="this_week" ${filters.period === 'this_week' ? 'selected' : ''}>This Week</option>
              <option value="this_month" ${filters.period === 'this_month' ? 'selected' : ''}>This Month</option>
              <option value="last_7_days" ${filters.period === 'last_7_days' ? 'selected' : ''}>Last 7 Days</option>
              <option value="last_30_days" ${filters.period === 'last_30_days' ? 'selected' : ''}>Last 30 Days</option>
              <option value="custom" ${filters.period === 'custom' ? 'selected' : ''}>Custom Range</option>
            </select>
          </label>
          <label class="inv-filter-field" id="invDateFromWrap">
            <span>Date From</span>
            <input type="date" id="invDateFrom" value="${Utils.escapeHTML(filters.dateFrom)}">
          </label>
          <label class="inv-filter-field" id="invDateToWrap">
            <span>Date To</span>
            <input type="date" id="invDateTo" value="${Utils.escapeHTML(filters.dateTo)}">
          </label>
          <div class="inv-filter-field">
            <span>Builder</span>
            ${multiSelect('invDeveloper', 'All Builders', developerOptions, filters.developers, 'App.onInvitationDevelopersChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Project</span>
            ${multiSelect('invProject', 'All Projects', projectOptions, filters.projects, 'App.onInvitationProjectsChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Status</span>
            ${multiSelect('invStatus', 'All Statuses', statusOptions, filters.statuses, 'App.onInvitationStatusesChange()')}
          </div>
        </div>
        <div class="inv-filters-actions">
          <span id="invFilterCount" class="inv-filter-count">${list.length} invitation${list.length === 1 ? '' : 's'}</span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetInvitationFilters()">Reset</button>
            <button type="button" class="btn small primary" id="invSearchBtn" onclick="App.searchInvitations()">Search</button>
            <button type="button" class="btn small gold" id="invExportBtn" onclick="App.exportInvitationsExcel()">Export Excel</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="invitationsTable">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Residence</th>
                <th>Schedule</th>
                <th>Created</th>
                <th>Advisor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="invReportBody"></tbody>
          </table>
        </div>
        <div id="invReportPagination" class="table-pagination"></div>
      </div>
    `;
    this.cache = this.cache || {};
    this.cache.reportInvitations = list;
    this.pagerRefresh.invitations_report = () => {
      this.renderInvitationRows(this.cache.reportInvitations || [], this.invitationHasFilters(this.normalizeInvitationFilters()));
    };
    this.renderInvitationRows(list, this.invitationHasFilters(filters));
    if (showMember) this.onInvitationTeamsChange();
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.checkedInvitationValues = function(optionsId) {
  return [...document.querySelectorAll(`#${optionsId} input:checked`)].map(input => input.value);
};

App.setInvitationMultiLabel = function(labelId, count, emptyLabel) {
  const label = document.getElementById(labelId);
  if (label) label.textContent = count ? `${count} Selected` : emptyLabel;
};

App.onInvitationTeamsChange = function() {
  const teams = this.checkedInvitationValues('invTeamOptions');
  this.setInvitationMultiLabel('invTeamLabel', teams.length, 'All Teams');
  document.querySelectorAll('#invMemberOptions .multi-select-item').forEach(item => {
    const headId = item.getAttribute('data-head') || '';
    const visible = !teams.length || teams.includes(headId);
    item.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      const box = item.querySelector('input');
      if (box) box.checked = false;
    }
  });
  this.onInvitationMembersChange();
};

App.onInvitationMembersChange = function() {
  const count = this.checkedInvitationValues('invMemberOptions').length;
  this.setInvitationMultiLabel('invMemberLabel', count, 'All Members');
};

App.onInvitationDevelopersChange = function() {
  const count = this.checkedInvitationValues('invDeveloperOptions').length;
  this.setInvitationMultiLabel('invDeveloperLabel', count, 'All Builders');
};

App.onInvitationProjectsChange = function() {
  const count = this.checkedInvitationValues('invProjectOptions').length;
  this.setInvitationMultiLabel('invProjectLabel', count, 'All Projects');
};

App.onInvitationStatusesChange = function() {
  const count = this.checkedInvitationValues('invStatusOptions').length;
  this.setInvitationMultiLabel('invStatusLabel', count, 'All Statuses');
};

App.readInvitationFilters = function() {
  return {
    search: (document.getElementById('invSearch')?.value || '').trim(),
    teams: this.checkedInvitationValues('invTeamOptions'),
    members: this.checkedInvitationValues('invMemberOptions'),
    developers: this.checkedInvitationValues('invDeveloperOptions'),
    projects: this.checkedInvitationValues('invProjectOptions'),
    statuses: this.checkedInvitationValues('invStatusOptions'),
    period: document.getElementById('invPeriodFilter')?.value || '',
    dateFrom: document.getElementById('invDateFrom')?.value || '',
    dateTo: document.getElementById('invDateTo')?.value || ''
  };
};

App.invitationRowHtml = function(inv) {
  return `
    <tr>
      <td>
        <strong>${Utils.escapeHTML(inv.customer_name)}</strong>
        <small>${Utils.escapeHTML(inv.customer_phone || '')}</small>
      </td>
      <td>
        ${Utils.escapeHTML(inv.project_name)}
        <small>${Utils.escapeHTML(inv.developer_name || '')}</small>
      </td>
      <td>
        <strong>${Utils.formatDate(inv.visit_date)}</strong>
        <small>${Utils.formatTime(inv.visit_time)}</small>
      </td>
      <td>
        <strong>${Utils.formatDate(inv.created_at)}</strong>
        <small>${Utils.formatTime(inv.created_at)}</small>
      </td>
      <td>
        ${Utils.escapeHTML(inv.associate_name || '—')}
        ${inv.team_name && inv.associate_role !== 'sales_head' ? `<small>${Utils.escapeHTML(inv.team_name)}</small>` : ''}
      </td>
      <td>
        <span class="badge ${inv.status}">${String(inv.status || '').replace('_', ' ')}</span>
      </td>
      <td>
        <div class="actions">
          <button class="btn small gold" onclick="App.openShareModalForId('${inv.id}')" title="Share with generated Pass Card & Short Link">
            Share Pass ↗
          </button>
          <a href="#invite=${inv.token}" target="_blank" class="btn small soft" title="Open customer page">
            View ↗
          </a>
          <button class="btn small" onclick="App.copyInviteLink('${inv.token}', '${inv.short_code || ''}')" title="Copy short link">
            Copy Link
          </button>
          <button class="btn small" onclick="App.openRescheduleModal('${inv.id}', '${inv.visit_date}', '${inv.visit_time}')">
            Reschedule
          </button>
          <button class="btn small soft" onclick="App.openEditInvitationModal('${inv.id}')" title="Edit invitation">
            Edit
          </button>
          <button class="btn small danger" onclick="App.revokeInvitation('${inv.id}')" title="Revoke link">
            Revoke
          </button>
          <button class="btn small danger" onclick="App.deleteInvitation('${inv.id}')" title="Delete record">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `;
};

App.renderInvitationRows = function(list, filtered, options = {}) {
  const tbody = document.querySelector('#invitationsTable tbody') || document.getElementById('invReportBody');
  if (!tbody) return;
  this.cache = this.cache || {};
  this.cache.reportInvitations = list || [];
  this.pagerRefresh.invitations_report = () => {
    this.renderInvitationRows(this.cache.reportInvitations || [], filtered);
  };
  const pageData = this.paginateList(list || [], 'invitations_report', options);
  tbody.innerHTML = pageData.total
    ? pageData.items.map(inv => this.invitationRowHtml(inv)).join('')
    : `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">${filtered ? 'No invitations match these filters.' : 'No invitations found. Click "New Invitation" to create one.'}</td></tr>`;
  const count = document.getElementById('invFilterCount');
  if (count) {
    count.textContent = pageData.total
      ? `${pageData.label} invitation${pageData.total === 1 ? '' : 's'}`
      : '0 invitations';
  }
  this.renderPager('invReportPagination', 'invitations_report', pageData.total, pageData.page, pageData.pageSize, pageData.totalPages, 'invitations');
};

App.onInvitationPeriodChange = function() {
  const period = document.getElementById('invPeriodFilter')?.value || '';
  if (period && period !== 'custom') {
    const f = document.getElementById('invDateFrom');
    const t = document.getElementById('invDateTo');
    if (f) f.value = '';
    if (t) t.value = '';
  }
};

App.exportInvitationsExcel = async function() {
  const filters = this.readInvitationFilters();
  const params = new URLSearchParams(this.invitationQuery(filters));
  const button = document.getElementById('invExportBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Exporting...';
  }
  Utils.toast('Preparing Excel export...');
  try {
    const response = await fetch(`/api/invitations/export/excel?${params.toString()}`, {
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
    link.download = `digital_invitations_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

App.searchInvitations = async function() {
  const filters = this.readInvitationFilters();
  this.invitationFilters = filters;
  const button = document.getElementById('invSearchBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Searching...';
  }
  try {
    const data = await API.get('/invitations', this.invitationQuery(filters));
    this.renderInvitationRows(data.invitations || [], this.invitationHasFilters(filters), { resetPage: true });
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Search';
    }
  }
};

App.resetInvitationFilters = function() {
  this.ensurePager('invitations_report', { resetPage: true });
  this.invitationFilters = {
    search: '',
    teams: [],
    members: [],
    developers: [],
    projects: [],
    statuses: [],
    period: '',
    dateFrom: '',
    dateTo: ''
  };
  const search = document.getElementById('invSearch');
  if (search) search.value = '';
  const period = document.getElementById('invPeriodFilter');
  if (period) period.value = '';
  ['invDateFrom', 'invDateTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('#invTeamOptions input, #invMemberOptions input, #invDeveloperOptions input, #invProjectOptions input, #invStatusOptions input').forEach(input => {
    input.checked = false;
  });
  this.onInvitationTeamsChange();
  this.onInvitationDevelopersChange();
  this.onInvitationProjectsChange();
  this.onInvitationStatusesChange();
  this.searchInvitations();
};

App.copyInviteLink = function(token, shortCode) {
  const url = shortCode ? `${window.location.origin}/i/${shortCode}` : `${window.location.origin}/#invite=${token}`;
  navigator.clipboard.writeText(url).then(() => {
    Utils.toast('Short invitation link copied to clipboard!');
  }).catch(() => {
    prompt('Copy invitation link:', url);
  });
};

App.openShareModalForId = async function(id) {
  try {
    Utils.toast('Preparing site visit card & tracking link...');
    const res = await API.get(`/invitations/${id}`);
    const inv = res.invitation;
    if (inv) {
      App.showShareModal(inv, inv.customer_name, inv.customer_phone);
    }
  } catch (err) {
    Utils.toast('Error opening pass: ' + err.message);
  }
};

App.revokeInvitation = async function(id) {
  if (!confirm('Are you sure you want to revoke this invitation link? The customer will no longer be able to open it.')) return;
  try {
    await API.delete(`/invitations/${id}`);
    Utils.toast('Invitation revoked successfully');
    App.reloadInvitationScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openRescheduleModal = function(id, currentDate, currentTime) {
  const html = `
    <h3 class="modal-title">Reschedule Site Visit</h3>
    <p class="modal-desc">Enter the new visit date and time. An automated notification will be sent to the customer.</p>

    <form onsubmit="App.handleRescheduleSubmit(event, '${id}')">
      <div style="margin-bottom:14px;">
        <label>New Visit Date *</label>
        <input type="date" id="reschedDate" required value="${currentDate}">
      </div>
      <div style="margin-bottom:14px;">
        <label>New Visit Time *</label>
        <input type="time" id="reschedTime" required value="${currentTime}">
      </div>
      <div style="margin-bottom:18px;">
        <label>Reason / Notes</label>
        <textarea id="reschedNotes" placeholder="Reason for rescheduling..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Confirm Reschedule</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleRescheduleSubmit = async function(e, id) {
  e.preventDefault();
  const visit_date = document.getElementById('reschedDate').value;
  const visit_time = document.getElementById('reschedTime').value;
  const notes = document.getElementById('reschedNotes').value.trim();

  try {
    await API.patch(`/invitations/${id}/reschedule`, { visit_date, visit_time, notes });
    Utils.toast('Visit rescheduled and customer notified!');
    Utils.closeModal();
    App.reloadInvitationScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openEditInvitationModal = async function(invId) {
  Utils.showModal('<div style="text-align:center; padding:30px; color:var(--muted);">Loading invitation...</div>');
  try {
    const data = await API.get(`/invitations/${invId}`);
    const inv = data.invitation;

    const html = `
      <h3 class="modal-title">Edit Digital Invitation</h3>
      <p class="modal-desc">Modifying invitation for ${Utils.escapeHTML(inv.customer_name)} - ${Utils.escapeHTML(inv.project_name)}.</p>
      <form onsubmit="App.handleEditInvitationSubmit(event, '${invId}')">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Visit Date *</label>
            <input type="date" id="editInvDate" required value="${inv.visit_date}">
          </div>
          <div>
            <label>Visit Time *</label>
            <input type="time" id="editInvTime" required value="${inv.visit_time}">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Discussed Price / Quotation</label>
            <input id="editInvPrice" value="${Utils.escapeHTML(inv.price || '')}" placeholder="e.g. ₹2.40 Cr">
          </div>
          <div>
            <label>Residence Size / Config</label>
            <input id="editInvSize" value="${Utils.escapeHTML(inv.size || '')}" placeholder="e.g. 3 BHK (1,850 sq.ft)">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Duration (mins)</label>
            <input type="number" id="editInvDuration" value="${inv.duration || 60}" min="15" step="15">
          </div>
          <div>
            <label>Invitation Status</label>
            <select id="editInvStatus">
              <option value="sent" ${inv.status === 'sent' ? 'selected' : ''}>Sent</option>
              <option value="opened" ${inv.status === 'opened' ? 'selected' : ''}>Opened</option>
              <option value="confirmed" ${inv.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="reschedule_requested" ${inv.status === 'reschedule_requested' ? 'selected' : ''}>Reschedule Requested</option>
              <option value="cancelled" ${inv.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label>Visit Experience / Meeting Location</label>
          <input id="editInvLocation" value="${Utils.escapeHTML(inv.location || '')}">
        </div>

        <div style="margin-bottom:16px;">
          <label>Invitation Notes</label>
          <textarea id="editInvNotes" placeholder="Special arrangements or notes...">${Utils.escapeHTML(inv.notes || '')}</textarea>
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

App.handleEditInvitationSubmit = async function(e, invId) {
  e.preventDefault();
  const payload = {
    visit_date: document.getElementById('editInvDate').value,
    visit_time: document.getElementById('editInvTime').value,
    price: document.getElementById('editInvPrice').value.trim(),
    size: document.getElementById('editInvSize').value.trim(),
    duration: parseInt(document.getElementById('editInvDuration').value) || 60,
    status: document.getElementById('editInvStatus').value,
    location: document.getElementById('editInvLocation').value.trim(),
    notes: document.getElementById('editInvNotes').value.trim()
  };

  try {
    await API.put(`/invitations/${invId}`, payload);
    Utils.toast('Invitation updated successfully!');
    Utils.closeModal();
    App.reloadInvitationScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteInvitation = async function(invId) {
  if (!confirm('Are you sure you want to permanently delete this invitation and linked visit?')) return;
  try {
    await API.delete(`/invitations/${invId}?permanent=true`);
    Utils.toast('Invitation permanently deleted');
    App.reloadInvitationScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
