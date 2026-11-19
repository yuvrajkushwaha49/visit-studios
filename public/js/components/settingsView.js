// Organization Branding & SMTP Email Settings Component
App.renderSettings = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading organization settings...</div>`;

  try {
    const [brandRes, smtpRes] = await Promise.all([
      API.get('/settings').catch(() => ({ settings: {} })),
      API.get('/settings/smtp').catch(() => ({ smtp: {} }))
    ]);

    const s = brandRes.settings || {};
    const smtp = smtpRes.smtp || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">SYSTEM & COMMUNICATIONS</div>
          <h1 class="page-title">Settings & Email Setup</h1>
          <p class="page-desc">Manage firm identity and configure SMTP to send login credentials (ID, password & portal link) to your sales team.</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; align-items: start;">
        
        <!-- SMTP Email Service Panel -->
        <div class="panel" style="border-top: 3px solid #2563eb;">
          <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 class="panel-title" style="display:flex; align-items:center; gap:8px;">
                <span>✉ Email (SMTP) Configuration</span>
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--muted);">Used to email login IDs, passwords, and portal access links to employees.</p>
            </div>
            <div>
              ${smtp.is_configured ? `
                <span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; background:#ecfdf5; color:#065f46; font-size:12px; font-weight:600; border-radius:20px; border:1px solid #a7f3d0;">
                  <span style="width:7px; height:7px; background:#10b981; border-radius:50%;"></span> Configured
                </span>
              ` : `
                <span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; background:#fffbeb; color:#92400e; font-size:12px; font-weight:600; border-radius:20px; border:1px solid #fde68a;">
                  <span style="width:7px; height:7px; background:#f59e0b; border-radius:50%;"></span> Not Set Up
                </span>
              `}
            </div>
          </div>

          <form onsubmit="App.handleSaveSmtpSettings(event)" style="padding:24px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 14px; margin-bottom:18px;">
              <p style="margin:0; font-size:12px; line-height:18px; color:#475569;">
                <strong>💡 Quick Tip:</strong> For Gmail, enter <code>smtp.gmail.com</code>, Port <code>587</code>, and use a 16-character <strong>Google App Password</strong> (from your Google Account Security settings).
              </p>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:14px; margin-bottom:14px;">
              <div>
                <label>SMTP Host *</label>
                <input id="smtpHost" required placeholder="e.g. smtp.gmail.com" value="${Utils.escapeHTML(smtp.host || 'smtp.gmail.com')}">
              </div>
              <div>
                <label>Port *</label>
                <input id="smtpPort" type="number" required placeholder="587" value="${smtp.port || 587}">
              </div>
            </div>

            <div style="margin-bottom:14px;">
              <label>SMTP Username / Email *</label>
              <input id="smtpUsername" type="email" required placeholder="your-email@gmail.com" value="${Utils.escapeHTML(smtp.username || '')}">
            </div>

            <div style="margin-bottom:14px;">
              <label>SMTP Password / App Password *</label>
              <div style="position:relative;">
                <input id="smtpPassword" type="password" placeholder="${smtp.password_set ? '•••••••• (leave blank to keep current)' : 'Enter password or app password'}" value="">
                <button type="button" onclick="App.togglePasswordVisibility('smtpPassword')" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--muted); font-size:12px;">
                  Show
                </button>
              </div>
              <small style="color:var(--muted); font-size:11px; display:block; margin-top:3px;">
                ${smtp.password_set ? 'A password is currently saved in the database. Enter a new one only if updating.' : 'Enter your email password or 16-letter App Password.'}
              </small>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
              <div>
                <label>Sender From Name</label>
                <input id="smtpFromName" placeholder="Workians Realty" value="${Utils.escapeHTML(smtp.from_name || 'Workians Realty')}">
              </div>
              <div>
                <label>Sender From Email</label>
                <input id="smtpFromEmail" type="email" placeholder="no-reply@workians.com" value="${Utils.escapeHTML(smtp.from_email || '')}">
              </div>
            </div>

            <div style="margin-bottom:18px;">
              <label>Public Portal Access URL *</label>
              <input id="smtpPublicUrl" type="url" required placeholder="https://your-domain.com" value="${Utils.escapeHTML(smtp.public_url || 'https://intl-bryan-closer-timber.trycloudflare.com')}">
              <small style="color:var(--muted); font-size:11px; display:block; margin-top:3px;">
                This link is included in the email so employees can click directly to log in.
              </small>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding-top:8px; border-top:1px solid #f1f5f9;">
              <button type="button" class="btn soft" onclick="App.openTestSmtpModal()" style="color:#2563eb; border-color:#bfdbfe;">
                ⚡ Test & Send Sample Email
              </button>
              <button type="submit" class="btn primary">
                Save SMTP Settings
              </button>
            </div>
          </form>
        </div>

        <!-- Real Estate Brand Identity Panel -->
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Real Estate Brand Identity</h3>
            <p style="margin:2px 0 0; font-size:12px; color:var(--muted);">Displayed across digital invites and visit passes.</p>
          </div>
          <form onsubmit="App.handleSaveBrandSettings(event)" style="padding:24px;">
            <div style="margin-bottom:16px;">
              <label>Agency / Real Estate Firm Name *</label>
              <input id="setAgencyName" required value="${Utils.escapeHTML(s.agency_name || 'Workians Realty')}">
            </div>

            <div style="margin-bottom:16px;">
              <label>Subtitle / Tagline</label>
              <input id="setAgencySubtitle" value="${Utils.escapeHTML(s.agency_subtitle || 'Sales Operations & Site Visit Management')}">
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

App.togglePasswordVisibility = function(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) {
    el.type = el.type === 'password' ? 'text' : 'password';
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
    Utils.toast(res.message || 'Brand settings updated!');
  } catch (err) {
    Utils.toast('Error saving branding: ' + err.message);
  }
};

App.handleSaveSmtpSettings = async function(e) {
  e.preventDefault();
  const payload = {
    host: document.getElementById('smtpHost').value.trim(),
    port: parseInt(document.getElementById('smtpPort').value.trim(), 10) || 587,
    username: document.getElementById('smtpUsername').value.trim(),
    password: document.getElementById('smtpPassword').value.trim(),
    from_name: document.getElementById('smtpFromName').value.trim(),
    from_email: document.getElementById('smtpFromEmail').value.trim(),
    public_url: document.getElementById('smtpPublicUrl').value.trim()
  };

  try {
    const res = await API.put('/settings/smtp', payload);
    Utils.toast(res.message || 'SMTP settings saved successfully!');
    App.renderSettings(document.getElementById('mainContent'));
  } catch (err) {
    Utils.toast('Error saving SMTP settings: ' + err.message);
  }
};

// Modal to test SMTP and send test email
App.openTestSmtpModal = function() {
  const defaultEmail = (App.currentUser && App.currentUser.email) || '';
  const html = `
    <div style="padding: 24px; max-width: 480px;">
      <h3 style="margin: 0 0 8px; font-size: 18px; color: var(--navy); display:flex; align-items:center; gap:8px;">
        <span>⚡ Test SMTP Email Connection</span>
      </h3>
      <p style="font-size: 13px; color: var(--muted); margin: 0 0 20px;">
        We'll verify connection to your mail server and dispatch a test email to ensure team credentials can be delivered.
      </p>

      <form onsubmit="App.handleTestSmtpSubmit(event)">
        <div style="margin-bottom: 16px;">
          <label>Recipient Test Email Address *</label>
          <input type="email" id="testEmailInput" required value="${Utils.escapeHTML(defaultEmail)}" placeholder="you@workians.com">
        </div>

        <div id="smtpTestStatus" style="display:none; margin-bottom:16px; padding:12px; border-radius:6px; font-size:13px;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
          <button type="button" class="btn soft" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" id="btnRunSmtpTest" class="btn primary">
            Send Test Email
          </button>
        </div>
      </form>
    </div>
  `;

  Utils.modal(html);
};

App.handleTestSmtpSubmit = async function(e) {
  e.preventDefault();
  const testEmail = document.getElementById('testEmailInput').value.trim();
  const statusBox = document.getElementById('smtpTestStatus');
  const btn = document.getElementById('btnRunSmtpTest');

  statusBox.style.display = 'block';
  statusBox.style.background = '#eff6ff';
  statusBox.style.color = '#1e40af';
  statusBox.style.border = '1px solid #bfdbfe';
  statusBox.innerHTML = `⏳ Testing SMTP connection and sending test email... Please wait.`;
  btn.disabled = true;

  try {
    const res = await API.post('/settings/smtp/test', { test_email: testEmail });
    statusBox.style.background = '#ecfdf5';
    statusBox.style.color = '#065f46';
    statusBox.style.border = '1px solid #a7f3d0';
    statusBox.innerHTML = `✓ <strong>Success!</strong> ${Utils.escapeHTML(res.message)}`;
    Utils.toast('Test email sent successfully!');
  } catch (err) {
    statusBox.style.background = '#fef2f2';
    statusBox.style.color = '#991b1b';
    statusBox.style.border = '1px solid #fecaca';
    statusBox.innerHTML = `✗ <strong>Connection Failed:</strong><br>${Utils.escapeHTML(err.message)}`;
  } finally {
    btn.disabled = false;
  }
};
