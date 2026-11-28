// Leads List, Duplicate Review, Assignment & Lead Detail Component
App.leadsListState = {
  page: 1,
  limit: 15,
  search: '',
  date_from: '',
  date_to: '',
  team_id: '',
  associate_id: '',
  developer_id: '',
  project_id: '',
  stage: '',
  source: '',
  duplicate_status: ''
};

App.onLeadsFilterChange = function(key, value) {
  App.leadsListState[key] = value;
  if (key === 'developer_id') App.leadsListState.project_id = '';
  if (key === 'team_id') App.leadsListState.associate_id = '';
  App.leadsListState.page = 1;
  App.renderLeadsList(document.getElementById('pageContent'));
};

App.resetLeadsFilters = function() {
  App.leadsListState = {
    page: 1, limit: 15, search: '', date_from: '', date_to: '',
    team_id: '', associate_id: '', developer_id: '', project_id: '',
    stage: '', source: '', duplicate_status: ''
  };
  App.renderLeadsList(document.getElementById('pageContent'));
};

App.renderLeadsList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading leads...</div>`;
  try {
    const user = this.currentUser || {};
    const role = user.role || 'sales_associate';
    const [leadsRes, catalog] = await Promise.all([
      API.get('/leads', App.leadsListState),
      App.getFilterCatalog()
    ]);

    const leads = leadsRes.leads || [];
    const pagination = leadsRes.pagination || { page: 1, totalPages: 1, total: 0 };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">LEAD MANAGEMENT</div>
          <h1 class="page-title">${role === 'sales_associate' ? 'My Leads' : (role === 'sales_head' ? 'Team Leads' : 'All Organization Leads')}</h1>
          <p class="page-desc">Manage enquiries, stage progression, duplicate reviews, site visit scheduling, and attribution.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openAddLeadModal()">+ Add Lead</button>
          <button class="btn soft" onclick="App.navigate('lead_pipeline')">Kanban Pipeline</button>
        </div>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="leadSearchInput" placeholder="Search ref, customer, mobile, builder or project..." value="${Utils.escapeHTML(App.leadsListState.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault(); App.leadsListState.search=this.value; App.leadsListState.page=1; App.renderLeadsList(document.getElementById('pageContent'));}">
          </label>
        </div>
        <div class="inv-filters-grid">
          ${App.buildStandardFilterFieldsHtml({
            state: App.leadsListState,
            catalog,
            onChangeHandler: 'App.onLeadsFilterChange',
            idPrefix: 'ld'
          })}
          <label class="inv-filter-field">
            <span>Stage</span>
            <select onchange="App.onLeadsFilterChange('stage', this.value)">
              <option value="">All Stages</option>
              <option value="new_lead" ${App.leadsListState.stage === 'new_lead' ? 'selected' : ''}>New Lead</option>
              <option value="contacted" ${App.leadsListState.stage === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="interested" ${App.leadsListState.stage === 'interested' ? 'selected' : ''}>Interested</option>
              <option value="site_visit_scheduled" ${App.leadsListState.stage === 'site_visit_scheduled' ? 'selected' : ''}>Site Visit Scheduled</option>
              <option value="site_visit_completed" ${App.leadsListState.stage === 'site_visit_completed' ? 'selected' : ''}>Site Visit Completed</option>
              <option value="negotiation" ${App.leadsListState.stage === 'negotiation' ? 'selected' : ''}>Negotiation</option>
              <option value="booked_won" ${App.leadsListState.stage === 'booked_won' ? 'selected' : ''}>Booked / Won</option>
              <option value="lost" ${App.leadsListState.stage === 'lost' ? 'selected' : ''}>Lost</option>
            </select>
          </label>
          ${role !== 'sales_associate' ? `
            <label class="inv-filter-field">
              <span>Duplicate Status</span>
              <select onchange="App.onLeadsFilterChange('duplicate_status', this.value)">
                <option value="">All Duplicate Status</option>
                <option value="duplicate_flagged" ${App.leadsListState.duplicate_status === 'duplicate_flagged' ? 'selected' : ''}>Flagged Duplicates</option>
                <option value="existing_customer_new_project" ${App.leadsListState.duplicate_status === 'existing_customer_new_project' ? 'selected' : ''}>Existing Customer (New Project)</option>
              </select>
            </label>
          ` : ''}
        </div>
        <div class="inv-filters-actions">
          <span class="inv-filter-count">${pagination.total} lead${pagination.total === 1 ? '' : 's'}</span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetLeadsFilters()">Reset</button>
            <button type="button" class="btn small primary" onclick="App.leadsListState.search=document.getElementById('leadSearchInput').value; App.leadsListState.page=1; App.renderLeadsList(document.getElementById('pageContent'));">Search</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Enquiry Ref</th>
                <th>Customer</th>
                <th>Project & Config</th>
                <th>Employee Name</th>
                <th>Stage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${leads.length ? leads.map(l => `
                <tr>
                  <td>
                    <code>${Utils.escapeHTML(l.enquiry_ref)}</code>
                    <small>${Utils.formatDate(l.submitted_at)}</small>
                    ${l.duplicate_status && l.duplicate_status !== 'unique' ? `<span class="badge pending" style="margin-top:4px; font-size:10px;">${Utils.escapeHTML(l.duplicate_status.replace(/_/g, ' '))}</span>` : ''}
                  </td>
                  <td>
                    <button type="button" class="row-link" onclick="App.openCustomer360('${l.customer_id}')">${Utils.escapeHTML(l.customer_name)}</button>
                    <small>${Utils.escapeHTML(l.customer_mobile)} · ${Utils.escapeHTML(l.city || '')}</small>
                  </td>
                  <td>
                    <strong>${Utils.escapeHTML(l.project_name || '—')}</strong>
                    <small>${Utils.escapeHTML(l.apartment_size || '')}${l.budget ? ` · ${Utils.escapeHTML(l.budget)}` : ''}</small>
                  </td>
                  <td>
                    ${App.formatLeadEmployeeCell(l)}
                  </td>
                  <td>
                    <span class="badge lead-stage-${l.stage}">${Utils.escapeHTML(l.stage.replace(/_/g, ' '))}</span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn small primary" onclick="App.openLeadDetailModal('${l.id}')">Manage</button>
                      <button class="btn small soft" onclick="App.openCustomer360('${l.customer_id}')">360°</button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; padding:36px; color:var(--muted);">No leads match these criteria.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="table-pagination">
          <div class="table-pagination-meta"><span>Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} leads</span></div>
          <div class="table-pagination-nav">
            <button class="page-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="App.leadsListState.page=${pagination.page - 1}; App.renderLeadsList(document.getElementById('pageContent'));">Prev</button>
            <button class="page-btn" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="App.leadsListState.page=${pagination.page + 1}; App.renderLeadsList(document.getElementById('pageContent'));">Next</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.openAddLeadModal = async function() {
  const projsRes = await API.get('/projects').catch(() => ({ projects: [] }));
  const projects = projsRes.projects || [];
  Utils.showModal(`
    <form onsubmit="App.handleAddLeadSubmit(event)" style="text-align:left;">
      <h3 style="margin-bottom:14px;">Create Manual Lead</h3>
      <div class="fields-grid">
        <div><label>Full Name *</label><input id="newLeadName" required></div>
        <div><label>Mobile Number *</label><input id="newLeadMobile" required placeholder="+91 98100 12345"></div>
        <div><label>Email</label><input id="newLeadEmail" type="email"></div>
        <div><label>City *</label><input id="newLeadCity" required placeholder="Gurgaon"></div>
        <div><label>Project</label>
          <select id="newLeadProject">
            <option value="">Select Project</option>
            ${projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)}</option>`).join('')}
          </select>
        </div>
        <div><label>Apartment Size</label><input id="newLeadSize" placeholder="e.g. 3 BHK Luxury"></div>
        <div><label>Budget</label><input id="newLeadBudget" placeholder="e.g. ₹3.5 Cr"></div>
        <div><label>Purchase Timeline</label>
          <select id="newLeadTimeline">
            <option value="Immediate / Ready to Move">Immediate / Ready to Move</option>
            <option value="Within 3 Months" selected>Within 3 Months</option>
            <option value="3 - 6 Months">3 - 6 Months</option>
            <option value="6 - 12 Months">6 - 12 Months</option>
          </select>
        </div>
      </div>
      <div style="margin-top:12px;"><label>Requirements</label><textarea id="newLeadReq" rows="2"></textarea></div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button type="button" class="btn soft" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Create Lead</button>
      </div>
    </form>
  `);
};

App.handleAddLeadSubmit = async function(e) {
  e.preventDefault();
  try {
    await API.post('/leads', {
      full_name: document.getElementById('newLeadName').value.trim(),
      mobile_number: document.getElementById('newLeadMobile').value.trim(),
      email: document.getElementById('newLeadEmail').value.trim(),
      city: document.getElementById('newLeadCity').value.trim(),
      project_id: document.getElementById('newLeadProject').value || null,
      apartment_size: document.getElementById('newLeadSize').value.trim(),
      budget: document.getElementById('newLeadBudget').value.trim(),
      purchase_timeline: document.getElementById('newLeadTimeline').value,
      requirements: document.getElementById('newLeadReq').value.trim()
    });
    Utils.closeModal();
    Utils.toast('Lead created successfully!');
    App.renderLeadsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openLeadDetailModal = async function(leadId) {
  Utils.showModal(`<div style="padding:30px; text-align:center;">Loading lead details...</div>`);
  try {
    const user = this.currentUser || {};
    const role = user.role || 'sales_associate';
    const [res, assocRes] = await Promise.all([
      API.get(`/leads/${leadId}`),
      role !== 'sales_associate' ? API.get('/users/associates').catch(() => ({ associates: [] })) : Promise.resolve({ associates: [] })
    ]);
    const l = res.lead;
    const history = res.stageHistory || [];
    const assignments = res.assignments || [];
    const associates = assocRes.associates || [];

    const stages = [
      ['new_lead', 'New Lead'],
      ['contacted', 'Contacted'],
      ['interested', 'Interested'],
      ['site_visit_scheduled', 'Site Visit Scheduled'],
      ['site_visit_completed', 'Site Visit Completed'],
      ['negotiation', 'Negotiation'],
      ['booked_won', 'Booked / Won'],
      ['lost', 'Lost']
    ];

    Utils.showModal(`
      <div style="text-align:left; max-height:78vh; overflow-y:auto; padding-right:4px;">
        <div class="eyebrow">${Utils.escapeHTML(l.enquiry_ref)} · ${Utils.escapeHTML(l.enquiry_source || '')}</div>
        <h3 style="margin:4px 0 6px;">${Utils.escapeHTML(l.customer_name)} <span class="badge lead-stage-${l.stage}">${Utils.escapeHTML(l.stage.replace(/_/g, ' '))}</span></h3>
        <p style="font-size:12.5px; color:var(--muted); margin-bottom:14px;">
          ${Utils.escapeHTML(l.customer_mobile)} · ${Utils.escapeHTML(l.city || '')} · Project: <strong>${Utils.escapeHTML(l.project_name || '—')}</strong> (${Utils.escapeHTML(l.apartment_size || '—')})
        </p>

        <div style="background:var(--pale); padding:12px; border-radius:8px; margin-bottom:16px; font-size:12.5px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div><strong>Timeline:</strong> ${Utils.escapeHTML(l.purchase_timeline || '—')}</div>
          <div><strong>Callback:</strong> ${Utils.escapeHTML(l.preferred_callback_time || '—')}</div>
          <div><strong>Original Link Owner:</strong> ${Utils.escapeHTML(l.original_associate_name || l.original_sales_head_name || l.original_link_owner_name || 'Direct')}</div>
          <div><strong>Current Owner:</strong> ${Utils.escapeHTML(l.assigned_associate_name || l.assigned_sales_head_name || 'Unassigned')}</div>
          ${l.budget ? `<div><strong>Budget:</strong> ${Utils.escapeHTML(l.budget)}</div>` : ''}
          ${l.loss_reason ? `<div><strong>Loss Reason:</strong> ${Utils.escapeHTML(l.loss_reason)}</div>` : ''}
        </div>

        <form onsubmit="App.handleLeadStageUpdate(event, '${l.id}')" style="border:1px solid var(--line); border-radius:10px; padding:12px; margin-bottom:14px;">
          <strong style="font-size:12.5px; display:block; margin-bottom:8px;">Update Pipeline Stage</strong>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <select id="ldStageSelect" onchange="document.getElementById('ldLossReasonWrap').style.display=this.value==='lost'?'block':'none'">
              ${stages.map(([k, lbl]) => `<option value="${k}" ${l.stage === k ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
            <input id="ldStageNote" placeholder="Stage transition note...">
          </div>
          <div id="ldLossReasonWrap" style="display:${l.stage === 'lost' ? 'block' : 'none'}; margin-top:8px;">
            <input id="ldLossReason" placeholder="Mandatory loss reason (e.g. Budget mismatch, Bought elsewhere)..." value="${Utils.escapeHTML(l.loss_reason || '')}">
          </div>
          <div style="margin-top:8px; display:flex; justify-content:flex-end; gap:8px;">
            <button type="submit" class="btn small primary">Update Stage</button>
          </div>
        </form>

        ${role !== 'sales_associate' ? `
          <form onsubmit="App.handleLeadReassign(event, '${l.id}')" style="border:1px solid var(--line); border-radius:10px; padding:12px; margin-bottom:14px;">
            <strong style="font-size:12.5px; display:block; margin-bottom:8px;">Assign / Reassign Lead (Preserves Original Attribution)</strong>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <select id="ldAssignAssoc" required>
                <option value="">Select Associate...</option>
                ${associates.map(a => `<option value="${a.id}" ${l.assigned_associate_id === a.id ? 'selected' : ''}>${Utils.escapeHTML(a.name)}</option>`).join('')}
              </select>
              <input id="ldAssignReason" required placeholder="Reason for assignment/reassignment...">
            </div>
            <div style="margin-top:8px; display:flex; justify-content:flex-end;">
              <button type="submit" class="btn small soft">Assign Lead</button>
            </div>
          </form>
        ` : ''}

        ${!l.invitation_id && l.project_id ? `
          <form onsubmit="App.handleLeadScheduleVisit(event, '${l.id}')" style="border:1px solid var(--line); border-radius:10px; padding:12px; margin-bottom:14px;">
            <strong style="font-size:12.5px; display:block; margin-bottom:8px;">Schedule Site Visit & Generate VIP Invitation</strong>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <input id="ldVisitDate" type="date" required value="${new Date().toISOString().slice(0, 10)}">
              <input id="ldVisitTime" type="time" required value="11:30">
            </div>
            <div style="margin-top:8px; display:flex; justify-content:flex-end;">
              <button type="submit" class="btn small primary">Create Invitation & Schedule Visit</button>
            </div>
          </form>
        ` : (l.invitation_id ? `<div style="margin-bottom:12px; padding:10px 12px; border-radius:8px; background:var(--green-bg); color:var(--green); font-size:12.5px;">✓ Linked to Site Visit (${Utils.escapeHTML(l.site_visit_status || 'scheduled')}) · Invitation Code: <code>${Utils.escapeHTML(l.invitation_short_code || '')}</code></div>` : '')}

        <div style="margin-bottom:12px;">
          <strong style="font-size:12.5px;">Stage History (${history.length})</strong>
          <div style="margin-top:6px; font-size:12px; color:var(--muted);">
            ${history.map(h => `<div>• <strong>${Utils.escapeHTML(h.new_stage.replace(/_/g, ' '))}</strong> by ${Utils.escapeHTML(h.changed_by_name || 'System')} (${Utils.formatDate(h.created_at)}) ${h.notes ? '— ' + Utils.escapeHTML(h.notes) : ''}</div>`).join('') || 'No stage history yet.'}
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <strong style="font-size:12.5px;">Assignment History (${assignments.length})</strong>
          <div style="margin-top:6px; font-size:12px; color:var(--muted);">
            ${assignments.map(a => `<div>• ${Utils.escapeHTML(a.previous_owner_name || 'Unassigned')} → <strong>${Utils.escapeHTML(a.new_owner_name || 'Team Pool')}</strong> (${Utils.escapeHTML(a.reason || '')})</div>`).join('') || 'No assignments recorded yet.'}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; gap:8px;">
          <button type="button" class="btn soft" onclick="Utils.closeModal(); App.openCustomer360('${l.customer_id}')">Open Customer 360°</button>
          <button type="button" class="btn primary" onclick="Utils.closeModal()">Close</button>
        </div>
      </div>
    `);
  } catch (err) {
    Utils.showModal(`<div style="padding:20px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`);
  }
};

