// Lead Generation & Trackable Enquiry Links Component
App.leadLinksState = {
  page: 1,
  limit: 10,
  search: '',
  date_from: '',
  date_to: '',
  team_id: '',
  associate_id: '',
  developer_id: '',
  project_id: '',
  campaign_id: '',
  is_active: ''
};

App.copyTextToClipboard = async function(text, successMsg = 'Copied to clipboard!') {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    Utils.toast(successMsg);
  } catch (err) {
    Utils.toast('Copy failed: ' + err.message);
  }
};

App.renderLeadGeneration = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading enquiry link generator...</div>`;
  try {
    const user = this.currentUser || {};
    const role = user.role || 'sales_associate';
    const [catalog, campsRes, linksRes] = await Promise.all([
      App.getFilterCatalog(),
      API.get('/lead-links/campaigns').catch(() => ({ campaigns: [], campaignsEnabled: true })),
      API.get('/lead-links', App.leadLinksState)
    ]);

    const projects = catalog.projects || [];
    const campaigns = campsRes.campaigns || [];
    const campaignsEnabled = campsRes.campaignsEnabled !== false;
    const canUseBulkWhatsapp = role === 'admin' || role === 'super_admin';
    const associates = catalog.associates || [];
    const links = linksRes.links || [];
    const pagination = linksRes.pagination || { page: 1, totalPages: 1, total: 0 };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">LEAD GENERATION</div>
          <h1 class="page-title">Trackable Property Enquiry Links</h1>
          <p class="page-desc">Generate cryptographically secured enquiry URLs with automatic attribution to your account, Sales Head, and Organization.</p>
        </div>
        ${(campaignsEnabled && (role === 'admin' || role === 'sales_head' || role === 'super_admin')) ? `
          <div class="actions">
            <button class="btn soft" onclick="App.openCreateCampaignModal()">+ New Campaign</button>
          </div>
        ` : ''}
      </div>

      <div class="panel" style="padding:20px; margin-bottom:24px;">
        <h3 class="panel-title" style="margin-bottom:14px;">Generate Enquiry Link</h3>
        <form id="generateLeadLinkForm" onsubmit="App.handleGenerateLeadLink(event)">
          <div class="fields-grid">
            ${canUseBulkWhatsapp ? `
              <div>
                <label for="lnkType">Link Type</label>
                <select id="lnkType" onchange="App.onLeadLinkTypeChange('lnk', this.value)">
                  <option value="advisor">Associate / Advisor Link</option>
                  <option value="bulk_whatsapp">Bulk WhatsApp Marketing (Advisor: Aiswarya · 9289846060)</option>
                </select>
              </div>
            ` : ''}
            <div>
              <label for="lnkTitle">Link Label (Optional)</label>
              <input id="lnkTitle" maxlength="180" placeholder="e.g. Prestige Luxury Campaign — WhatsApp">
            </div>
            <div>
              <label for="lnkProject">Project Selection</label>
              <select id="lnkProject">
                <option value="">All Active Projects (Customer Chooses)</option>
                ${projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)} (${Utils.escapeHTML(p.developer_name || '')})</option>`).join('')}
              </select>
            </div>
            ${campaignsEnabled ? `
              <div>
                <label for="lnkCampaign">Campaign (Optional)</label>
                <select id="lnkCampaign">
                  <option value="">No Campaign</option>
                  ${campaigns.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.name)} (${Utils.escapeHTML(c.source_channel)})</option>`).join('')}
                </select>
              </div>
            ` : ''}
            <div>
              <label for="lnkSource">Enquiry Source</label>
              <select id="lnkSource">
                <option value="Enquiry Link">Enquiry Link</option>
                ${canUseBulkWhatsapp ? `<option value="Bulk WhatsApp Marketing">Bulk WhatsApp Marketing</option>` : ''}
                <option value="WhatsApp Outreach">WhatsApp Outreach</option>
                <option value="Instagram / Meta">Instagram / Meta</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Channel Partner">Channel Partner</option>
                <option value="Website / QR">Website / QR</option>
              </select>
            </div>
            <div>
              <label for="lnkExpires">Expiration Date & Time (Optional)</label>
              <input id="lnkExpires" type="datetime-local">
            </div>
            ${(role === 'admin' || role === 'sales_head' || role === 'super_admin') ? `
              <div id="lnkOwnerAssocWrap">
                <label for="lnkOwnerAssoc">Assign Link to Associate (Optional)</label>
                <select id="lnkOwnerAssoc">
                  <option value="">Self / Policy Default (${role === 'sales_head' ? 'Team Pool' : 'Org Pool'})</option>
                  ${associates.map(a => `<option value="${a.id}">${Utils.escapeHTML(a.name)}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${canUseBulkWhatsapp ? `
              <div id="lnkBulkAdvisorNameWrap" class="hidden">
                <label for="lnkAdvisorName">Receipt Advisor Name</label>
                <input id="lnkAdvisorName" maxlength="120" value="Aiswarya" placeholder="Aiswarya">
              </div>
              <div id="lnkBulkAdvisorPhoneWrap" class="hidden">
                <label for="lnkAdvisorPhone">Receipt Advisor Number</label>
                <input id="lnkAdvisorPhone" maxlength="32" value="9289846060" placeholder="9289846060">
              </div>
            ` : ''}
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top:16px;">
            <button type="submit" id="btnGenLink" class="btn primary">Generate Trackable Link</button>
          </div>
        </form>
      </div>

      <div class="inv-filters">
        <div class="inv-filters-top">
          <label class="inv-filter-search">
            <span>Search</span>
            <input id="lnkFilterSearch" placeholder="Search link label, code, builder, project or owner..." value="${Utils.escapeHTML(App.leadLinksState.search)}" onkeydown="if(event.key==='Enter'){event.preventDefault(); App.leadLinksState.search=this.value; App.leadLinksState.page=1; App.renderLeadGeneration(document.getElementById('pageContent'));}">
          </label>
        </div>
        <div class="inv-filters-grid">
          ${App.buildStandardFilterFieldsHtml({
            state: App.leadLinksState,
            catalog,
            onChangeHandler: 'App.onLeadLinksFilterChange',
            idPrefix: 'lnk'
          })}
          ${campaignsEnabled ? `
            <label class="inv-filter-field">
              <span>Campaign</span>
              <select onchange="App.onLeadLinksFilterChange('campaign_id', this.value)">
                <option value="">All Campaigns</option>
                ${campaigns.map(c => `<option value="${c.id}" ${App.leadLinksState.campaign_id === c.id ? 'selected' : ''}>${Utils.escapeHTML(c.name)}</option>`).join('')}
              </select>
            </label>
          ` : ''}
          <label class="inv-filter-field">
            <span>Status</span>
            <select onchange="App.onLeadLinksFilterChange('is_active', this.value)">
              <option value="">All Status</option>
              <option value="1" ${App.leadLinksState.is_active === '1' ? 'selected' : ''}>Active Only</option>
              <option value="0" ${App.leadLinksState.is_active === '0' ? 'selected' : ''}>Inactive</option>
            </select>
          </label>
        </div>
        <div class="inv-filters-actions">
          <span class="inv-filter-count">${pagination.total} link${pagination.total === 1 ? '' : 's'}</span>
          <div class="actions">
            <button type="button" class="btn small" onclick="App.resetLeadLinksFilters()">Reset</button>
            <button type="button" class="btn small primary" onclick="App.leadLinksState.search=document.getElementById('lnkFilterSearch').value; App.leadLinksState.page=1; App.renderLeadGeneration(document.getElementById('pageContent'));">Search</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Generated Enquiry Links (${pagination.total})</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Link & Project</th>
                <th>Owner / Attribution</th>
                <th>Opens (Unique)</th>
                <th>Submissions (Unique)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${links.length ? links.map(lnk => `
                <tr>
                  <td>
                    <strong>${Utils.escapeHTML(lnk.title || lnk.project_name || 'General Property Enquiry')}</strong>
                    <small><code>/e/${Utils.escapeHTML(lnk.short_code)}</code> · ${Utils.escapeHTML(lnk.project_name || 'All Active Projects')}${lnk.campaign_name ? ` · ${Utils.escapeHTML(lnk.campaign_name)}` : ''}</small>
                  </td>
                  <td>
                    ${lnk.link_type === 'bulk_whatsapp' ? `
                      <strong>${Utils.escapeHTML(lnk.advisor_display_name || 'Aiswarya')} (${Utils.escapeHTML(lnk.advisor_display_phone || '9289846060')})</strong>
                      <small>Bulk WhatsApp Marketing · ${Utils.escapeHTML(lnk.creator_name || 'Marketing')}</small>
                    ` : `
                      <strong>${Utils.escapeHTML(lnk.owner_associate_name || lnk.owner_sales_head_name || lnk.creator_name)}</strong>
                      <small>${lnk.owner_associate_name ? 'Associate Advisor' : (lnk.owner_sales_head_name ? 'Sales Head Pool' : 'Admin Pool')} · ${Utils.escapeHTML(lnk.source_name)}</small>
                    `}
                  </td>
                  <td><strong>${lnk.total_opens || 0}</strong> <small>(${lnk.unique_opens || 0} unique)</small></td>
                  <td><strong>${lnk.total_submissions || 0}</strong> <small>(${lnk.unique_submissions || 0} unique)</small></td>
                  <td>
                    <span class="badge ${lnk.is_active ? 'confirmed' : 'cancelled'}">${lnk.is_active ? 'Active' : 'Inactive'}</span>
                    ${lnk.expires_at ? `<small>Exp: ${Utils.formatDate(lnk.expires_at)}</small>` : ''}
                  </td>
                  <td>
                    <div class="actions" style="flex-wrap:wrap; gap:6px;">
                      <button class="btn small primary" onclick="App.copyTextToClipboard('${Utils.escapeHTML(lnk.shortUrl)}', 'Short link copied!')">Copy</button>
                      <a class="btn small soft" href="${Utils.escapeHTML(lnk.whatsappShareUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                      <a class="btn small soft" href="${Utils.escapeHTML(lnk.fullUrl)}" target="_blank" rel="noopener noreferrer">Preview</a>
                      <button class="btn small soft" onclick="App.openLinkAnalyticsModal('${lnk.id}')">Details</button>
                      <button class="btn small soft" onclick="App.openEditTrackingLinkModal('${lnk.id}')">Edit</button>
                      <button class="btn small ${lnk.is_active ? 'danger' : 'soft'}" onclick="App.toggleTrackingLinkStatus('${lnk.id}', ${lnk.is_active ? 0 : 1})">
                        ${lnk.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; padding:36px; color:var(--muted);">No enquiry links generated yet. Create your first tracking link above.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="table-pagination">
          <div class="table-pagination-meta"><span>Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} links</span></div>
          <div class="table-pagination-nav">
            <button class="page-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="App.leadLinksState.page=${pagination.page - 1}; App.renderLeadGeneration(document.getElementById('pageContent'));">Prev</button>
            <button class="page-btn" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="App.leadLinksState.page=${pagination.page + 1}; App.renderLeadGeneration(document.getElementById('pageContent'));">Next</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.onLeadLinksFilterChange = function(key, value) {
  App.leadLinksState[key] = value;
  if (key === 'developer_id') App.leadLinksState.project_id = '';
  if (key === 'team_id') App.leadLinksState.associate_id = '';
  App.leadLinksState.page = 1;
  App.renderLeadGeneration(document.getElementById('pageContent'));
};

App.resetLeadLinksFilters = function() {
  App.leadLinksState = {
    page: 1, limit: 10, search: '', date_from: '', date_to: '',
    team_id: '', associate_id: '', developer_id: '', project_id: '',
    campaign_id: '', is_active: ''
  };
  App.renderLeadGeneration(document.getElementById('pageContent'));
};

App.onLeadLinkTypeChange = function(prefix, linkType) {
  const isBulk = linkType === 'bulk_whatsapp';
  const nameWrap = document.getElementById(`${prefix}BulkAdvisorNameWrap`);
  const phoneWrap = document.getElementById(`${prefix}BulkAdvisorPhoneWrap`);
  const nameInput = document.getElementById(`${prefix}AdvisorName`);
  const phoneInput = document.getElementById(`${prefix}AdvisorPhone`);
  const srcSelect = document.getElementById(`${prefix}Source`);

  if (nameWrap) nameWrap.classList.toggle('hidden', !isBulk);
  if (phoneWrap) phoneWrap.classList.toggle('hidden', !isBulk);

  if (isBulk) {
    if (nameInput && !nameInput.value.trim()) nameInput.value = 'Aiswarya';
    if (phoneInput && !phoneInput.value.trim()) phoneInput.value = '9289846060';
    if (srcSelect) {
      srcSelect.value = 'Bulk WhatsApp Marketing';
      Utils.searchableSelects.get(srcSelect.id)?.refresh();
    }
  } else if (srcSelect && srcSelect.value === 'Bulk WhatsApp Marketing') {
    srcSelect.value = 'Enquiry Link';
    Utils.searchableSelects.get(srcSelect.id)?.refresh();
  }
};

App.handleGenerateLeadLink = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGenLink');
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    const linkType = document.getElementById('lnkType')?.value || 'advisor';
    const payload = {
      link_type: linkType,
      title: document.getElementById('lnkTitle')?.value.trim() || '',
      project_id: document.getElementById('lnkProject')?.value || null,
      campaign_id: document.getElementById('lnkCampaign')?.value || null,
      source_name: document.getElementById('lnkSource')?.value || 'Enquiry Link',
      expires_at: document.getElementById('lnkExpires')?.value || null,
      owner_associate_id: document.getElementById('lnkOwnerAssoc')?.value || null
    };
    if (linkType === 'bulk_whatsapp') {
      payload.advisor_display_name = document.getElementById('lnkAdvisorName')?.value.trim() || 'Aiswarya';
      payload.advisor_display_phone = document.getElementById('lnkAdvisorPhone')?.value.trim() || '9289846060';
    }
    const res = await API.post('/lead-links', payload);
    Utils.toast('Trackable enquiry link generated!');
    if (res.link?.shortUrl) {
      App.copyTextToClipboard(res.link.shortUrl, 'Link generated and copied to clipboard!');
    }
    App.renderLeadGeneration(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Trackable Link'; }
  }
};

App.openEditTrackingLinkModal = async function(linkId) {
  Utils.showModal(`<div style="padding:30px; text-align:center;">Loading link details...</div>`);
  try {
    const [linkRes, projsRes, campsRes] = await Promise.all([
      API.get(`/lead-links/${linkId}`),
      API.get('/projects').catch(() => ({ projects: [] })),
      API.get('/lead-links/campaigns').catch(() => ({ campaigns: [], campaignsEnabled: true }))
    ]);
    const lnk = linkRes.link;
    const projects = projsRes.projects || [];
    const campaigns = campsRes.campaigns || [];
    const campaignsEnabled = campsRes.campaignsEnabled !== false;
    const role = this.currentUser?.role || 'sales_associate';
    const canEditBulk = role === 'admin' || role === 'super_admin';

    const toLocalInputVal = (dtStr) => {
      if (!dtStr) return '';
      const iso = String(dtStr).replace(' ', 'T');
      const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
      if (Number.isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const sourceChoices = [
      'Enquiry Link',
      ...(canEditBulk ? ['Bulk WhatsApp Marketing'] : []),
      'WhatsApp Outreach',
      'Instagram / Meta',
      'Google Ads',
      'Channel Partner',
      'Website / QR'
    ];
    if (lnk.source_name && !sourceChoices.includes(lnk.source_name)) {
      sourceChoices.unshift(lnk.source_name);
    }
    const isBulk = lnk.link_type === 'bulk_whatsapp';

    Utils.showModal(`
      <form onsubmit="App.handleUpdateTrackingLink(event, '${lnk.id}')" style="text-align:left;">
        <div class="eyebrow">EDIT TRACKING LINK · /e/${Utils.escapeHTML(lnk.short_code)}</div>
        <h3 style="margin:4px 0 14px;">Update Enquiry Link Settings</h3>
        <div class="fields-grid">
          ${canEditBulk ? `
            <div>
              <label for="editLnkType">Link Type</label>
              <select id="editLnkType" onchange="App.onLeadLinkTypeChange('editLnk', this.value)">
                <option value="advisor" ${!isBulk ? 'selected' : ''}>Associate / Advisor Link</option>
                <option value="bulk_whatsapp" ${isBulk ? 'selected' : ''}>Bulk WhatsApp Marketing (Advisor: Aiswarya · 9289846060)</option>
              </select>
            </div>
          ` : ''}
          <div>
            <label for="editLnkTitle">Link Label</label>
            <input id="editLnkTitle" maxlength="180" value="${Utils.escapeHTML(lnk.title || '')}" placeholder="e.g. Prestige Luxury Campaign">
          </div>
          <div>
            <label for="editLnkProject">Project Selection</label>
            <select id="editLnkProject">
              <option value="">All Active Projects (Customer Chooses)</option>
              ${projects.map(p => `<option value="${p.id}" ${lnk.project_id === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${Utils.escapeHTML(p.developer_name || '')})</option>`).join('')}
            </select>
          </div>
          ${campaignsEnabled ? `
            <div>
              <label for="editLnkCampaign">Campaign (Optional)</label>
              <select id="editLnkCampaign">
                <option value="">No Campaign</option>
                ${campaigns.map(c => `<option value="${c.id}" ${lnk.campaign_id === c.id ? 'selected' : ''}>${Utils.escapeHTML(c.name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          <div>
            <label for="editLnkSource">Enquiry Source</label>
            <select id="editLnkSource">
              ${sourceChoices.map(src => `<option value="${Utils.escapeHTML(src)}" ${lnk.source_name === src ? 'selected' : ''}>${Utils.escapeHTML(src)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label for="editLnkExpires">Expiration Date & Time (Leave empty for no expiry)</label>
            <input id="editLnkExpires" type="datetime-local" value="${toLocalInputVal(lnk.expires_at)}">
          </div>
          <div>
            <label for="editLnkActive">Link Status</label>
            <select id="editLnkActive">
              <option value="1" ${lnk.is_active ? 'selected' : ''}>Active</option>
              <option value="0" ${!lnk.is_active ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          ${canEditBulk ? `
            <div id="editLnkBulkAdvisorNameWrap" class="${isBulk ? '' : 'hidden'}">
              <label for="editLnkAdvisorName">Receipt Advisor Name</label>
              <input id="editLnkAdvisorName" maxlength="120" value="${Utils.escapeHTML(lnk.advisor_display_name || 'Aiswarya')}">
            </div>
            <div id="editLnkBulkAdvisorPhoneWrap" class="${isBulk ? '' : 'hidden'}">
              <label for="editLnkAdvisorPhone">Receipt Advisor Number</label>
              <input id="editLnkAdvisorPhone" maxlength="32" value="${Utils.escapeHTML(lnk.advisor_display_phone || '9289846060')}">
            </div>
          ` : ''}
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="btn soft" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" id="btnSaveEditLnk" class="btn primary">Save Changes</button>
        </div>
      </form>
    `);
  } catch (err) {
    Utils.showModal(`<div style="padding:20px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`);
  }
};

App.handleUpdateTrackingLink = async function(e, linkId) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveEditLnk');
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    const expVal = document.getElementById('editLnkExpires')?.value || '';
    const editTypeEl = document.getElementById('editLnkType');
    const payload = {
      title: document.getElementById('editLnkTitle')?.value.trim() || '',
      project_id: document.getElementById('editLnkProject')?.value || null,
      source_name: document.getElementById('editLnkSource')?.value || 'Enquiry Link',
      expires_at: expVal ? new Date(expVal).toISOString() : null,
      is_active: document.getElementById('editLnkActive')?.value === '1'
    };
    if (editTypeEl) {
      payload.link_type = editTypeEl.value || 'advisor';
      if (payload.link_type === 'bulk_whatsapp') {
        payload.advisor_display_name = document.getElementById('editLnkAdvisorName')?.value.trim() || 'Aiswarya';
        payload.advisor_display_phone = document.getElementById('editLnkAdvisorPhone')?.value.trim() || '9289846060';
      }
    }
    const campEl = document.getElementById('editLnkCampaign');
    if (campEl) payload.campaign_id = campEl.value || null;

    await API.patch(`/lead-links/${linkId}`, payload);
    Utils.closeModal();
    Utils.toast('Enquiry link updated successfully!');
    App.renderLeadGeneration(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
};

App.toggleTrackingLinkStatus = async function(linkId, nextActive) {
  try {
    if (nextActive === 0) {
      await API.post(`/lead-links/${linkId}/deactivate`, {});
      Utils.toast('Enquiry link deactivated.');
    } else {
      await API.patch(`/lead-links/${linkId}`, { is_active: 1 });
      Utils.toast('Enquiry link reactivated.');
    }
    App.renderLeadGeneration(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openLinkAnalyticsModal = async function(linkId) {
  Utils.showModal(`<div style="padding:30px; text-align:center;">Loading link analytics...</div>`);
  try {
    const data = await API.get(`/lead-links/${linkId}/analytics`);
    const lnk = data.link;
    const m = data.metrics || {};
    const leads = data.recentLeads || [];

    Utils.showModal(`
      <div style="text-align:left;">
        <div class="eyebrow">LINK PERFORMANCE & ATTRIBUTION</div>
        <h3 style="margin:4px 0 8px;">${Utils.escapeHTML(lnk.title || lnk.project_name || 'Enquiry Link')}</h3>
        <div style="background:var(--pale); padding:12px; border-radius:8px; margin-bottom:16px; font-size:12.5px;">
          <div><strong>Short URL:</strong> <code>${Utils.escapeHTML(lnk.shortUrl)}</code></div>
          <div style="margin-top:4px;"><strong>Token URL:</strong> <code style="word-break:break-all;">${Utils.escapeHTML(lnk.fullUrl)}</code></div>
          <div style="margin-top:4px;"><strong>Owner:</strong> ${Utils.escapeHTML(lnk.owner_associate_name || lnk.owner_sales_head_name || lnk.creator_name)} · <strong>Created:</strong> ${Utils.formatDate(lnk.created_at)}</div>
        </div>
        <div class="kpi-grid" style="margin-bottom:16px;">
          <div class="kpi-card"><div class="kpi-label">Link Opens</div><div class="kpi-value">${m.totalOpens || 0}</div><div class="kpi-sub">${m.uniqueOpens || 0} unique</div></div>
          <div class="kpi-card"><div class="kpi-label">Form Starts</div><div class="kpi-value">${m.formStarts || 0}</div></div>
          <div class="kpi-card"><div class="kpi-label">Submissions</div><div class="kpi-value">${m.totalSubmissions || 0}</div><div class="kpi-sub">${m.uniqueSubmissions || 0} unique</div></div>
          <div class="kpi-card"><div class="kpi-label">Conversion</div><div class="kpi-value">${m.visitToSubmissionRate || 0}%</div><div class="kpi-sub">Open → Submit</div></div>
        </div>
        <h4 style="margin-bottom:8px;">Recent Enquiries (${leads.length})</h4>
        <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
          <table>
            <thead><tr><th>Ref</th><th>Customer</th><th>Project</th><th>Stage</th></tr></thead>
            <tbody>
              ${leads.length ? leads.map(l => `
                <tr>
                  <td><code>${Utils.escapeHTML(l.enquiry_ref)}</code></td>
                  <td>${Utils.escapeHTML(l.customer_name)}</td>
                  <td>${Utils.escapeHTML(l.project_name || '—')}</td>
                  <td><span class="badge lead-stage-${l.stage}">${Utils.escapeHTML(l.stage.replace(/_/g, ' '))}</span></td>
                </tr>
              `).join('') : `<tr><td colspan="4" style="text-align:center; padding:16px; color:var(--muted);">No submissions yet.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button class="btn soft" onclick="App.copyTextToClipboard('${Utils.escapeHTML(lnk.shortUrl)}')">Copy Link</button>
          <button class="btn primary" onclick="Utils.closeModal()">Close</button>
        </div>
      </div>
    `);
  } catch (err) {
    Utils.showModal(`<div style="padding:20px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`);
  }
};

App.openCreateCampaignModal = function() {
  Utils.showModal(`
    <form onsubmit="App.handleCreateCampaign(event)" style="text-align:left;">
      <h3 style="margin-bottom:14px;">Create Marketing Campaign</h3>
      <div style="margin-bottom:12px;"><label>Campaign Name *</label><input id="campName" required placeholder="e.g. Prestige Festive Launch 2026"></div>
      <div style="margin-bottom:12px;"><label>Source Channel</label>
        <select id="campChannel">
          <option value="Digital">Digital / Performance Ads</option>
          <option value="WhatsApp">WhatsApp Broadcast</option>
          <option value="Instagram">Instagram / Meta</option>
          <option value="Google">Google Search</option>
          <option value="Channel Partner">Channel Partner</option>
          <option value="Offline Event">Offline Event</option>
        </select>
      </div>
      <div style="margin-bottom:16px;"><label>Description</label><textarea id="campDesc" rows="2"></textarea></div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn soft" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Create Campaign</button>
      </div>
    </form>
  `);
};

App.handleCreateCampaign = async function(e) {
  e.preventDefault();
  try {
    await API.post('/lead-links/campaigns', {
      name: document.getElementById('campName').value.trim(),
      source_channel: document.getElementById('campChannel').value,
      description: document.getElementById('campDesc').value.trim()
    });
    Utils.closeModal();
    Utils.toast('Campaign created!');
    App.renderLeadGeneration(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
