// Customer Management Component
App.renderCustomersList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading customers...</div>`;

  try {
    if (!this.currentUser) {
      this.currentUser = (typeof API !== 'undefined' && API.getUser ? API.getUser() : null) || {};
    }
    const role = this.currentUser.role || 'admin';
    const userId = this.currentUser.id;
    // ORGANIZATION Customer Management: only this logged-in EMP's customers (admin included)
    const data = await API.get('/customers', role === 'admin' ? { mine: '1' } : {});
    let customers = data.customers || [];
    if (role === 'admin' || role === 'sales_associate') {
      customers = customers.filter(c =>
        c.assigned_associate_id === userId || c.assigned_sales_head_id === userId
      );
    }

    this.cache = this.cache || {};
    this.cache.orgCustomers = customers;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">RELATIONSHIP PIPELINE</div>
          <h1 class="page-title">Customer Management</h1>
          <p class="page-desc">${role === 'admin'
            ? 'Only customers assigned to you. Open MANAGEMENT → Customer for the full organization list.'
            : 'Your assigned customers only — invitation activity stays limited to what you sent.'}</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openAddCustomerModal()">
            + Add Customer
          </button>
          ${role === 'admin' ? `
          <button class="btn soft" onclick="App.navigate('management_customers')">
            Full Organization →
          </button>` : ''}
          <button class="btn" onclick="App.openImportCustomerModal()">
            Import CSV
          </button>
          <a href="/api/customers/export/csv" class="btn soft" target="_blank">
            Export CSV ↓
          </a>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <input class="filter-input filter-search" id="custSearch" placeholder="Search customer name, mobile or code..." oninput="App.filterCustomersTable(true)">
        <select class="filter-input" id="custStatusFilter" onchange="App.filterCustomersTable(true)">
          <option value="">All Statuses</option>
          <option value="lead">Lead</option>
          <option value="interested">Interested</option>
          <option value="visit_scheduled">Visit Scheduled</option>
          <option value="visited">Visited</option>
          <option value="negotiation">Negotiation</option>
          <option value="booked">Booked</option>
        </select>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="customersTable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer</th>
                <th>Budget / Pref</th>
                <th>Interested Project</th>
                <th>Assigned Associate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${customers.length ? customers.map(c => `
                <tr data-search="${Utils.escapeHTML((c.full_name + ' ' + c.mobile_number + ' ' + c.customer_code).toLowerCase())}" data-status="${c.status}">
                  <td><code>${Utils.escapeHTML(c.customer_code)}</code></td>
                  <td>
                    <button type="button" class="row-link" onclick="App.openCustomerDetail('${c.id}', 'customers')">${Utils.escapeHTML(c.full_name)}</button>
                    <small>${Utils.escapeHTML(c.mobile_number)} · ${Utils.escapeHTML(c.email || 'No email')}</small>
                  </td>
                  <td>
                    <strong>${Utils.escapeHTML(c.budget || 'Open')}</strong>
                    <small>${Utils.escapeHTML(c.preferred_location || 'Any location')}</small>
                  </td>
                  <td>
                    ${Utils.escapeHTML(c.interested_project_name || 'Exploring')}
                    <small>${Utils.escapeHTML(c.configuration || '')}</small>
                  </td>
                  <td>
                    ${Utils.escapeHTML(c.assigned_associate_name || 'Unassigned')}
                    <small>Head: ${Utils.escapeHTML(c.assigned_sales_head_name || 'Direct')}</small>
                  </td>
                  <td>
                    <span class="badge ${c.status}">${c.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn small soft" onclick="App.openCustomerDetail('${c.id}', 'customers')">View</button>
                      <button class="btn small soft" onclick="App.openEditCustomerModal('${c.id}')">Edit</button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
                    ${role === 'admin'
                      ? 'No customers are assigned to you here. Use MANAGEMENT → Customer to view every customer in the organization.'
                      : 'No customers found. Click "Add Customer" to create your first client record.'}
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        <div id="customersPagination" class="table-pagination"></div>
      </div>
    `;
    this.filterCustomersTable(true);
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.filterCustomersTable = Utils.debounce(function(resetPage) {
  const query = (document.getElementById('custSearch')?.value || '').toLowerCase();
  const status = document.getElementById('custStatusFilter')?.value || '';
  App.applyDomTablePager({
    key: 'customers',
    tableId: 'customersTable',
    pagerId: 'customersPagination',
    resetPage: resetPage === true,
    noun: 'customers',
    matchRow: (row) => {
      const s = row.getAttribute('data-search') || '';
      const st = row.getAttribute('data-status') || '';
      return (!query || s.includes(query)) && (!status || st === status);
    }
  });
}, 100);

// Add Customer Modal
App.openAddCustomerModal = async function() {
  // Preload projects and associates
  const [projsRes, assocRes] = await Promise.all([
    API.get('/projects'),
    API.get('/users/associates')
  ]);

  const projects = projsRes.projects || [];
  const associates = assocRes.associates || [];

  const html = `
    <h3 class="modal-title">Register New Customer Lead</h3>
    <p class="modal-desc">Automatic duplicate mobile number detection is enforced.</p>

    <form onsubmit="App.handleAddCustomerSubmit(event)">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:14px;">
        <div>
          <label>Full Name *</label>
          <input id="addCustName" required placeholder="e.g. Vikram Singhania">
        </div>
        <div>
          <label>Mobile Number *</label>
          <input id="addCustPhone" type="tel" required placeholder="+91 98100 12345">
        </div>
        <div>
          <label>WhatsApp Number</label>
          <input id="addCustWhatsApp" type="tel" placeholder="+91 98100 12345 (if different)">
        </div>
        <div>
          <label>Email Address</label>
          <input id="addCustEmail" type="email" placeholder="customer@company.com">
        </div>
        <div>
          <label>Budget Range</label>
          <input id="addCustBudget" placeholder="e.g. ₹5.00 Cr - ₹7.50 Cr">
        </div>
        <div>
          <label>Preferred Location</label>
          <input id="addCustLocation" placeholder="e.g. Golf Course Ext Rd">
        </div>
        <div>
          <label>Interested Project</label>
          <select id="addCustProject">
            <option value="">-- Select Project --</option>
            ${projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Assign to Sales Associate</label>
          <select id="addCustAssociate">
            ${associates.map(a => `<option value="${a.id}" ${a.id === this.currentUser.id ? 'selected' : ''}>${Utils.escapeHTML(a.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label>Lead Source</label>
        <select id="addCustSource">
          <option value="Direct Walk-in">Direct Walk-in</option>
          <option value="Digital Ads">Digital Ads / Google</option>
          <option value="Referral">Client Referral</option>
          <option value="Channel Partner">Channel Partner</option>
          <option value="Instagram">Instagram / Social</option>
        </select>
      </div>

      <div style="margin-bottom:18px;">
        <label>Specific Buyer Requirements</label>
        <textarea id="addCustReq" placeholder="Unit floor preference, family size, timeline to purchase..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Register Customer</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleAddCustomerSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    full_name: document.getElementById('addCustName').value.trim(),
    mobile_number: document.getElementById('addCustPhone').value.trim(),
    whatsapp_number: document.getElementById('addCustWhatsApp').value.trim(),
    email: document.getElementById('addCustEmail').value.trim(),
    budget: document.getElementById('addCustBudget').value.trim(),
    preferred_location: document.getElementById('addCustLocation').value.trim(),
    interested_project_id: document.getElementById('addCustProject').value || null,
    assigned_associate_id: document.getElementById('addCustAssociate').value || null,
    lead_source: document.getElementById('addCustSource').value,
    requirements: document.getElementById('addCustReq').value.trim()
  };

  try {
    const res = await API.post('/customers', payload);
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderCustomersList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openCustomerDetail = function(customerId, returnPage) {
  this.selectedCustomerId = customerId;
  this.customerDetailReturnPage = returnPage || this.activePage || 'management_customers';
  this.navigate('customer_detail');
};

App.reloadCustomerScreen = function() {
  const container = document.getElementById('pageContent');
  if (!container) return;
  if (this.activePage === 'customer_detail') return this.renderCustomerDetail(container);
  if (this.activePage === 'management_customers') return this.renderManagementCustomers(container);
  return this.renderCustomersList(container);
};

App.managementCustomerFilters = App.managementCustomerFilters || {
  search: '',
  teams: [],
  members: [],
  projects: [],
  statuses: []
};

App.normalizeManagementCustomerFilters = function() {
  const current = this.managementCustomerFilters || {};
  const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
  this.managementCustomerFilters = {
    search: current.search || '',
    teams: asList(current.teams),
    members: asList(current.members),
    projects: asList(current.projects),
    statuses: asList(current.statuses)
  };
  return this.managementCustomerFilters;
};

App.applyManagementCustomerFilters = function(customers, filters) {
  const query = String(filters.search || '').trim().toLowerCase();
  return (customers || []).filter(customer => {
    const matchesSearch = !query || [
      customer.full_name,
      customer.mobile_number,
      customer.customer_code,
      customer.email,
      customer.assigned_associate_name,
      customer.assigned_sales_head_name,
      customer.interested_project_name
    ].join(' ').toLowerCase().includes(query);
    const matchesTeam = !filters.teams.length || filters.teams.includes(String(customer.assigned_sales_head_id || ''));
    const matchesMember = !filters.members.length || filters.members.includes(String(customer.assigned_associate_id || ''));
    const matchesProject = !filters.projects.length || filters.projects.includes(String(customer.interested_project_id || ''));
    const matchesStatus = !filters.statuses.length || filters.statuses.includes(String(customer.status || ''));
    return matchesSearch && matchesTeam && matchesMember && matchesProject && matchesStatus;
  });
};

App.managementCustomerRow = function(customer) {
  return `
    <tr>
      <td><code>${Utils.escapeHTML(customer.customer_code || '')}</code></td>
      <td>
        <button type="button" class="row-link" onclick="App.openCustomerDetail('${customer.id}', 'management_customers')">${Utils.escapeHTML(customer.full_name || '')}</button>
        <small>${Utils.escapeHTML(customer.mobile_number || '')} · ${Utils.escapeHTML(customer.email || 'No email')}</small>
      </td>
      <td>
        <strong>${Utils.escapeHTML(customer.budget || 'Open')}</strong>
        <small>${Utils.escapeHTML(customer.preferred_location || 'Any location')}</small>
      </td>
      <td>
        ${Utils.escapeHTML(customer.interested_project_name || 'Exploring')}
        <small>${Utils.escapeHTML(customer.configuration || '')}</small>
      </td>
      <td>
        ${Utils.escapeHTML(customer.assigned_associate_name || 'Unassigned')}
        <small>Head: ${Utils.escapeHTML(customer.assigned_sales_head_name || 'Direct')}</small>
      </td>
      <td><span class="badge ${customer.status}">${Utils.escapeHTML(String(customer.status || '').replace(/_/g, ' '))}</span></td>
      <td>
        <div class="actions">
          <button class="btn small soft" onclick="App.openCustomerDetail('${customer.id}', 'management_customers')">View</button>
          <button class="btn small soft" onclick="App.openEditCustomerModal('${customer.id}')">Edit</button>
        </div>
      </td>
    </tr>
  `;
};

App.paintManagementCustomers = function(customers, filters, options = {}) {
  const filtered = this.applyManagementCustomerFilters(customers, filters);
  this.pagerRefresh.management_customers = () => {
    this.paintManagementCustomers(this.cache?.customers || [], this.normalizeManagementCustomerFilters());
  };
  const pageData = this.paginateList(filtered, 'management_customers', options);
  const body = document.getElementById('mgmtCustomersBody');
  if (body) {
    body.innerHTML = pageData.total
      ? pageData.items.map(customer => this.managementCustomerRow(customer)).join('')
      : `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">No customers match these filters.</td></tr>`;
  }

  const count = document.getElementById('mgmtCustFilterCount');
  if (count) {
    count.textContent = pageData.total
      ? `${pageData.label} customer${pageData.total === 1 ? '' : 's'}`
      : '0 customers';
  }

  this.renderPager('mgmtCustPagination', 'management_customers', pageData.total, pageData.page, pageData.pageSize, pageData.totalPages, 'customers');
};

App.renderManagementCustomers = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading customers...</div>`;

  try {
    const filters = this.normalizeManagementCustomerFilters();
    const [data, usersRes, projectsRes] = await Promise.all([
      API.get('/customers'),
      API.get('/users').catch(() => ({ users: [] })),
      API.get('/projects').catch(() => ({ projects: [] }))
    ]);
    const customers = data.customers || [];
    const users = usersRes.users || [];
    const heads = users
      .filter(user => user.role === 'sales_head' && user.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
    const members = users
      .filter(user => user.role === 'sales_associate' && user.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
    const projects = (projectsRes.projects || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    this.cache = this.cache || {};
    this.cache.customers = customers;

    const selectionLabel = (count, emptyLabel) => count ? `${count} Selected` : emptyLabel;
    const statusOptions = [
      { id: 'lead', name: 'Lead' },
      { id: 'interested', name: 'Interested' },
      { id: 'visit_scheduled', name: 'Visit Scheduled' },
      { id: 'visited', name: 'Visited' },
      { id: 'negotiation', name: 'Negotiation' },
      { id: 'booked', name: 'Booked' },
      { id: 'inactive', name: 'Inactive' }
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
          <div class="eyebrow">MANAGEMENT</div>
          <h1 class="page-title">Customer</h1>
          <p class="page-desc">Filter customers by team, member, project and status, then open the full detail page.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openAddCustomerModal()">+ Add Customer</button>
        </div>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="mgmtCustSearch" placeholder="Name, mobile, code or advisor" value="${Utils.escapeHTML(filters.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault();App.searchManagementCustomers();}">
          </label>
        </div>
        <div class="inv-filters-grid">
          <div class="inv-filter-field">
            <span>Team</span>
            ${multiSelect('mgmtCustTeam', 'All Teams', heads.map(head => ({ id: head.id, name: head.name })), filters.teams, 'App.onManagementCustomerTeamsChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Member</span>
            ${multiSelect('mgmtCustMember', 'All Members', members.map(member => ({ id: member.id, name: member.name, sales_head_id: member.sales_head_id || '' })), filters.members, 'App.onManagementCustomerMembersChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Project</span>
            ${multiSelect('mgmtCustProject', 'All Projects', projects.map(project => ({ id: project.id, name: project.name })), filters.projects, 'App.onManagementCustomerProjectsChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Status</span>
            ${multiSelect('mgmtCustStatus', 'All Statuses', statusOptions, filters.statuses, 'App.onManagementCustomerStatusesChange()')}
          </div>
        </div>
        <div class="inv-filters-actions">
          <span id="mgmtCustFilterCount" class="inv-filter-count"></span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetManagementCustomerFilters()">Reset</button>
            <button type="button" class="btn small primary" id="mgmtCustSearchBtn" onclick="App.searchManagementCustomers()">Search</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="mgmtCustomersTable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer</th>
                <th>Budget / Pref</th>
                <th>Interested Project</th>
                <th>Assigned Associate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="mgmtCustomersBody"></tbody>
          </table>
        </div>
        <div id="mgmtCustPagination" class="table-pagination"></div>
      </div>
    `;
    this.paintManagementCustomers(customers, filters);
    this.onManagementCustomerTeamsChange();
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.checkedManagementCustomerValues = function(optionsId) {
  return [...document.querySelectorAll(`#${optionsId} input:checked`)].map(input => input.value);
};

App.setManagementCustomerMultiLabel = function(labelId, count, emptyLabel) {
  const label = document.getElementById(labelId);
  if (label) label.textContent = count ? `${count} Selected` : emptyLabel;
};

App.onManagementCustomerTeamsChange = function() {
  const teams = this.checkedManagementCustomerValues('mgmtCustTeamOptions');
  this.setManagementCustomerMultiLabel('mgmtCustTeamLabel', teams.length, 'All Teams');
  document.querySelectorAll('#mgmtCustMemberOptions .multi-select-item').forEach(item => {
    const headId = item.getAttribute('data-head') || '';
    const visible = !teams.length || teams.includes(headId);
    item.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      const box = item.querySelector('input');
      if (box) box.checked = false;
    }
  });
  this.onManagementCustomerMembersChange();
};

App.onManagementCustomerMembersChange = function() {
  const count = this.checkedManagementCustomerValues('mgmtCustMemberOptions').length;
  this.setManagementCustomerMultiLabel('mgmtCustMemberLabel', count, 'All Members');
};

App.onManagementCustomerProjectsChange = function() {
  const count = this.checkedManagementCustomerValues('mgmtCustProjectOptions').length;
  this.setManagementCustomerMultiLabel('mgmtCustProjectLabel', count, 'All Projects');
};

App.onManagementCustomerStatusesChange = function() {
  const count = this.checkedManagementCustomerValues('mgmtCustStatusOptions').length;
  this.setManagementCustomerMultiLabel('mgmtCustStatusLabel', count, 'All Statuses');
};

App.readManagementCustomerFilters = function() {
  return {
    search: (document.getElementById('mgmtCustSearch')?.value || '').trim(),
    teams: this.checkedManagementCustomerValues('mgmtCustTeamOptions'),
    members: this.checkedManagementCustomerValues('mgmtCustMemberOptions'),
    projects: this.checkedManagementCustomerValues('mgmtCustProjectOptions'),
    statuses: this.checkedManagementCustomerValues('mgmtCustStatusOptions')
  };
};

App.searchManagementCustomers = async function() {
  const filters = this.readManagementCustomerFilters();
  this.managementCustomerFilters = filters;
  const button = document.getElementById('mgmtCustSearchBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Searching...';
  }
  try {
    const data = await API.get('/customers');
    this.cache = this.cache || {};
    this.cache.customers = data.customers || [];
    this.paintManagementCustomers(this.cache.customers, filters, { resetPage: true });
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Search';
    }
  }
};

