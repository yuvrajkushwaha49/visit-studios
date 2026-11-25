// Developers & Projects Management Component with Full CRUD & Logo Upload
App.projectFilters = App.projectFilters || {
  search: '',
  developers: [],
  projects: [],
  statuses: []
};

App.normalizeProjectFilters = function() {
  const current = this.projectFilters || {};
  const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
  this.projectFilters = {
    search: current.search || '',
    developers: asList(current.developers),
    projects: asList(current.projects),
    statuses: asList(current.statuses)
  };
  return this.projectFilters;
};

App.applyProjectFilters = function(developers, projects, filters) {
  const query = String(filters.search || '').trim().toLowerCase();
  const matchesStatus = (row) => !filters.statuses.length || filters.statuses.includes(row.status || 'active');
  const developerText = (developer) => [developer.name, developer.contact_name, developer.contact_phone, developer.contact_email, developer.address, developer.description].join(' ').toLowerCase();
  const projectText = (project) => [project.name, project.developer_name, project.location, project.description, project.amenities, project.starting_price].join(' ').toLowerCase();

  let filteredDevelopers = developers.filter(developer =>
    matchesStatus(developer) &&
    (!filters.developers.length || filters.developers.includes(developer.id)) &&
    (!query || developerText(developer).includes(query))
  );
  const filteredProjects = projects.filter(project =>
    matchesStatus(project) &&
    (!filters.developers.length || filters.developers.includes(project.developer_id)) &&
    (!filters.projects.length || filters.projects.includes(project.id)) &&
    (!query || projectText(project).includes(query))
  );

  if (filters.projects.length && !filters.developers.length) {
    const developerIds = new Set(filteredProjects.map(project => project.developer_id));
    filteredDevelopers = developers.filter(developer =>
      developerIds.has(developer.id) &&
      matchesStatus(developer) &&
      (!query || developerText(developer).includes(query))
    );
  }

  return { developers: filteredDevelopers, projects: filteredProjects };
};

App.developerCardHtml = function(developer, role) {
  return `
    <div class="panel" style="padding:18px; display:flex; flex-direction:column; justify-content:space-between; margin-bottom:0;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:10px;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${developer.company_logo ? `
              <div style="width:48px; height:48px; border-radius:10px; border:1px solid #e2e8f0; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:3px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.05);">
                <img src="${developer.company_logo}" alt="${Utils.escapeHTML(developer.name)}" style="max-width:100%; max-height:100%; object-fit:contain;">
              </div>
            ` : `
              <div style="width:48px; height:48px; border-radius:10px; border:1px solid #e2e8f0; background:linear-gradient(135deg, #1e293b, #0f172a); color:#f5ba13; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; flex-shrink:0;">
                ${Utils.escapeHTML(String(developer.name || '').slice(0, 2).toUpperCase())}
              </div>
            `}
            <div>
              <h4 style="font-size:16px; font-weight:700; margin:0 0 2px;">${Utils.escapeHTML(developer.name)}</h4>
              <span class="badge active" style="font-size:10px; padding:2px 7px;">${developer.total_projects || 0} Projects</span>
            </div>
          </div>
        </div>
        <p style="font-size:11.5px; color:var(--muted); line-height:1.5; margin-bottom:12px;">
          ${Utils.escapeHTML(developer.description || 'Premium real estate development partner.')}
        </p>
        <div style="font-size:11px; color:var(--muted);">
          <div>Contact: <strong>${Utils.escapeHTML(developer.contact_name || 'CRM Team')}</strong> (${Utils.escapeHTML(developer.contact_phone || '')})</div>
          ${developer.website ? `<div>Web: <a href="${Utils.escapeHTML(developer.website)}" target="_blank" style="color:var(--purple); text-decoration:underline;">${Utils.escapeHTML(developer.website)}</a></div>` : ''}
        </div>
      </div>
      ${role === 'admin' ? `
        <div style="margin-top:14px; padding-top:10px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn small soft" onclick="App.openEditDeveloperModal('${developer.id}')">Edit</button>
          <button class="btn small danger" onclick="App.deleteDeveloper('${developer.id}', '${Utils.escapeHTML(developer.name)}')">Delete</button>
        </div>
      ` : ''}
    </div>
  `;
};

