// Digital Invitation Builder Component
App.renderInvitationBuilder = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading invitation creator...</div>`;

  try {
    // Preload projects, developers and customers for fast dropdowns
    const [devsRes, projsRes, custsRes] = await Promise.all([
      API.get('/developers'),
      API.get('/projects'),
      API.get('/customers')
    ]);

    const developers = devsRes.developers || [];
    const projects = projsRes.projects || [];
    const customers = custsRes.customers || [];

    this.cache.developers = developers;
    this.cache.projects = projects;
    this.cache.customers = customers;

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">DIGITAL INVITATION BUILDER</div>
          <h1 class="page-title">Create a Considered Property Invitation</h1>
          <p class="page-desc">Every detail of the site visit, beautifully curated in one link.</p>
        </div>
      </div>

      <div class="builder-layout">
        <!-- Builder Form -->
        <form class="panel" id="builderForm" onsubmit="App.handleCreateInvitation(event)">
          <!-- Step 01: Customer Details -->
          <div class="builder-form-section">
            <div class="step-header">
              <span class="step-num">01</span>
              <h3>Customer & Advisor</h3>
            </div>

            <div class="fields-grid">
              <div class="field-full">
                <label>Select Existing Customer or Enter New</label>
                <select id="inviteCustomerSelect" onchange="App.onBuilderCustomerSelect(this.value)">
                  <option value="">-- Or enter new customer below --</option>
                  ${customers.map(c => `
                    <option value="${c.id}" data-name="${Utils.escapeHTML(c.full_name)}" data-phone="${Utils.escapeHTML(c.mobile_number)}" data-email="${Utils.escapeHTML(c.email || '')}" data-project="${c.interested_project_id || ''}">
                      ${Utils.escapeHTML(c.full_name)} (${Utils.escapeHTML(c.mobile_number)})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label for="inviteCustomerName">Customer Name *</label>
                <input id="inviteCustomerName" required placeholder="e.g. Rohan Singhania" oninput="App.updateLivePreview()">
              </div>

              <div>
                <label for="inviteCustomerPhone">Customer Mobile / WhatsApp *</label>
                <input id="inviteCustomerPhone" type="tel" required placeholder="+91 98101 23456" oninput="App.updateLivePreview()">
              </div>

              <div>
                <label for="inviteAdvisorName">Host / Sales Associate *</label>
                <input id="inviteAdvisorName" required value="${Utils.escapeHTML(this.currentUser.name)}" oninput="App.updateLivePreview()">
              </div>

              <div>
                <label for="inviteAdvisorPhone">Advisor Phone *</label>
                <input id="inviteAdvisorPhone" required value="${Utils.escapeHTML(this.currentUser.phone || '+91 98111 22334')}" oninput="App.updateLivePreview()">
              </div>
            </div>
          </div>

          <!-- Step 02: Property Details -->
          <div class="builder-form-section">
            <div class="step-header">
              <span class="step-num">02</span>
              <h3>Property & Residence</h3>
            </div>

            <div class="fields-grid">
              <div>
                <label for="inviteDeveloperSelect">Developer *</label>
                <select id="inviteDeveloperSelect" required onchange="App.onBuilderDeveloperChange(this.value)">
                  ${developers.map(d => `<option value="${d.id}">${Utils.escapeHTML(d.name)}</option>`).join('')}
                </select>
              </div>

              <div>
                <label for="inviteProjectSelect">Project *</label>
                <select id="inviteProjectSelect" required onchange="App.onBuilderProjectChange(this.value)">
                  <!-- Populated dynamically based on developer -->
                </select>
              </div>

              <div>
                <label for="inviteSize">Apartment / Unit Size</label>
                <input id="inviteSize" placeholder="e.g. 2,400 sq. ft." oninput="App.updateLivePreview()">
              </div>

              <div>
                <label for="invitePrice">Price / Quotation</label>
                <input id="invitePrice" placeholder="e.g. ₹4.80 Cr" oninput="App.updateLivePreview()">
              </div>

              <div class="field-full">
                <label for="inviteLocation">Meeting Location / Experience Gallery *</label>
                <input id="inviteLocation" required placeholder="Project address or sales pavilion" oninput="App.updateLivePreview()">
              </div>

              <div class="field-full">
                <label for="inviteMaps">Google Maps Location Link</label>
                <input id="inviteMaps" type="url" placeholder="https://maps.google.com/..." oninput="App.updateLivePreview()">
              </div>
            </div>
          </div>

          <!-- Step 03: Schedule -->
          <div class="builder-form-section">
            <div class="step-header">
              <span class="step-num">03</span>
              <h3>Visit Schedule</h3>
            </div>

            <div class="fields-grid">
              <div>
                <label for="inviteDate">Invitation Date *</label>
                <input id="inviteDate" type="date" required value="${todayStr}" min="${todayStr}" oninput="App.updateLivePreview()">
              </div>

              <div>
                <label for="inviteTime">Visit Time *</label>
                <input id="inviteTime" type="time" required value="11:30" oninput="App.updateLivePreview()">
              </div>

              <div>
                <label for="inviteDuration">Expected Duration</label>
                <select id="inviteDuration" onchange="App.updateLivePreview()">
                  <option value="30">30 minutes</option>
                  <option value="60" selected>60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>

              <div>
                <label>Time Zone</label>
                <input value="India Standard Time (UTC+05:30)" readonly style="background:#f9f8fc;">
              </div>

              <div class="field-full">
                <label for="inviteNotes">Personal Discussion Notes / Preferences</label>
                <textarea id="inviteNotes" placeholder="Apartment configuration, preferred views or specific arrangements discussed..." oninput="App.updateLivePreview()"></textarea>
              </div>
            </div>
          </div>

          <!-- Submit Bar -->
          <div style="padding: 18px 24px; background: #faf9fd; display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--line);">
            <span style="font-size: 11px; color: var(--muted);">Review the live preview on the right before sharing.</span>
            <button type="submit" class="btn primary" id="btnSubmitInvite">
              Generate & Share Invitation ↗
            </button>
          </div>
        </form>

        <!-- Live Preview Column -->
        <aside class="preview-sticky">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; font-size:10.5px; font-weight:700; letter-spacing:1.2px; color:var(--muted);">
            <span>LIVE INVITATION PREVIEW</span>
            <span class="badge confirmed">● Real-time</span>
          </div>

          <div id="livePreviewContainer">
            <!-- Rendered by updateLivePreview() -->
          </div>

          <p style="text-align:center; font-size:11px; color:var(--muted); margin-top:14px;">
            A personal property invitation. Generates a secure unguessable URL and instant QR check-in pass.
          </p>
        </aside>
      </div>
    `;

    // Setup custom searchable dropdowns with real-time search bars
    Utils.setupSearchableSelect('inviteCustomerSelect', 'Search customer name or phone...');
    Utils.setupSearchableSelect('inviteDeveloperSelect', 'Search developer (e.g. DLF, M3M)...');

    // Trigger initial cascade
    if (developers.length) {
      App.onBuilderDeveloperChange(developers[0].id);
    }
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error loading builder: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.onBuilderCustomerSelect = function(custId) {
  if (!custId) return;
  const select = document.getElementById('inviteCustomerSelect');
  const opt = select.options[select.selectedIndex];
  if (!opt) return;

  document.getElementById('inviteCustomerName').value = opt.getAttribute('data-name') || '';
  document.getElementById('inviteCustomerPhone').value = opt.getAttribute('data-phone') || '';

  const interestedProj = opt.getAttribute('data-project');
  if (interestedProj) {
    const proj = this.cache.projects.find(p => p.id === interestedProj);
    if (proj) {
      document.getElementById('inviteDeveloperSelect').value = proj.developer_id;
      this.onBuilderDeveloperChange(proj.developer_id, proj.id);
    }
  }

  Utils.searchableSelects.get('inviteCustomerSelect')?.refresh();
  this.updateLivePreview();
};

App.onBuilderDeveloperChange = function(devId, selectProjId = null) {
  const filtered = this.cache.projects.filter(p => p.developer_id === devId);
  const projSelect = document.getElementById('inviteProjectSelect');

  projSelect.innerHTML = filtered.map(p => `
    <option value="${p.id}" ${p.id === selectProjId ? 'selected' : ''}>
      ${Utils.escapeHTML(p.name)}
    </option>
  `).join('');

  // Rebuild searchable dropdown for projects with matching options
  Utils.setupSearchableSelect('inviteProjectSelect', 'Search project name...');
  Utils.searchableSelects.get('inviteDeveloperSelect')?.refresh();

  if (filtered.length) {
    this.onBuilderProjectChange(selectProjId || filtered[0].id);
  } else {
    this.updateLivePreview();
  }
};

App.onBuilderProjectChange = function(projId) {
  const proj = this.cache.projects.find(p => p.id === projId);
  if (!proj) return;

  const projSelect = document.getElementById('inviteProjectSelect');
  if (projSelect) projSelect.value = projId;
  Utils.searchableSelects.get('inviteProjectSelect')?.refresh();

  document.getElementById('inviteLocation').value = proj.location || '';
  document.getElementById('inviteMaps').value = proj.google_maps_url || '';
  document.getElementById('inviteSize').value = proj.super_built_up_area || '';
  document.getElementById('invitePrice').value = proj.starting_price || '';

  this.updateLivePreview();
};

App._previewRaf = null;
App.updateLivePreview = function() {
  if (this._previewRaf) cancelAnimationFrame(this._previewRaf);
  this._previewRaf = requestAnimationFrame(() => {
    this._renderLivePreviewImmediate();
  });
};

App._renderLivePreviewImmediate = function() {
  const container = document.getElementById('livePreviewContainer');
  if (!container) return;

  const customerName = document.getElementById('inviteCustomerName')?.value.trim() || 'Valued Client';
  const advisorName = document.getElementById('inviteAdvisorName')?.value.trim() || this.currentUser.name;
  const advisorPhone = document.getElementById('inviteAdvisorPhone')?.value.trim() || '+91 98111 22334';
  const devSelect = document.getElementById('inviteDeveloperSelect');
  const devId = devSelect?.value;
  const dev = this.cache?.developers?.find(d => d.id === devId);
  const devName = dev?.name || devSelect?.options[devSelect.selectedIndex]?.text || 'Developer';
  const devLogo = dev?.company_logo || '';

  const projSelect = document.getElementById('inviteProjectSelect');
  const projId = projSelect?.value;
  const proj = this.cache?.projects?.find(p => p.id === projId);
  const projName = proj?.name || projSelect?.options[projSelect.selectedIndex]?.text || 'Luxury Showcase Residence';
  const projLogo = proj?.project_logo || '';

  const size = document.getElementById('inviteSize')?.value.trim() || '2,400 sq. ft.';
  const price = document.getElementById('invitePrice')?.value.trim() || 'Price as discussed';
  const location = document.getElementById('inviteLocation')?.value.trim() || 'Project Experience Centre';
  const dateVal = document.getElementById('inviteDate')?.value || '';
  const timeVal = document.getElementById('inviteTime')?.value || '';
  const duration = document.getElementById('inviteDuration')?.value || '60';
  const notes = document.getElementById('inviteNotes')?.value.trim() || '';

  const dateBadge = Utils.getDateBadge(dateVal);
  const formattedDate = Utils.formatDate(dateVal);
  const formattedTime = Utils.formatTime(timeVal);

  container.innerHTML = `
    <article class="invitation-card">
      <div class="inv-inner">
        <!-- Top Agency & Developer Header -->
        <div class="inv-top">
          <div>
            <div class="inv-agency">${Utils.escapeHTML(this.currentUser.organization_name || 'Visit Studio Realty')}</div>
            <div class="inv-agency-sub">Private Viewings & Luxury Portfolio</div>
          </div>
          <div class="inv-dev-badge" style="display:flex; align-items:center; gap:10px; justify-content:flex-end;">
            <div style="text-align:right;">
              <div class="inv-dev-name" style="font-size:15px; font-weight:700; color:var(--ink); line-height:1.2;">
                ${Utils.escapeHTML(devName)}
              </div>
              <div class="inv-dev-sub" style="font-size:9px; letter-spacing:1.5px; color:var(--muted); text-transform:uppercase;">
                BUILDER / DEVELOPER
              </div>
            </div>
            ${devLogo ? `
              <div style="width:42px; height:42px; border-radius:8px; background:#ffffff; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:3px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                <img src="${devLogo}" alt="${Utils.escapeHTML(devName)}" style="max-width:100%; max-height:100%; object-fit:contain;">
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Hero Greeting -->
        <div class="inv-hero">
          <div class="eyebrow">YOU'RE PERSONALLY INVITED</div>
          <h2>Your next address.<br>A closer look.</h2>
          <p>Dear ${Utils.escapeHTML(customerName)}, we look forward to welcoming you.</p>
          <span class="inv-badge-pill">Site Visit Invitation</span>
        </div>

        <!-- Property Specs -->
        <div class="inv-property-box" style="position:relative; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <div style="flex:1;">
              <div class="eyebrow" style="color:var(--muted); margin-bottom:4px;">YOUR SELECTED RESIDENCE</div>
              <h3 class="inv-property-title" style="margin-bottom:4px;">${Utils.escapeHTML(projName)}</h3>
              <div style="font-size:12px; color:var(--purple); font-weight:600; margin-bottom:12px;">
                BY ${Utils.escapeHTML(devName)}
              </div>
            </div>
            ${projLogo ? `
              <div style="width:52px; height:52px; border-radius:10px; background:#ffffff; border:1.5px solid #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:4px; flex-shrink:0; box-shadow:0 3px 10px rgba(0,0,0,0.06);">
                <img src="${projLogo}" alt="${Utils.escapeHTML(projName)}" style="max-width:100%; max-height:100%; object-fit:contain;">
              </div>
            ` : ''}
          </div>
          <div class="inv-prop-specs">
            <div>
              <span>Super built-up area</span>
              <b>${Utils.escapeHTML(size)}</b>
            </div>
            <div>
              <span>Discussed price</span>
              <b>${Utils.escapeHTML(price)}</b>
            </div>
          </div>
        </div>

        <!-- Schedule Row -->
        <div class="inv-schedule-row">
          <div class="inv-date-box">
            <span class="inv-date-month">${dateBadge.month}</span>
            <b class="inv-date-day">${dateBadge.day}</b>
          </div>
          <div class="inv-schedule-text">
            <strong>${formattedDate}</strong>
            <p>${formattedTime} · ${duration} minutes duration</p>
          </div>
        </div>

        <!-- Meeting Address -->
        <div class="inv-detail-block">
          <span>MEETING LOCATION</span>
          <div>${Utils.escapeHTML(location)}</div>
        </div>

        ${notes ? `
          <div class="inv-detail-block">
            <span>DISCUSSION NOTES</span>
            <div style="color: #4b4860;">${Utils.escapeHTML(notes)}</div>
          </div>
        ` : ''}

        <!-- Sales Host Advisor -->
        <div class="inv-advisor-row">
          <div>
            <span>YOUR PROPERTY ADVISOR</span>
            <b>${Utils.escapeHTML(advisorName)}</b>
          </div>
          <div>
            <span style="text-align:right;">CONTACT</span>
            <b>${Utils.escapeHTML(advisorPhone)}</b>
          </div>
        </div>

        <!-- Disclaimer -->
        <div class="inv-disclaimer">
          Issued as a site visit invitation, not an official developer allocation or purchase agreement. Area and pricing are as discussed and subject to verification and terms.
        </div>
      </div>

      <div class="inv-footer">
        PERSONALLY ARRANGED · ${Utils.escapeHTML(this.currentUser.organization_name || 'VISIT STUDIO')} · SECURE QR PASS ENABLED
      </div>
    </article>
  `;
};

