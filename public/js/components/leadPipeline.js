// Lead Pipeline Component (Kanban Board + Table Toggle)
App.leadPipelineViewMode = 'kanban';
App.leadPipelineState = {
  search: '',
  date_from: '',
  date_to: '',
  team_id: '',
  associate_id: '',
  developer_id: '',
  project_id: ''
};

App.onLeadPipelineFilterChange = function(key, value) {
  App.leadPipelineState[key] = value;
  if (key === 'developer_id') App.leadPipelineState.project_id = '';
  if (key === 'team_id') App.leadPipelineState.associate_id = '';
  App.renderLeadPipeline(document.getElementById('pageContent'));
};

App.resetLeadPipelineFilters = function() {
  App.leadPipelineState = {
    search: '', date_from: '', date_to: '',
    team_id: '', associate_id: '', developer_id: '', project_id: ''
  };
  App.renderLeadPipeline(document.getElementById('pageContent'));
};

App.renderLeadPipeline = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading lead pipeline...</div>`;
  try {
    const [stagesRes, leadsRes, catalog] = await Promise.all([
      API.get('/leads/stages'),
      API.get('/leads', { page: 1, limit: 100, ...App.leadPipelineState }),
      App.getFilterCatalog()
    ]);
    const stages = stagesRes.stages || [];
    const leads = leadsRes.leads || [];

    const byStage = {};
    for (const s of stages) byStage[s.key] = [];
    for (const l of leads) {
      if (!byStage[l.stage]) byStage[l.stage] = [];
      byStage[l.stage].push(l);
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">SALES FUNNEL</div>
          <h1 class="page-title">Lead Pipeline</h1>
          <p class="page-desc">Track enquiries across configurable stages from New Lead to Booked / Won.</p>
        </div>
        <div class="actions">
          <button class="btn ${App.leadPipelineViewMode === 'kanban' ? 'primary' : 'soft'}" onclick="App.leadPipelineViewMode='kanban'; App.renderLeadPipeline(document.getElementById('pageContent'));">Kanban View</button>
          <button class="btn ${App.leadPipelineViewMode === 'table' ? 'primary' : 'soft'}" onclick="App.leadPipelineViewMode='table'; App.renderLeadPipeline(document.getElementById('pageContent'));">Table View</button>
          <button class="btn soft" onclick="App.openAddLeadModal()">+ Add Lead</button>
        </div>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="pipeSearchInput" placeholder="Search ref, customer, mobile, builder or project..." value="${Utils.escapeHTML(App.leadPipelineState.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault(); App.leadPipelineState.search=this.value; App.renderLeadPipeline(document.getElementById('pageContent'));}">
          </label>
        </div>
        <div class="inv-filters-grid">
          ${App.buildStandardFilterFieldsHtml({
            state: App.leadPipelineState,
            catalog,
            onChangeHandler: 'App.onLeadPipelineFilterChange',
            idPrefix: 'pipe'
          })}
        </div>
        <div class="inv-filters-actions">
          <span class="inv-filter-count">${leads.length} lead${leads.length === 1 ? '' : 's'}</span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetLeadPipelineFilters()">Reset</button>
            <button type="button" class="btn small primary" onclick="App.leadPipelineState.search=document.getElementById('pipeSearchInput').value; App.renderLeadPipeline(document.getElementById('pageContent'));">Search</button>
          </div>
        </div>
      </div>

      ${App.leadPipelineViewMode === 'kanban' ? `
        <div class="kanban-board">
          ${stages.map(s => `
            <div class="kanban-col">
              <div class="kanban-col-head" style="border-top:3px solid ${Utils.escapeHTML(s.color)};">
                <span>${Utils.escapeHTML(s.label)}</span>
                <span class="kanban-count">${(byStage[s.key] || []).length}</span>
              </div>
              <div class="kanban-cards">
                ${(byStage[s.key] || []).length ? (byStage[s.key] || []).map(l => `
                  <div class="kanban-card" onclick="App.openLeadDetailModal('${l.id}')">
                    <div class="kanban-card-ref"><code>${Utils.escapeHTML(l.enquiry_ref)}</code></div>
                    <strong>${Utils.escapeHTML(l.customer_name)}</strong>
                    <small>${Utils.escapeHTML(l.project_name || 'General')} · ${Utils.escapeHTML(l.apartment_size || '')}</small>
                    <small style="color:var(--muted);">${Utils.escapeHTML(l.assigned_associate_name || 'Unassigned')}</small>
                  </div>
                `).join('') : `<div class="kanban-empty">No leads</div>`}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="panel">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Ref</th><th>Customer</th><th>Project</th><th>Stage</th><th>Employee Name</th><th>Updated</th><th>Action</th></tr></thead>
              <tbody>
                ${leads.length ? leads.map(l => `
                  <tr>
                    <td><code>${Utils.escapeHTML(l.enquiry_ref)}</code></td>
                    <td><strong>${Utils.escapeHTML(l.customer_name)}</strong><small>${Utils.escapeHTML(l.customer_mobile)}</small></td>
                    <td>${Utils.escapeHTML(l.project_name || '—')}</td>
                    <td><span class="badge lead-stage-${l.stage}">${Utils.escapeHTML(l.stage.replace(/_/g, ' '))}</span></td>
                    <td>${App.formatLeadEmployeeCell(l)}</td>
                    <td>${Utils.formatDate(l.updated_at)}</td>
                    <td><button class="btn small primary" onclick="App.openLeadDetailModal('${l.id}')">Manage</button></td>
                  </tr>
                `).join('') : `<tr><td colspan="7" style="text-align:center; padding:32px;">No leads in pipeline.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};