App.projectCardHtml = function(project, role) {
  return `
    <div class="panel" style="margin-bottom:0; display:flex; flex-direction:column;">
      <div style="padding:20px; flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:12px;">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            ${project.project_logo ? `
              <div style="width:52px; height:52px; border-radius:10px; border:1px solid #e2e8f0; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:4px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                <img src="${project.project_logo}" alt="${Utils.escapeHTML(project.name)}" style="max-width:100%; max-height:100%; object-fit:contain;">
              </div>
            ` : `
              <div style="width:52px; height:52px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; color:#3b82f6; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">
                🏛️
              </div>
            `}
            <div>
              <div class="eyebrow" style="margin-bottom:2px;">${Utils.escapeHTML(project.developer_name)}</div>
              <h4 style="font-family:'Playfair Display', Georgia, serif; font-size:18px; font-weight:600; margin:0;">
                ${Utils.escapeHTML(project.name)}
              </h4>
            </div>
          </div>
          <span class="badge active" style="white-space:nowrap;">${Utils.escapeHTML(project.starting_price || 'Price on request')}</span>
        </div>
        <p style="font-size:11.5px; color:var(--muted); margin-bottom:14px; line-height:1.5;">
          ${Utils.escapeHTML(project.description || '')}
        </p>
        <div style="background:var(--pale); border-radius:6px; padding:10px 12px; font-size:11.5px; margin-bottom:12px;">
          <div style="margin-bottom:4px;">📍 <strong>Location:</strong> ${Utils.escapeHTML(project.location)}</div>
          <div>📐 <strong>Super Built-up:</strong> ${Utils.escapeHTML(project.super_built_up_area || 'Various configurations')}</div>
        </div>
        ${project.amenities ? `
          <div style="font-size:11px; color:var(--muted); margin-bottom:8px;">
            ✨ <strong>Amenities:</strong> ${Utils.escapeHTML(project.amenities)}
          </div>
        ` : ''}
      </div>
      <div style="padding:12px 20px; background:#faf9fd; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
        ${project.google_maps_url ? `
          <a href="${Utils.escapeHTML(project.google_maps_url)}" target="_blank" class="btn small soft">Maps Location ↗</a>
        ` : '<span></span>'}
        ${role === 'admin' ? `
          <div class="actions">
            <button class="btn small soft" onclick="App.openEditProjectModal('${project.id}')">Edit</button>
            <button class="btn small danger" onclick="App.deleteProject('${project.id}', '${Utils.escapeHTML(project.name)}')">Delete</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

App.paintProjectDirectory = function(developers, projects, filters) {
  const role = this.currentUser?.role || '';
  const filtered = this.applyProjectFilters(developers, projects, filters);
  const developersGrid = document.getElementById('projDevelopersGrid');
  const projectsGrid = document.getElementById('projProjectsGrid');
  if (developersGrid) {
    developersGrid.innerHTML = filtered.developers.length
      ? filtered.developers.map(developer => this.developerCardHtml(developer, role)).join('')
      : `<div class="panel" style="padding:24px; color:var(--muted); margin-bottom:0;">No developers match these filters.</div>`;
  }
  if (projectsGrid) {
    projectsGrid.innerHTML = filtered.projects.length
      ? filtered.projects.map(project => this.projectCardHtml(project, role)).join('')
      : `<div class="panel" style="padding:24px; color:var(--muted); margin-bottom:0;">No projects match these filters.</div>`;
  }
  const developersTitle = document.getElementById('projDevelopersTitle');
  const projectsTitle = document.getElementById('projProjectsTitle');
  if (developersTitle) developersTitle.textContent = `Developers (${filtered.developers.length})`;
  if (projectsTitle) projectsTitle.textContent = `Projects & Residences (${filtered.projects.length})`;
  const count = document.getElementById('projFilterCount');
  if (count) {
    count.textContent = `${filtered.developers.length} developer${filtered.developers.length === 1 ? '' : 's'} · ${filtered.projects.length} project${filtered.projects.length === 1 ? '' : 's'}`;
  }
};

App.renderProjectsManagement = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading developers and projects...</div>`;

  try {
    const [devsRes, projsRes] = await Promise.all([
      API.get('/developers'),
      API.get('/projects')
    ]);

    const developers = (devsRes.developers || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const projects = (projsRes.projects || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const role = this.currentUser.role;
    const filters = this.normalizeProjectFilters();

    this.cache = this.cache || {};
    this.cache.developers = developers;
    this.cache.projects = projects;

    const selectionLabel = (count, emptyLabel) => count ? `${count} Selected` : emptyLabel;
    const statusOptions = [
      { id: 'active', name: 'Active' },
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
              <label class="multi-select-item" ${opt.developer_id ? `data-developer="${Utils.escapeHTML(opt.developer_id)}"` : ''}>
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
          <div class="eyebrow">PORTFOLIO ASSETS</div>
          <h1 class="page-title">Developers & Projects</h1>
          <p class="page-desc">Real estate partners, project configurations, logos, pricing, and showcase brochures.</p>
        </div>
        <div class="actions">
          ${role === 'admin' ? `
            <button class="btn soft" onclick="App.openAddDeveloperModal()">
              + Add Developer
            </button>
            <button class="btn primary" onclick="App.openAddProjectModal()">
              + Add Project
            </button>
          ` : ''}
        </div>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="projSearch" placeholder="Developer, project, location or contact" value="${Utils.escapeHTML(filters.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault();App.searchProjects();}">
          </label>
        </div>
        <div class="inv-filters-grid">
          <div class="inv-filter-field">
            <span>Developer</span>
            ${multiSelect('projDev', 'All Developers', developers.map(developer => ({ id: developer.id, name: developer.name })), filters.developers, 'App.onProjectDevelopersChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Project</span>
            ${multiSelect('projProject', 'All Projects', projects.map(project => ({ id: project.id, name: project.name, developer_id: project.developer_id || '' })), filters.projects, 'App.onProjectProjectsChange()')}
          </div>
          <div class="inv-filter-field">
            <span>Status</span>
            ${multiSelect('projStatus', 'All Statuses', statusOptions, filters.statuses, 'App.onProjectStatusesChange()')}
          </div>
        </div>
        <div class="inv-filters-actions">
          <span id="projFilterCount" class="inv-filter-count"></span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetProjectFilters()">Reset</button>
            <button type="button" class="btn small primary" id="projSearchBtn" onclick="App.searchProjects()">Search</button>
          </div>
        </div>
      </div>

      <h3 id="projDevelopersTitle" style="font-size:15px; font-weight:600; margin-bottom:14px;">Developers</h3>
      <div id="projDevelopersGrid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:32px;"></div>

      <h3 id="projProjectsTitle" style="font-size:15px; font-weight:600; margin-bottom:14px;">Projects & Residences</h3>
      <div id="projProjectsGrid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;"></div>
    `;
    this.paintProjectDirectory(developers, projects, filters);
    this.onProjectDevelopersChange();
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.checkedProjectValues = function(optionsId) {
  return [...document.querySelectorAll(`#${optionsId} input:checked`)].map(input => input.value);
};

App.setProjectMultiLabel = function(labelId, count, emptyLabel) {
  const label = document.getElementById(labelId);
  if (label) label.textContent = count ? `${count} Selected` : emptyLabel;
};

App.onProjectDevelopersChange = function() {
  const developers = this.checkedProjectValues('projDevOptions');
  this.setProjectMultiLabel('projDevLabel', developers.length, 'All Developers');
  document.querySelectorAll('#projProjectOptions .multi-select-item').forEach(item => {
    const developerId = item.getAttribute('data-developer') || '';
    const visible = !developers.length || developers.includes(developerId);
    item.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      const box = item.querySelector('input');
      if (box) box.checked = false;
    }
  });
  this.onProjectProjectsChange();
};