App.resetManagementCustomerFilters = function() {
  this.managementCustomerFilters = { search: '', teams: [], members: [], projects: [], statuses: [] };
  this.ensurePager('management_customers', { resetPage: true });
  const search = document.getElementById('mgmtCustSearch');
  if (search) search.value = '';
  document.querySelectorAll('#mgmtCustTeamOptions input, #mgmtCustMemberOptions input, #mgmtCustProjectOptions input, #mgmtCustStatusOptions input').forEach(input => {
    input.checked = false;
  });
  document.querySelectorAll('#mgmtCustMemberOptions .multi-select-item').forEach(item => {
    item.style.display = 'flex';
  });
  this.onManagementCustomerTeamsChange();
  this.onManagementCustomerProjectsChange();
  this.onManagementCustomerStatusesChange();
  this.searchManagementCustomers();
};

App.renderCustomerDetail = async function(container) {
  const customerId = this.selectedCustomerId;
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading customer...</div>`;
  if (!customerId) {
    container.innerHTML = `<div class="panel" style="padding:30px;">Choose a customer from the list.</div>`;
    return;
  }

  try {
    if (!this.currentUser) {
      this.currentUser = (typeof API !== 'undefined' && API.getUser ? API.getUser() : null) || {};
    }
    const role = this.currentUser.role || 'admin';
    const returnPage = this.customerDetailReturnPage || 'management_customers';
    const orgEmpView = returnPage === 'customers' || role === 'sales_associate' || role === 'sales_head';
    const detailQuery = (orgEmpView && role === 'admin') ? { emp_scope: '1' } : {};
    const data = await API.get(`/customers/${customerId}`, detailQuery);
    const c = data.customer;
    let interactions = data.interactions || [];
    const invitations = data.invitations || [];
    const visits = data.visits || [];
    const followups = data.followups || [];
    const crumb = document.getElementById('topbarCrumb');
    if (crumb) crumb.textContent = c.full_name;

    if (orgEmpView) {
      interactions = this.filterEmpInvitationSentNotes(interactions, c);
    }

    const invitationRows = invitations.slice(0, 12).map(invitation => `
      <tr>
        <td>${Utils.escapeHTML(invitation.project_name || '—')}</td>
        <td><strong>${Utils.formatDate(String(invitation.visit_date || '').slice(0, 10))}</strong><small>${Utils.formatTime(invitation.visit_time)}</small></td>
        <td>${Utils.escapeHTML(invitation.associate_name || '—')}</td>
        <td><span class="badge ${invitation.status}">${Utils.escapeHTML(String(invitation.status || '').replace(/_/g, ' '))}</span></td>
      </tr>
    `).join('');
    const visitRows = visits.slice(0, 10).map(visit => `
      <tr>
        <td>${Utils.escapeHTML(visit.project_name || '—')}</td>
        <td>${Utils.formatDate(String(visit.scheduled_date || '').slice(0, 10))} <small>${Utils.formatTime(visit.scheduled_time)}</small></td>
        <td>${Utils.escapeHTML(visit.associate_name || '—')}</td>
        <td><span class="badge ${visit.status}">${Utils.escapeHTML(String(visit.status || '').replace(/_/g, ' '))}</span></td>
      </tr>
    `).join('');
    const followupRows = followups.slice(0, 8).map(followup => `
      <tr>
        <td>${Utils.formatDate(String(followup.follow_up_date || '').slice(0, 10))}</td>
        <td>${Utils.escapeHTML(followup.notes || followup.follow_up_type || '—')}</td>
        <td>${Utils.escapeHTML(followup.associate_name || '—')}</td>
        <td><span class="badge ${followup.status}">${Utils.escapeHTML(String(followup.status || '').replace(/_/g, ' '))}</span></td>
      </tr>
    `).join('');
    const interactionRows = interactions.slice(0, 12).map(item => `
      <tr>
        <td><strong>${Utils.escapeHTML(item.interaction_type || 'Note')}</strong></td>
        <td>${Utils.escapeHTML(item.notes || '')}</td>
        <td>${Utils.escapeHTML(item.user_name || '—')}</td>
        <td>${Utils.formatDate(String(item.created_at || '').slice(0, 10))}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">${Utils.escapeHTML(c.customer_code || 'CUSTOMER')}</div>
          <h1 class="page-title">${Utils.escapeHTML(c.full_name)}</h1>
          <p class="page-desc">${Utils.escapeHTML(c.mobile_number || '')}${c.email ? ` · ${Utils.escapeHTML(c.email)}` : ''}</p>
        </div>
        <div class="actions">
          <button class="btn" onclick="App.navigate('${returnPage}')">Back to Customer</button>
          <button class="btn small soft" onclick="App.openEditCustomerModal('${c.id}')">Edit</button>
          ${role !== 'sales_associate' ? `<button class="btn small" onclick="App.openReassignCustomerModal('${c.id}', '${Utils.escapeHTML(c.full_name)}')">Reassign</button>` : ''}
          <button class="btn small danger" onclick="App.deleteCustomer('${c.id}', '${Utils.escapeHTML(c.full_name)}')">Delete</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card purple"><div class="kpi-label">Status</div><div class="kpi-value" style="font-size:20px;"><span class="badge ${c.status}">${Utils.escapeHTML(String(c.status || '').replace(/_/g, ' '))}</span></div><div class="kpi-sub">Lead source: ${Utils.escapeHTML(c.lead_source || 'Direct')}</div></div>
        <div class="kpi-card blue"><div class="kpi-label">Advisor</div><div class="kpi-value" style="font-size:18px;">${Utils.escapeHTML(c.assigned_associate_name || 'Unassigned')}</div><div class="kpi-sub">Head: ${Utils.escapeHTML(c.assigned_sales_head_name || 'Direct')}</div></div>
        <div class="kpi-card gold"><div class="kpi-label">Invitations</div><div class="kpi-value">${invitations.length}</div><div class="kpi-sub">${visits.length} visits</div></div>
        <div class="kpi-card green"><div class="kpi-label">Follow-ups</div><div class="kpi-value">${followups.length}</div><div class="kpi-sub">${interactions.length} ${orgEmpView ? 'invitation sent' : 'notes'}</div></div>
      </div>

      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header"><h3 class="panel-title">Profile</h3></div>
        <div style="padding:18px 20px; display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px;">
          <div><div class="kpi-label">Mobile</div><strong>${Utils.escapeHTML(c.mobile_number || '—')}</strong></div>
          <div><div class="kpi-label">WhatsApp</div><strong>${Utils.escapeHTML(c.whatsapp_number || c.mobile_number || '—')}</strong></div>
          <div><div class="kpi-label">Email</div><strong>${Utils.escapeHTML(c.email || '—')}</strong></div>
          <div><div class="kpi-label">Budget</div><strong>${Utils.escapeHTML(c.budget || 'Open')}</strong></div>
          <div><div class="kpi-label">Preferred Location</div><strong>${Utils.escapeHTML(c.preferred_location || 'Flexible')}</strong></div>
          <div><div class="kpi-label">Interested Project</div><strong>${Utils.escapeHTML(c.interested_project_name || 'Exploring')}</strong></div>
          <div><div class="kpi-label">Configuration</div><strong>${Utils.escapeHTML(c.configuration || '—')}</strong></div>
          <div><div class="kpi-label">Developer</div><strong>${Utils.escapeHTML(c.developer_name || '—')}</strong></div>
        </div>
        ${c.requirements ? `<div style="padding:0 20px 18px; font-size:12.5px; color:var(--muted);"><strong style="color:var(--ink);">Requirements:</strong> ${Utils.escapeHTML(c.requirements)}</div>` : ''}
      </div>

      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header"><h3 class="panel-title">${orgEmpView ? `Invitation Sent (${interactions.length})` : `Activity Notes (${interactions.length})`}</h3></div>
        ${orgEmpView ? '' : `
        <div style="padding:16px 20px; border-bottom:1px solid var(--line);">
          <form onsubmit="App.handleAddInteractionNote(event, '${c.id}')" style="display:flex; gap:8px;">
            <input id="newInteractionNote" required placeholder="Add follow-up call note or customer remark..." style="flex:1;">
            <button type="submit" class="btn primary small">Add Note</button>
          </form>
        </div>`}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Notes</th><th>By</th><th>Date</th></tr></thead>
            <tbody>
              ${interactionRows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">${orgEmpView ? 'No invitation sent activity for this employee yet.' : 'No interaction notes yet.'}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header"><h3 class="panel-title">Invitations (${invitations.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Schedule</th><th>Sent By</th><th>Status</th></tr></thead>
            <tbody>
              ${invitationRows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No invitations yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header"><h3 class="panel-title">Site Visits (${visits.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Schedule</th><th>Advisor</th><th>Status</th></tr></thead>
            <tbody>
              ${visitRows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No site visits yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3 class="panel-title">Follow-ups (${followups.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Notes</th><th>Advisor</th><th>Status</th></tr></thead>
            <tbody>
              ${followupRows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No follow-ups yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.filterEmpInvitationSentNotes = function(interactions, customer) {
  const user = this.currentUser || {};
  const role = user.role || 'admin';
  const isInvitationSent = (type) => {
    const value = String(type || '').trim().toLowerCase();
    return value === 'invitation sent' || value === 'sent';
  };
  let list = (interactions || []).filter(item => isInvitationSent(item.interaction_type));
  if (role === 'sales_associate') {
    list = list.filter(item => item.user_id === user.id);
  } else if (role === 'sales_head') {
    list = list.filter(item => item.user_id === user.id || item.user_id === customer.assigned_associate_id);
  } else {
    const empId = customer.assigned_associate_id || customer.assigned_sales_head_id;
    if (empId) list = list.filter(item => item.user_id === empId);
  }
  return list;
};

App.handleAddInteractionNote = async function(e, customerId) {
  e.preventDefault();
  const input = document.getElementById('newInteractionNote');
  const notes = input.value.trim();
  if (!notes) return;

  try {
    await API.post(`/customers/${customerId}/interactions`, {
      interaction_type: 'Call / Follow-up Note',
      notes
    });
    Utils.toast('Interaction note added!');
    App.reloadCustomerScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Reassign Customer Modal
App.openReassignCustomerModal = async function(customerId, customerName) {
  const assocRes = await API.get('/users/associates');
  const associates = assocRes.associates || [];

  const html = `
    <h3 class="modal-title">Reassign Customer</h3>
    <p class="modal-desc">Select a new Sales Associate for ${Utils.escapeHTML(customerName)}.</p>

    <form onsubmit="App.handleReassignCustomerSubmit(event, '${customerId}')">
      <div style="margin-bottom:18px;">
        <label>Sales Associate</label>
        <select id="reassignAssociateSelect" required>
          ${associates.map(a => `
            <option value="${a.id}">
              ${Utils.escapeHTML(a.name)} (${Utils.escapeHTML(a.sales_head_name ? 'Team: ' + a.sales_head_name : 'Direct')})
            </option>
          `).join('')}
        </select>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Confirm Reassignment</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleReassignCustomerSubmit = async function(e, customerId) {
  e.preventDefault();
  const associate_id = document.getElementById('reassignAssociateSelect').value;

  try {
    const res = await API.patch(`/customers/${customerId}/reassign`, { associate_id });
    Utils.toast(res.message);
    Utils.closeModal();
    App.reloadCustomerScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Import CSV Modal
App.openImportCustomerModal = function() {
  const html = `
    <h3 class="modal-title">Import Customers via CSV</h3>
    <p class="modal-desc">Paste comma-separated rows or a CSV file content with columns: full_name, mobile_number, email, budget, preferred_location</p>

    <form onsubmit="App.handleImportCustomerSubmit(event)">
      <div style="margin-bottom:16px;">
        <label>CSV Content</label>
        <textarea id="importCSVContent" required style="min-height:160px; font-family:monospace; font-size:11px;" placeholder="full_name,mobile_number,email,budget,preferred_location
Rohan Singhania,+919810123456,rohan@example.com,5 Cr,Golf Course Ext
Priya Mehta,+919820234567,priya@example.com,7 Cr,Noida Expressway"></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Start Import</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleImportCustomerSubmit = async function(e) {
  e.preventDefault();
  const csvContent = document.getElementById('importCSVContent').value.trim();

  try {
    const res = await API.post('/customers/import/csv', { csvContent });
    Utils.toast(`Import complete: ${res.imported} imported, ${res.skipped} duplicates skipped.`);
    Utils.closeModal();
    App.reloadCustomerScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Edit Customer Modal
App.openEditCustomerModal = async function(customerId) {
  Utils.showModal(`<div style="padding:40px; text-align:center; color:var(--muted);">Loading customer details...</div>`);

  try {
    const [custRes, projsRes] = await Promise.all([
      API.get(`/customers/${customerId}`),
      API.get('/projects')
    ]);

    const c = custRes.customer;
    const projects = projsRes.projects || [];

    const html = `
      <h3 class="modal-title">Edit Customer Profile</h3>
      <p class="modal-desc">Update buyer information and status for ${Utils.escapeHTML(c.full_name)}.</p>

      <form onsubmit="App.handleEditCustomerSubmit(event, '${c.id}')">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:14px;">
          <div>
            <label>Full Name *</label>
            <input id="editCustName" required value="${Utils.escapeHTML(c.full_name)}">
          </div>
          <div>
            <label>Mobile Number *</label>
            <input id="editCustPhone" type="tel" required value="${Utils.escapeHTML(c.mobile_number)}">
          </div>
          <div>
            <label>WhatsApp Number</label>
            <input id="editCustWhatsApp" type="tel" value="${Utils.escapeHTML(c.whatsapp_number || '')}">
          </div>
          <div>
            <label>Email Address</label>
            <input id="editCustEmail" type="email" value="${Utils.escapeHTML(c.email || '')}">
          </div>
          <div>
            <label>Budget Range</label>
            <input id="editCustBudget" value="${Utils.escapeHTML(c.budget || '')}">
          </div>
          <div>
            <label>Preferred Location</label>
            <input id="editCustLocation" value="${Utils.escapeHTML(c.preferred_location || '')}">
          </div>
          <div>
            <label>Interested Project</label>
            <select id="editCustProject">
              <option value="">-- None / General --</option>
              ${projects.map(p => `
                <option value="${p.id}" ${p.id === c.interested_project_id ? 'selected' : ''}>
                  ${Utils.escapeHTML(p.name)}
                </option>
              `).join('')}
            </select>
          </div>
          <div>
            <label>Pipeline Status</label>
            <select id="editCustStatus">
              <option value="lead" ${c.status === 'lead' ? 'selected' : ''}>Lead</option>
              <option value="interested" ${c.status === 'interested' ? 'selected' : ''}>Interested</option>
              <option value="visit_scheduled" ${c.status === 'visit_scheduled' ? 'selected' : ''}>Visit Scheduled</option>
              <option value="visited" ${c.status === 'visited' ? 'selected' : ''}>Visited</option>
              <option value="negotiation" ${c.status === 'negotiation' ? 'selected' : ''}>Negotiation</option>
              <option value="booked" ${c.status === 'booked' ? 'selected' : ''}>Booked</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label>Lead Source</label>
          <input id="editCustSource" value="${Utils.escapeHTML(c.lead_source || 'Direct')}">
        </div>

        <div style="margin-bottom:18px;">
          <label>Specific Buyer Requirements</label>
          <textarea id="editCustReq">${Utils.escapeHTML(c.requirements || '')}</textarea>
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

App.handleEditCustomerSubmit = async function(e, customerId) {
  e.preventDefault();
  const payload = {
    full_name: document.getElementById('editCustName').value.trim(),
    mobile_number: document.getElementById('editCustPhone').value.trim(),
    whatsapp_number: document.getElementById('editCustWhatsApp').value.trim(),
    email: document.getElementById('editCustEmail').value.trim(),
    budget: document.getElementById('editCustBudget').value.trim(),
    preferred_location: document.getElementById('editCustLocation').value.trim(),
    interested_project_id: document.getElementById('editCustProject').value || null,
    status: document.getElementById('editCustStatus').value,
    lead_source: document.getElementById('editCustSource').value.trim(),
    requirements: document.getElementById('editCustReq').value.trim()
  };

  try {
    await API.put(`/customers/${customerId}`, payload);
    Utils.toast('Customer profile updated successfully!');
    Utils.closeModal();
    App.reloadCustomerScreen();
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteCustomer = async function(customerId, customerName) {
  if (!confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) return;

  try {
    const res = await API.delete(`/customers/${customerId}`);
    Utils.toast(res.message);
    if (App.activePage === 'customer_detail' && App.selectedCustomerId === customerId) {
      App.navigate(App.customerDetailReturnPage || 'management_customers');
    } else {
      App.reloadCustomerScreen();
    }
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
