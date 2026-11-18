// Organization Branding Settings Component (Without Cloud API credentials)
App.renderSettings = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading organization settings...</div>`;

  try {
    const data = await API.get('/settings');
    const s = data.settings || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">IDENTITY & BRANDING</div>
          <h1 class="page-title">Organization Settings</h1>
          <p class="page-desc">Brand aesthetics, agency title, luxury invitation header, and color palette.</p>
        </div>
      </div>

      <div style="max-width: 680px;">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Real Estate Brand Identity</h3>
          </div>
          <form onsubmit="App.handleSaveBrandSettings(event)" style="padding:24px;">
            <div style="margin-bottom:16px;">
              <label>Agency / Real Estate Firm Name *</label>
              <input id="setAgencyName" required value="${Utils.escapeHTML(s.agency_name || 'Visit Studio Realty')}">
            </div>

            <div style="margin-bottom:16px;">
              <label>Subtitle / Tagline</label>
              <input id="setAgencySubtitle" value="${Utils.escapeHTML(s.agency_subtitle || 'Luxury Real Estate Advisory')}">
              <small style="color:var(--muted); font-size:11px; display:block; margin-top:4px;">
                Displayed on the top header of all client-facing digital invitations.
              </small>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
              <div>
                <label>Primary Brand Color</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="color" id="setBrandColorPicker" value="${s.brand_color || '#1e1b4b'}" style="width:40px; height:38px; padding:0; cursor:pointer;" onchange="document.getElementById('setBrandColor').value = this.value">
                  <input id="setBrandColor" value="${Utils.escapeHTML(s.brand_color || '#1e1b4b')}">
                </div>
              </div>
              <div>
                <label>Accent Brand Color</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="color" id="setAccentColorPicker" value="${s.accent_color || '#f59e0b'}" style="width:40px; height:38px; padding:0; cursor:pointer;" onchange="document.getElementById('setAccentColor').value = this.value">
                  <input id="setAccentColor" value="${Utils.escapeHTML(s.accent_color || '#f59e0b')}">
                </div>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end;">
              <button type="submit" class="btn primary">Save Brand Settings</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding: 30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};

App.handleSaveBrandSettings = async function(e) {
  e.preventDefault();
  const payload = {
    agency_name: document.getElementById('setAgencyName').value.trim(),
    agency_subtitle: document.getElementById('setAgencySubtitle').value.trim(),
    brand_color: document.getElementById('setBrandColor').value.trim(),
    accent_color: document.getElementById('setAccentColor').value.trim()
  };

  try {
    const res = await API.put('/settings', payload);
    Utils.toast(res.message);
  } catch (err) {
    Utils.toast('Error saving branding: ' + err.message);
  }
};