App.onProjectProjectsChange = function() {
  const count = this.checkedProjectValues('projProjectOptions').length;
  this.setProjectMultiLabel('projProjectLabel', count, 'All Projects');
};

App.onProjectStatusesChange = function() {
  const count = this.checkedProjectValues('projStatusOptions').length;
  this.setProjectMultiLabel('projStatusLabel', count, 'All Statuses');
};

App.readProjectFilters = function() {
  return {
    search: (document.getElementById('projSearch')?.value || '').trim(),
    developers: this.checkedProjectValues('projDevOptions'),
    projects: this.checkedProjectValues('projProjectOptions'),
    statuses: this.checkedProjectValues('projStatusOptions')
  };
};

App.searchProjects = async function() {
  const filters = this.readProjectFilters();
  this.projectFilters = filters;
  const button = document.getElementById('projSearchBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Searching...';
  }
  try {
    const [devsRes, projsRes] = await Promise.all([
      API.get('/developers'),
      API.get('/projects')
    ]);
    this.cache = this.cache || {};
    this.cache.developers = devsRes.developers || [];
    this.cache.projects = projsRes.projects || [];
    this.paintProjectDirectory(this.cache.developers, this.cache.projects, filters);
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Search';
    }
  }
};

App.resetProjectFilters = function() {
  this.projectFilters = { search: '', developers: [], projects: [], statuses: [] };
  const search = document.getElementById('projSearch');
  if (search) search.value = '';
  document.querySelectorAll('#projDevOptions input, #projProjectOptions input, #projStatusOptions input').forEach(input => {
    input.checked = false;
  });
  document.querySelectorAll('#projProjectOptions .multi-select-item').forEach(item => {
    item.style.display = 'flex';
  });
  this.onProjectDevelopersChange();
  this.onProjectStatusesChange();
  this.searchProjects();
};

