// Customer Management Component
App.renderCustomersList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading customers...</div>`;

  try {
    const data = await API.get('/customers');
    const customers = data.customers || [];
    const role = this.currentUser.role;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">RELATIONSHIP PIPELINE</div>
          <h1 class="page-title">Customer Management</h1>
          <p class="page-desc">Manage buyer inquiries, site visit history, preferences, and advisor assignments.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openAddCustomerModal()">
            + Add Customer
          </button>
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
        <input class="filter-input filter-search" id="custSearch" placeholder="Search customer name, mobile or code..." oninput="App.filterCustomersTable()">
        <select class="filter-input" id="custStatusFilter" onchange="App.filterCustomersTable()">
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
                    <strong>${Utils.escapeHTML(c.full_name)}</strong>
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
                      <button class="btn small soft" onclick="App.openCustomerProfile('${c.id}')">
                        Profile
                      </button>
                      <button class="btn small" onclick="App.openEditCustomerModal('${c.id}')">
                        Edit
                      </button>
                      ${role !== 'sales_associate' ? `
                        <button class="btn small" onclick="App.openReassignCustomerModal('${c.id}', '${Utils.escapeHTML(c.full_name)}')">
                          Reassign
                        </button>
                      ` : ''}
                      <button class="btn small danger" onclick="App.deleteCustomer('${c.id}', '${Utils.escapeHTML(c.full_name)}')">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
                    No customers found. Click "Add Customer" to create your first client record.
                  </td>
                </tr>
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

App.filterCustomersTable = Utils.debounce(function() {
  const query = (document.getElementById('custSearch')?.value || '').toLowerCase();
  const status = document.getElementById('custStatusFilter')?.value || '';
  const rows = document.querySelectorAll('#customersTable tbody tr');

  rows.forEach(r => {
    const s = r.getAttribute('data-search') || '';
    const st = r.getAttribute('data-status') || '';
    const matchesQuery = !query || s.includes(query);
    const matchesStatus = !status || st === status;
    r.style.display = matchesQuery && matchesStatus ? '' : 'none';
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

// Customer Profile & Timeline Modal
App.openCustomerProfile = async function(customerId) {
  Utils.showModal(`<div style="padding:40px; text-align:center; color:var(--muted);">Loading customer history...</div>`);

  try {
    const data = await API.get(`/customers/${customerId}`);
    const c = data.customer;
    const interactions = data.interactions || [];
    const visits = data.visits || [];

    const html = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
          <div class="eyebrow">${Utils.escapeHTML(c.customer_code)}</div>
          <h2 class="modal-title" style="margin-bottom:2px;">${Utils.escapeHTML(c.full_name)}</h2>
          <p style="color:var(--muted); font-size:12px;">${Utils.escapeHTML(c.mobile_number)} · ${Utils.escapeHTML(c.email || 'No email')}</p>
        </div>
        <span class="badge ${c.status}">${c.status.replace('_', ' ')}</span>
      </div>

      <!-- Specs Box -->
      <div style="background:var(--pale); border-radius:8px; padding:14px 18px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
        <div><strong style="color:var(--purple);">Budget:</strong> ${Utils.escapeHTML(c.budget || 'Not specified')}</div>
        <div><strong style="color:var(--purple);">Location:</strong> ${Utils.escapeHTML(c.preferred_location || 'Flexible')}</div>
        <div><strong style="color:var(--purple);">Interested In:</strong> ${Utils.escapeHTML(c.interested_project_name || 'General Inquiry')}</div>
        <div><strong style="color:var(--purple);">Advisor:</strong> ${Utils.escapeHTML(c.assigned_associate_name || 'Unassigned')}</div>
      </div>

      <div style="margin-bottom:18px;">
        <h4 style="font-size:13px; font-weight:600; margin-bottom:10px;">Activity Timeline & Interaction History</h4>
        <div style="max-height: 240px; overflow-y:auto; border:1px solid var(--line); border-radius:8px; padding:12px;">
          ${interactions.length ? interactions.map(i => `
            <div style="padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid var(--line); font-size:11.5px;">
              <div style="display:flex; justify-content:space-between; color:var(--muted); font-size:10.5px;">
                <strong style="color:var(--purple);">${Utils.escapeHTML(i.interaction_type)}</strong>
                <span>${Utils.formatDate(i.created_at)}</span>
              </div>
              <div style="margin-top:3px; color:var(--ink);">${Utils.escapeHTML(i.notes)}</div>
            </div>
          `).join('') : `
            <div style="color:var(--muted); font-size:11.5px; text-align:center; padding:20px;">No interaction notes recorded yet.</div>
          `}
        </div>
      </div>

      <!-- Add Note Input -->
      <form onsubmit="App.handleAddInteractionNote(event, '${c.id}')" style="margin-bottom:20px; display:flex; gap:8px;">
        <input id="newInteractionNote" required placeholder="Add follow-up call note or customer remark..." style="flex:1;">
        <button type="submit" class="btn primary small">Add Note</button>
      </form>

      <div style="display:flex; justify-content:flex-end;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Close</button>
      </div>
    `;

    Utils.showModal(html);
  } catch (err) {
    Utils.showModal(`<div style="padding:20px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`);
  }
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
    App.openCustomerProfile(customerId);
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
    App.renderCustomersList(document.getElementById('pageContent'));
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
    App.renderCustomersList(document.getElementById('pageContent'));
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
    App.renderCustomersList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteCustomer = async function(customerId, customerName) {
  if (!confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) return;

  try {
    const res = await API.delete(`/customers/${customerId}`);
    Utils.toast(res.message);
    App.renderCustomersList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