// Handle Create Invitation Form Submission
App.handleCreateInvitation = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitInvite');
  btn.disabled = true;
  btn.textContent = 'Generating Secure Link & QR...';

  try {
    const custSelect = document.getElementById('inviteCustomerSelect');
    const customerId = custSelect.value || null;
    const customerName = document.getElementById('inviteCustomerName').value.trim();
    const customerPhone = document.getElementById('inviteCustomerPhone').value.trim();
    const projectId = document.getElementById('inviteProjectSelect').value;
    const developerId = document.getElementById('inviteDeveloperSelect').value;
    const size = document.getElementById('inviteSize').value.trim();
    const price = document.getElementById('invitePrice').value.trim();
    const location = document.getElementById('inviteLocation').value.trim();
    const mapsUrl = document.getElementById('inviteMaps').value.trim();
    const visitDate = document.getElementById('inviteDate').value;
    const visitTime = document.getElementById('inviteTime').value;
    const duration = document.getElementById('inviteDuration').value;
    const notes = document.getElementById('inviteNotes').value.trim();

    const payload = {
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      project_id: projectId,
      developer_id: developerId,
      size,
      price,
      location,
      maps_url: mapsUrl,
      visit_date: visitDate,
      visit_time: visitTime,
      duration: Number(duration),
      notes
    };

    const res = await API.post('/invitations', payload);
    const invite = res.invitation;

    Utils.toast('Invitation created and automated notification dispatched!');
    App.showShareModal(invite, customerName, customerPhone);
  } catch (err) {
    Utils.toast('Error creating invitation: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate & Share Invitation ↗';
  }
};