// Reusable Logo File Upload Handler
App.handleLogoUpload = function(inputEl, previewId, hiddenInputId) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    Utils.toast('File size exceeds 5MB limit');
    inputEl.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;
    const previewEl = document.getElementById(previewId);

    // Show temporary local preview immediately
    if (previewEl) {
      previewEl.innerHTML = `<img src="${base64}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:6px;">`;
    }

    try {
      Utils.toast('Uploading logo...');
      const res = await API.post('/upload/logo', { image_base64: base64 });
      const uploadedUrl = res.url || base64;
      document.getElementById(hiddenInputId).value = uploadedUrl;
      Utils.toast('✓ Logo uploaded successfully!');
    } catch (err) {
      console.warn('Server upload fallback to base64:', err);
      document.getElementById(hiddenInputId).value = base64;
      Utils.toast('✓ Logo attached!');
    }
  };
  reader.readAsDataURL(file);
};

App.removeLogo = function(previewId, hiddenInputId, fileInputId) {
  const previewEl = document.getElementById(previewId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const fileInput = document.getElementById(fileInputId);

  if (previewEl) {
    previewEl.innerHTML = `<span style="font-size:22px; color:#94a3b8;">🏢</span>`;
  }
  if (hiddenInput) hiddenInput.value = '';
  if (fileInput) fileInput.value = '';
  Utils.toast('Logo removed');
};

// Add Developer Modal
App.openAddDeveloperModal = function() {
  const html = `
    <h3 class="modal-title">Add Real Estate Developer</h3>
    <form onsubmit="App.handleAddDeveloperSubmit(event)">
      <!-- Developer Logo Upload -->
      <div style="margin-bottom:14px; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
        <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:block;">Developer Brand Logo</label>
        <div style="display:flex; gap:14px; align-items:center;">
          <div id="addDevLogoPreview" style="width:60px; height:60px; border-radius:10px; border:1.5px dashed #cbd5e1; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            <span style="font-size:22px; color:#94a3b8;">🏢</span>
          </div>
          <div style="flex:1;">
            <input type="file" id="addDevLogoFile" accept="image/png, image/jpeg, image/svg+xml, image/webp" style="font-size:12px; padding:4px;" onchange="App.handleLogoUpload(this, 'addDevLogoPreview', 'addDevLogoVal')">
            <input type="hidden" id="addDevLogoVal" value="">
            <small style="color:var(--muted); font-size:11px; display:block; margin-top:4px;">Upload developer brand logo (PNG, JPG, SVG, WEBP)</small>
          </div>
          <button type="button" class="btn small soft" onclick="App.removeLogo('addDevLogoPreview', 'addDevLogoVal', 'addDevLogoFile')" style="color:#ef4444; font-size:11px;">✕ Remove</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label>Developer Brand Name *</label>
        <input id="addDevName" required placeholder="e.g. DLF Luxury / Max Estates">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label>Contact Person</label>
          <input id="addDevContact" placeholder="Contact executive">
        </div>
        <div>
          <label>Contact Phone</label>
          <input id="addDevPhone" placeholder="+91 ...">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label>Official Website</label>
        <input id="addDevWebsite" type="url" placeholder="https://...">
      </div>
      <div style="margin-bottom:16px;">
        <label>Description & Brand Overview</label>
        <textarea id="addDevDesc" placeholder="Developer portfolio highlights..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Add Developer</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleAddDeveloperSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('addDevName').value.trim(),
    company_logo: document.getElementById('addDevLogoVal').value.trim() || null,
    contact_name: document.getElementById('addDevContact').value.trim(),
    contact_phone: document.getElementById('addDevPhone').value.trim(),
    website: document.getElementById('addDevWebsite').value.trim(),
    description: document.getElementById('addDevDesc').value.trim()
  };

  try {
    await API.post('/developers', payload);
    Utils.toast('Developer added successfully');
    Utils.closeModal();
    App.renderProjectsManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Edit Developer Modal
App.openEditDeveloperModal = function(id) {
  const d = this.cache.developers.find(x => x.id === id);
  if (!d) return;

  const logoUrl = d.company_logo || '';

  const html = `
    <h3 class="modal-title">Edit Developer</h3>
    <form onsubmit="App.handleEditDeveloperSubmit(event, '${d.id}')">
      <!-- Developer Logo Upload -->
      <div style="margin-bottom:14px; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
        <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:block;">Developer Brand Logo</label>
        <div style="display:flex; gap:14px; align-items:center;">
          <div id="editDevLogoPreview" style="width:60px; height:60px; border-radius:10px; border:1.5px dashed #cbd5e1; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            ${logoUrl ? `<img src="${logoUrl}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:6px;">` : `<span style="font-size:22px; color:#94a3b8;">🏢</span>`}
          </div>
          <div style="flex:1;">
            <input type="file" id="editDevLogoFile" accept="image/png, image/jpeg, image/svg+xml, image/webp" style="font-size:12px; padding:4px;" onchange="App.handleLogoUpload(this, 'editDevLogoPreview', 'editDevLogoVal')">
            <input type="hidden" id="editDevLogoVal" value="${logoUrl}">
            <small style="color:var(--muted); font-size:11px; display:block; margin-top:4px;">Upload new logo to replace existing</small>
          </div>
          <button type="button" class="btn small soft" onclick="App.removeLogo('editDevLogoPreview', 'editDevLogoVal', 'editDevLogoFile')" style="color:#ef4444; font-size:11px;">✕ Remove</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label>Developer Brand Name *</label>
        <input id="editDevName" required value="${Utils.escapeHTML(d.name)}">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label>Contact Person</label>
          <input id="editDevContact" value="${Utils.escapeHTML(d.contact_name || '')}">
        </div>
        <div>
          <label>Contact Phone</label>
          <input id="editDevPhone" value="${Utils.escapeHTML(d.contact_phone || '')}">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label>Official Website</label>
        <input id="editDevWebsite" type="url" value="${Utils.escapeHTML(d.website || '')}">
      </div>
      <div style="margin-bottom:16px;">
        <label>Description & Brand Overview</label>
        <textarea id="editDevDesc">${Utils.escapeHTML(d.description || '')}</textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Changes</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleEditDeveloperSubmit = async function(e, id) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('editDevName').value.trim(),
    company_logo: document.getElementById('editDevLogoVal').value.trim() || null,
    contact_name: document.getElementById('editDevContact').value.trim(),
    contact_phone: document.getElementById('editDevPhone').value.trim(),
    website: document.getElementById('editDevWebsite').value.trim(),
    description: document.getElementById('editDevDesc').value.trim()
  };

  try {
    await API.put(`/developers/${id}`, payload);
    Utils.toast('Developer updated successfully');
    Utils.closeModal();
    App.renderProjectsManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteDeveloper = async function(id, name) {
  if (!confirm(`Are you sure you want to delete developer "${name}" and all associated projects?`)) return;
  try {
    await API.delete(`/developers/${id}`);
    Utils.toast('Developer deleted');
    App.renderProjectsManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Add Project Modal
App.openAddProjectModal = async function() {
  const devsRes = await API.get('/developers');
  const developers = devsRes.developers || [];

  const html = `
    <h3 class="modal-title">Add Property / Project</h3>
    <form onsubmit="App.handleAddProjectSubmit(event)">
      <!-- Project Logo Upload -->
      <div style="margin-bottom:14px; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
        <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:block;">Project Brand Logo</label>
        <div style="display:flex; gap:14px; align-items:center;">
          <div id="addProjLogoPreview" style="width:60px; height:60px; border-radius:10px; border:1.5px dashed #cbd5e1; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            <span style="font-size:22px; color:#94a3b8;">🏛️</span>
          </div>
          <div style="flex:1;">
            <input type="file" id="addProjLogoFile" accept="image/png, image/jpeg, image/svg+xml, image/webp" style="font-size:12px; padding:4px;" onchange="App.handleLogoUpload(this, 'addProjLogoPreview', 'addProjLogoVal')">
            <input type="hidden" id="addProjLogoVal" value="">
            <small style="color:var(--muted); font-size:11px; display:block; margin-top:4px;">Upload project emblem / logo (PNG, JPG, SVG, WEBP)</small>
          </div>
          <button type="button" class="btn small soft" onclick="App.removeLogo('addProjLogoPreview', 'addProjLogoVal', 'addProjLogoFile')" style="color:#ef4444; font-size:11px;">✕ Remove</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label>Developer *</label>
        <select id="addProjDeveloper" required>
          ${developers.map(d => `<option value="${d.id}">${Utils.escapeHTML(d.name)}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label>Project Name *</label>
        <input id="addProjName" required placeholder="e.g. M3M The Cullinan">
      </div>
      <div style="margin-bottom:12px;">
        <label>Location / Address *</label>
        <input id="addProjLocation" required placeholder="Sector 94, Noida Expressway">
      </div>
      <div style="margin-bottom:12px;">
        <label>Google Maps Navigation Link</label>
        <input id="addProjMaps" type="url" placeholder="https://maps.google.com/...">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label>Starting Price</label>
          <input id="addProjPrice" placeholder="e.g. ₹5.80 Cr">
        </div>
        <div>
          <label>Super Built-up Area</label>
          <input id="addProjSize" placeholder="e.g. 3,600 sq. ft.">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label>Amenities</label>
        <input id="addProjAmenities" placeholder="Infinity Pool, Concierge, Helipad...">
      </div>
      <div style="margin-bottom:16px;">
        <label>Project Narrative / Description</label>
        <textarea id="addProjDesc" placeholder="Highlight features for client invitations..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Create Project</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleAddProjectSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    developer_id: document.getElementById('addProjDeveloper').value,
    project_logo: document.getElementById('addProjLogoVal').value.trim() || null,
    name: document.getElementById('addProjName').value.trim(),
    location: document.getElementById('addProjLocation').value.trim(),
    google_maps_url: document.getElementById('addProjMaps').value.trim(),
    starting_price: document.getElementById('addProjPrice').value.trim(),
    super_built_up_area: document.getElementById('addProjSize').value.trim(),
    amenities: document.getElementById('addProjAmenities').value.trim(),
    description: document.getElementById('addProjDesc').value.trim()
  };

  try {
    await API.post('/projects', payload);
    Utils.toast('Project added successfully');
    Utils.closeModal();
    App.renderProjectsManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Edit Project Modal
App.openEditProjectModal = function(id) {
  const p = this.cache.projects.find(x => x.id === id);
  if (!p) return;

  const logoUrl = p.project_logo || '';

  const html = `
    <h3 class="modal-title">Edit Project Details</h3>
    <form onsubmit="App.handleEditProjectSubmit(event, '${p.id}')">
      <!-- Project Logo Upload -->
      <div style="margin-bottom:14px; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
        <label style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:6px; display:block;">Project Brand Logo</label>
        <div style="display:flex; gap:14px; align-items:center;">
          <div id="editProjLogoPreview" style="width:60px; height:60px; border-radius:10px; border:1.5px dashed #cbd5e1; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            ${logoUrl ? `<img src="${logoUrl}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:6px;">` : `<span style="font-size:22px; color:#94a3b8;">🏛️</span>`}
          </div>
          <div style="flex:1;">
            <input type="file" id="editProjLogoFile" accept="image/png, image/jpeg, image/svg+xml, image/webp" style="font-size:12px; padding:4px;" onchange="App.handleLogoUpload(this, 'editProjLogoPreview', 'editProjLogoVal')">
            <input type="hidden" id="editProjLogoVal" value="${logoUrl}">
            <small style="color:var(--muted); font-size:11px; display:block; margin-top:4px;">Upload new emblem / logo to replace existing</small>
          </div>
          <button type="button" class="btn small soft" onclick="App.removeLogo('editProjLogoPreview', 'editProjLogoVal', 'editProjLogoFile')" style="color:#ef4444; font-size:11px;">✕ Remove</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label>Developer *</label>
        <select id="editProjDeveloper" required>
          ${this.cache.developers.map(d => `
            <option value="${d.id}" ${d.id === p.developer_id ? 'selected' : ''}>
              ${Utils.escapeHTML(d.name)}
            </option>
          `).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label>Project Name *</label>
        <input id="editProjName" required value="${Utils.escapeHTML(p.name)}">
      </div>
      <div style="margin-bottom:12px;">
        <label>Location / Address *</label>
        <input id="editProjLocation" required value="${Utils.escapeHTML(p.location)}">
      </div>
      <div style="margin-bottom:12px;">
        <label>Google Maps Navigation Link</label>
        <input id="editProjMaps" type="url" value="${Utils.escapeHTML(p.google_maps_url || '')}">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label>Starting Price</label>
          <input id="editProjPrice" value="${Utils.escapeHTML(p.starting_price || '')}">
        </div>
        <div>
          <label>Super Built-up Area</label>
          <input id="editProjSize" value="${Utils.escapeHTML(p.super_built_up_area || '')}">
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label>Amenities</label>
        <input id="editProjAmenities" value="${Utils.escapeHTML(p.amenities || '')}">
      </div>
      <div style="margin-bottom:16px;">
        <label>Project Narrative / Description</label>
        <textarea id="editProjDesc">${Utils.escapeHTML(p.description || '')}</textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Project</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleEditProjectSubmit = async function(e, id) {
  e.preventDefault();
  const payload = {
    developer_id: document.getElementById('editProjDeveloper').value,
    project_logo: document.getElementById('editProjLogoVal').value.trim() || null,
    name: document.getElementById('editProjName').value.trim(),
    location: document.getElementById('editProjLocation').value.trim(),
    google_maps_url: document.getElementById('editProjMaps').value.trim(),
    starting_price: document.getElementById('editProjPrice').value.trim(),
    super_built_up_area: document.getElementById('editProjSize').value.trim(),
    amenities: document.getElementById('editProjAmenities').value.trim(),
    description: document.getElementById('editProjDesc').value.trim()
  };

  try {
    await API.put(`/projects/${id}`, payload);
    Utils.toast('Project updated successfully');
    Utils.closeModal();
    App.renderProjectsManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteProject = async function(id, name) {
  if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;
  try {
    await API.delete(`/projects/${id}`);
    Utils.toast('Project deleted');
    App.renderProjectsManagement(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