App.handleLeadStageUpdate = async function(e, leadId) {
  e.preventDefault();
  try {
    const stage = document.getElementById('ldStageSelect').value;
    const notes = document.getElementById('ldStageNote').value.trim();
    const loss_reason = document.getElementById('ldLossReason')?.value.trim() || '';
    await API.patch(`/leads/${leadId}/stage`, { stage, notes, loss_reason });
    Utils.toast('Lead stage updated!');
    App.openLeadDetailModal(leadId);
    if (App.activePage === 'leads') App.renderLeadsList(document.getElementById('pageContent'));
    if (App.activePage === 'lead_pipeline') App.renderLeadPipeline(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Stage update rejected: ' + err.message);
  }
};

App.handleLeadReassign = async function(e, leadId) {
  e.preventDefault();
  try {
    const associate_id = document.getElementById('ldAssignAssoc').value;
    const reason = document.getElementById('ldAssignReason').value.trim();
    await API.post(`/leads/${leadId}/assign`, { associate_id, reason });
    Utils.toast('Lead assigned successfully!');
    App.openLeadDetailModal(leadId);
    if (App.activePage === 'leads') App.renderLeadsList(document.getElementById('pageContent'));
    if (App.activePage === 'lead_pipeline') App.renderLeadPipeline(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Assignment error: ' + err.message);
  }
};

App.handleLeadScheduleVisit = async function(e, leadId) {
  e.preventDefault();
  try {
    const visit_date = document.getElementById('ldVisitDate').value;
    const visit_time = document.getElementById('ldVisitTime').value;
    await API.post(`/leads/${leadId}/schedule-visit`, { visit_date, visit_time });
    Utils.toast('Invitation created & Site Visit scheduled!');
    App.openLeadDetailModal(leadId);
    if (App.activePage === 'leads') App.renderLeadsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