// Show Share Modal with Generated Card Image, Short Link, WhatsApp & QR
App.showShareModal = async function(invitation, customerName, customerPhone) {
  const custName = customerName || invitation.customer_name || 'Valued Client';
  const custPhone = customerPhone || invitation.customer_phone || '';
  const currentBase = window.location.origin;

  const shortCode = invitation.short_code || (invitation.id ? invitation.id.replace('inv-', '') : '');
  const shortUrl = shortCode ? `${currentBase}/i/${shortCode}` : `${currentBase}/?invite=${invitation.token}`;
  const inviteUrl = `${currentBase}/?invite=${invitation.token}`;

  // Show preliminary loading state in modal
  Utils.showModal(`
    <div style="text-align:center; padding: 40px 20px;">
      <div class="monogram" style="margin: 0 auto 16px;">V</div>
      <h3 style="font-family:'Playfair Display', serif; font-size:22px; color:var(--ink); margin-bottom:8px;">Crafting VIP Invitation Pass...</h3>
      <p style="font-size:12.5px; color:var(--muted);">Rendering high-resolution personalized pass image with contactless check-in QR & short link.</p>
    </div>
  `);

  const selectedDevId = document.getElementById('inviteDeveloperSelect')?.value;
  const selectedProjId = document.getElementById('inviteProjectSelect')?.value;
  const matchedDev = App.cache?.developers?.find(d => d.id === (invitation.developer_id || selectedDevId));
  const matchedProj = App.cache?.projects?.find(p => p.id === (invitation.project_id || selectedProjId));

  // Gather full invitation parameters for the card
  const cardData = {
    agency_name: invitation.agency_name || App.currentUser?.organization_name || 'VISIT STUDIO',
    customer_name: custName,
    customer_phone: custPhone,
    project_name: invitation.project_name || document.getElementById('inviteProjectSelect')?.options[document.getElementById('inviteProjectSelect')?.selectedIndex]?.text || 'Luxury Residence',
    developer_name: invitation.developer_name || document.getElementById('inviteDeveloperSelect')?.options[document.getElementById('inviteDeveloperSelect')?.selectedIndex]?.text || 'Premier Developer',
    developer_logo: invitation.developer_logo || matchedDev?.company_logo || null,
    project_logo: invitation.project_logo || matchedProj?.project_logo || null,
    visit_date: invitation.scheduled_date || invitation.visit_date || document.getElementById('inviteDate')?.value || new Date().toISOString(),
    visit_time: invitation.scheduled_time || invitation.visit_time || document.getElementById('inviteTime')?.value || '11:30',
    duration: invitation.duration || document.getElementById('inviteDuration')?.value || 60,
    size: invitation.size || document.getElementById('inviteSize')?.value || '',
    price: invitation.price || document.getElementById('invitePrice')?.value || '',
    location: invitation.location || invitation.project_location || document.getElementById('inviteLocation')?.value || 'Experience Gallery',
    advisor_name: invitation.advisor_name || document.getElementById('inviteAdvisorName')?.value || App.currentUser?.name || 'Amit Verma',
    advisor_phone: invitation.advisor_phone || document.getElementById('inviteAdvisorPhone')?.value || App.currentUser?.phone || '+91 98765 43210',
    shortUrl: shortUrl,
    short_code: shortCode,
    qr_code_data: invitation.qr_code_data || inviteUrl
  };

  // Generate high-res pass image via Canvas
  const card = await Utils.generateInvitationCard(cardData);
  App._activeCard = card;
  App._activeCardData = cardData;

  // Sync HD pass image to server in background so WhatsApp OpenGraph link preview displays it immediately
  if (invitation.id && card.dataUrl) {
    API.post(`/invitations/${invitation.id}/card-image`, { image_base64: card.dataUrl })
      .catch(e => console.warn('Card image upload error:', e));
  }

  const cleanPhone = custPhone.replace(/[^\d]/g, '');
  const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const waMessage = encodeURIComponent(
`*VIP PROPERTY VISIT INVITATION* ✨
Dear ${custName},

You are cordially invited for an exclusive private walkthrough at *${cardData.project_name}* (${cardData.developer_name}).

📅 *Date:* ${Utils.formatDate(cardData.visit_date)}
⏰ *Time:* ${Utils.formatTime(cardData.visit_time)}
📍 *Location:* ${cardData.location}

🔗 *View Official Invitation & Live Pass:*
${shortUrl}

_(Personalized VIP Invitation Pass image attached)_`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  const waSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="flex-shrink:0;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

  const modalHtml = `
    <div style="text-align:center; margin-bottom: 14px;">
      <div class="eyebrow" style="color:#2563eb;">VIP PASS & SHORT LINK READY</div>
      <h2 class="modal-title" style="margin-bottom:4px; font-size:20px;">Invitation Pass Generated!</h2>
      <p class="modal-desc" style="margin-bottom:0; font-size:12.5px;">Personalized VIP pass card with contactless QR & short link.</p>
    </div>

    <!-- Pass Card Image Preview -->
    <div style="text-align:center; margin: 10px 0 14px; background:#080e1e; padding:12px; border-radius:14px; border:1px solid #bfdbfe;">
      <img src="${card.dataUrl}" alt="Invitation Pass Card" style="max-height:240px; max-width:100%; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.4); border:1px solid #60a5fa; cursor:pointer;" onclick="App.downloadActiveCard()" title="Click to download high-res PNG">
      <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:8px;">
        <span style="font-size:11px; color:#93c5fd; font-weight:600;">✨ 1080×1440 HD VIP Pass Image</span>
        <button type="button" class="btn small soft" onclick="App.downloadActiveCard()" style="font-size:11px; padding:3px 10px; color:#60a5fa; border-color:#3b82f6;">
          📥 Download Image
        </button>
      </div>
    </div>

    <!-- Short Link Box -->
    <div style="margin-bottom: 12px;">
      <label style="font-size:11px; font-weight:700; color:var(--ink); margin-bottom:4px; display:block;">
        SHORT INVITATION LINK (EASY TO SHARE)
      </label>
      <div style="display:flex; gap:8px;">
        <input id="shareModalInput" readonly value="${Utils.escapeHTML(shortUrl)}" style="background:#f8faff; border:1.5px solid #bfdbfe; font-size:12px; font-weight:600; color:#1e3a8a;">
        <button class="btn primary" onclick="App.copyShareUrl()" style="white-space:nowrap; padding:6px 14px; font-size:12px;">
          Copy Link
        </button>
      </div>
    </div>

    <!-- Helpful Sharing Tip -->
    <div style="background:#fef9c3; border:1px solid #fde047; border-radius:8px; padding:8px 12px; margin-bottom:12px; font-size:11.5px; color:#854d0e; line-height:1.45;">
      <strong>💡 WhatsApp Sharing Note:</strong> Android WhatsApp me jab aap image file share karte hain toh WhatsApp caption auto-fill nahi karta. Isliye humne <strong>caption text auto-copy</strong> kar diya hai — WhatsApp me niche <strong>"Add a caption..."</strong> pe tap karke <strong>Paste</strong> kar dein!
    </div>

    <!-- Primary Sharing Actions: Unified Single WhatsApp Share -->
    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 14px;">
      <!-- Single Unified WhatsApp Button -->
      <button type="button" class="btn" onclick="App.smartWhatsAppShare('${waUrl}')" style="background:#25D366; color:#ffffff; border:none; justify-content:center; padding:13px 16px; font-size:14px; font-weight:700; width:100%; box-shadow:0 4px 16px rgba(37,211,102,0.38); border-radius:10px; display:flex; align-items:center; gap:9px; cursor:pointer;">
        ${waSvg}
        <span>Share Pass Image (Auto-Copy Caption) ↗</span>
      </button>

      <!-- 1-Click WhatsApp Text & Link -->
      <button type="button" class="btn soft" onclick="App.sendWhatsAppTextOnly('${waUrl}')" style="justify-content:center; padding:10px 14px; font-size:12px; font-weight:600; color:#15803d; border-color:#86efac; background:#f0fdf4;">
        ${waSvg}
        <span>Send WhatsApp Text & Live Pass (1-Click) ↗</span>
      </button>

      <!-- Button 2 & 3 Grid: Copy Text & Download Image -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <button type="button" class="btn soft" onclick="App.copyInvitationMessage()" style="justify-content:center; padding:10px 8px; font-size:11.5px; font-weight:600;">
          <span>📋 Copy Message Text</span>
        </button>

        <button type="button" class="btn soft" onclick="App.downloadActiveCard()" style="justify-content:center; padding:10px 8px; font-size:11.5px; font-weight:600;">
          <span>📥 Download HD Card</span>
        </button>
      </div>
    </div>

    <!-- Secondary Links Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--line);">
      <a href="${inviteUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px; color:#2563eb; font-weight:600; text-decoration:none;">
        Open Customer View Page ↗
      </a>
      <button class="btn small soft" onclick="Utils.closeModal(); App.navigate('invitations');">
        Go to Invitations List →
      </button>
    </div>
  `;

  Utils.showModal(modalHtml);
};

App.downloadActiveCard = function() {
  if (App._activeCard && App._activeCard.dataUrl) {
    const custName = (App._activeCardData?.customer_name || 'guest').replace(/\s+/g, '_');
    Utils.downloadDataUrl(App._activeCard.dataUrl, `VIP-Pass-${custName}.png`);
    Utils.toast('Invitation Card Image downloaded!');
  }
};

App.copyCardImage = async function() {
  if (App._activeCard && App._activeCard.blob) {
    const success = await Utils.copyImageToClipboard(App._activeCard.blob);
    if (!success) {
      App.downloadActiveCard();
    }
  }
};

App.copyInvitationMessage = async function() {
  const data = App._activeCardData || {};
  const shortUrl = data.shortUrl || window.location.origin;
  const waText = 
`*VIP PROPERTY VISIT INVITATION* ✨
Dear ${data.customer_name || 'Guest'},

You are cordially invited for an exclusive private walkthrough at *${data.project_name}* (${data.developer_name}).

📅 *Date:* ${Utils.formatDate(data.visit_date)}
⏰ *Time:* ${Utils.formatTime(data.visit_time)}
📍 *Location:* ${data.location}

🔗 *View Official Invitation & Live Pass:*
${shortUrl}

_(Personalized VIP Invitation Pass image attached)_`;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(waText);
      Utils.toast('✨ Invitation text & live link copied to clipboard!');
    } else {
      prompt('Copy invitation text:', waText);
    }
  } catch (err) {
    prompt('Copy invitation text:', waText);
  }
};

App.smartWhatsAppShare = async function(waFallbackUrl) {
  const card = App._activeCard;
  const data = App._activeCardData || {};

  const cleanPhone = (data.customer_phone || '').replace(/[^\d]/g, '');
  const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const shortUrl = data.shortUrl || window.location.origin;

  const waText = 
`*VIP PROPERTY VISIT INVITATION* ✨
Dear ${data.customer_name || 'Guest'},

You are cordially invited for an exclusive private walkthrough at *${data.project_name}* (${data.developer_name}).

📅 *Date:* ${Utils.formatDate(data.visit_date)}
⏰ *Time:* ${Utils.formatTime(data.visit_time)}
📍 *Location:* ${data.location}

🔗 *View Official Invitation & Live Pass:*
${shortUrl}

_(Personalized VIP Invitation Pass image attached)_`;

  // Always copy caption text to clipboard first so user can paste into WhatsApp caption!
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(waText);
    }
  } catch (e) {
    console.warn('Clipboard write failed:', e);
  }

  // 1. Mobile Native Share API: Directly attaches the image file into WhatsApp!
  if (navigator.canShare && card && card.file && navigator.canShare({ files: [card.file] })) {
    try {
      Utils.toast('✨ Image attached & caption copy ho chuka hai! WhatsApp caption me "Paste" kar dein.');
      const sharePayload = {
        files: [card.file],
        text: waText
      };
      if (navigator.canShare(sharePayload)) {
        await navigator.share(sharePayload);
      } else {
        await navigator.share({ files: [card.file] });
      }
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User simply closed share sheet
      console.warn('Native share error, falling back:', err);
    }
  }

  // 2. Desktop WhatsApp Web / Browser Fallback:
  if (card && card.blob) {
    try {
      await Utils.copyImageToClipboard(card.blob);
      Utils.toast('✨ VIP Pass image copied! Opening WhatsApp... Just press Ctrl+V to paste.');
    } catch (e) {
      App.downloadActiveCard();
      Utils.toast('VIP Pass image downloaded! Opening WhatsApp...');
    }
  }

  const directWaUrl = waFallbackUrl || `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;
  setTimeout(() => {
    window.open(directWaUrl, '_blank');
  }, 400);
};

App.sendWhatsAppTextOnly = function(waFallbackUrl) {
  const data = App._activeCardData || {};
  const cleanPhone = (data.customer_phone || '').replace(/[^\d]/g, '');
  const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const shortUrl = data.shortUrl || window.location.origin;

  const waText = 
`*VIP PROPERTY VISIT INVITATION* ✨
Dear ${data.customer_name || 'Guest'},

You are cordially invited for an exclusive private walkthrough at *${data.project_name}* (${data.developer_name}).

📅 *Date:* ${Utils.formatDate(data.visit_date)}
⏰ *Time:* ${Utils.formatTime(data.visit_time)}
📍 *Location:* ${data.location}

🔗 *View Official Invitation & Live Pass:*
${shortUrl}`;

  const directWaUrl = waFallbackUrl || `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;
  window.open(directWaUrl, '_blank');
};

App.copyShareUrl = function() {
  const input = document.getElementById('shareModalInput');
  if (input) {
    navigator.clipboard.writeText(input.value).then(() => {
      Utils.toast('Short invitation link copied to clipboard!');
    }).catch(() => {
      input.select();
      Utils.toast('Link highlighted. Press Ctrl+C to copy.');
    });
  }
};
