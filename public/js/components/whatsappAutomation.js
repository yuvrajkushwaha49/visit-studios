// Direct WhatsApp Automation & Notification Messaging Component
App.renderWhatsAppAutomation = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading WhatsApp messages and templates...</div>`;

  try {
    const [tplRes, logsRes] = await Promise.all([
      API.get('/whatsapp/templates'),
      API.get('/whatsapp/logs')
    ]);

    const templates = tplRes.templates || [];
    const logs = logsRes.logs || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">DIRECT WHATSAPP MESSAGING</div>
          <h1 class="page-title">WhatsApp Notification Center</h1>
          <p class="page-desc">Instant 1-click WhatsApp messaging and templates (no complex Meta Cloud API or Facebook approval required).</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openCreateTemplateModal()">
            + Add Template
          </button>
          <button class="btn gold" onclick="App.openDirectWhatsAppModal()">
            + Quick WhatsApp Chat
          </button>
        </div>
      </div>

      <!-- Templates Catalog -->
      <h3 style="font-size:15px; font-weight:600; margin-bottom:14px;">Pre-Approved Client Message Templates (${templates.length})</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:32px;">
        ${templates.map(t => `
          <div class="panel" style="padding:18px; margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <code style="font-weight:700; color:var(--purple);">${Utils.escapeHTML(t.template_name)}</code>
                <span class="badge active">${t.category}</span>
              </div>
              <div style="font-size:11.5px; color:#4a4658; line-height:1.5; background:var(--pale); padding:10px; border-radius:6px; margin-top:8px;">
                ${Utils.escapeHTML(t.body_text)}
              </div>
            </div>
            <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
              <button class="btn small soft" onclick="App.copyTemplateText('${Utils.escapeHTML(t.body_text).replace(/'/g, "\\'")}')">
                Copy
              </button>
              <div class="actions">
                <button class="btn small" onclick="App.openEditTemplateModal('${t.id}', '${Utils.escapeHTML(t.template_name)}', '${t.category}', '${Utils.escapeHTML(t.body_text).replace(/'/g, "\\'")}')">
                  Edit
                </button>
                <button class="btn small danger" onclick="App.deleteTemplate('${t.id}')">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Real-Time Delivery Logs Table with 1-Click WhatsApp Open -->
      <div class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Recent WhatsApp Notification Logs (${logs.length})</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client Phone</th>
                <th>Notification Type</th>
                <th>Message Snippet</th>
                <th>Logged At</th>
                <th>1-Click Action</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length ? logs.map(l => {
                const cleanPhone = (l.recipient_phone || '').replace(/[^\d]/g, '');
                const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
                const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(l.message_body)}`;

                return `
                  <tr>
                    <td>
                      <strong>${Utils.escapeHTML(l.recipient_phone)}</strong>
                    </td>
                    <td>
                      <code style="color:var(--purple);">${Utils.escapeHTML(l.template_name || 'custom')}</code>
                    </td>
                    <td style="max-width:340px;">
                      <div style="font-size:11.5px; line-height:1.4; color:var(--ink);">${Utils.escapeHTML(l.message_body)}</div>
                    </td>
                    <td>
                      <small>${Utils.formatDate(l.sent_at)} ${l.sent_at?.slice(11, 16) || ''}</small>
                    </td>
                    <td>
                      <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn small gold" style="white-space:nowrap;">
                        Open in WhatsApp ↗
                      </a>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">No messages logged yet.</td></tr>
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

App.copyTemplateText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    Utils.toast('Template message text copied to clipboard!');
  }).catch(() => {
    prompt('Copy template text:', text);
  });
};

App.openDirectWhatsAppModal = function() {
  const html = `
    <h3 class="modal-title">Direct WhatsApp Message</h3>
    <p class="modal-desc">Opens directly in WhatsApp web/desktop/mobile without requiring any Meta API accounts.</p>

    <form onsubmit="App.handleDirectWhatsAppSubmit(event)">
      <div style="margin-bottom:14px;">
        <label>Customer Mobile / WhatsApp Number *</label>
        <input id="directWAPhone" required placeholder="e.g. 98100 12345" type="tel">
      </div>
      <div style="margin-bottom:16px;">
        <label>Message Content *</label>
        <textarea id="directWAMsg" required placeholder="Dear Client, your site visit invitation details..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn gold">Open in WhatsApp ↗</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleDirectWhatsAppSubmit = function(e) {
  e.preventDefault();
  const phone = document.getElementById('directWAPhone').value.trim().replace(/[^\d]/g, '');
  const msg = document.getElementById('directWAMsg').value.trim();
  const waPhone = phone.length === 10 ? '91' + phone : phone;

  // Log in server
  API.post('/whatsapp/test-send', {
    recipient_phone: waPhone,
    custom_text: msg
  }).catch(err => console.error(err));

  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
  Utils.closeModal();
  Utils.toast('Opening WhatsApp...');
  App.renderWhatsAppAutomation(document.getElementById('pageContent'));
};

App.openCreateTemplateModal = function() {
  const html = `
    <h3 class="modal-title">Create WhatsApp Notification Template</h3>
    <p class="modal-desc">Define a reusable message template for customer updates and invitations.</p>
    <form onsubmit="App.handleCreateTemplateSubmit(event)">
      <div style="margin-bottom:12px;">
        <label>Template Identifier / Name *</label>
        <input id="createTplName" required placeholder="e.g. visit_reminder_v2">
      </div>
      <div style="margin-bottom:12px;">
        <label>Category</label>
        <select id="createTplCategory">
          <option value="UTILITY">UTILITY</option>
          <option value="MARKETING">MARKETING</option>
          <option value="AUTHENTICATION">AUTHENTICATION</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label>Template Message Text *</label>
        <textarea id="createTplBody" required placeholder="Dear {{customer_name}}, your site visit for {{project_name}} is confirmed..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Template</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleCreateTemplateSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    template_name: document.getElementById('createTplName').value.trim(),
    category: document.getElementById('createTplCategory').value,
    body_text: document.getElementById('createTplBody').value.trim()
  };

  try {
    await API.post('/whatsapp/templates', payload);
    Utils.toast('Template created successfully!');
    Utils.closeModal();
    App.renderWhatsAppAutomation(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openEditTemplateModal = function(id, name, cat, body) {
  const html = `
    <h3 class="modal-title">Edit Message Template</h3>
    <form onsubmit="App.handleEditTemplateSubmit(event, '${id}')">
      <div style="margin-bottom:12px;">
        <label>Template Identifier / Name *</label>
        <input id="editTplName" required value="${name}">
      </div>
      <div style="margin-bottom:12px;">
        <label>Category</label>
        <select id="editTplCategory">
          <option value="UTILITY" ${cat === 'UTILITY' ? 'selected' : ''}>UTILITY</option>
          <option value="MARKETING" ${cat === 'MARKETING' ? 'selected' : ''}>MARKETING</option>
          <option value="AUTHENTICATION" ${cat === 'AUTHENTICATION' ? 'selected' : ''}>AUTHENTICATION</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label>Template Message Text *</label>
        <textarea id="editTplBody" required>${body}</textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Changes</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleEditTemplateSubmit = async function(e, id) {
  e.preventDefault();
  const payload = {
    template_name: document.getElementById('editTplName').value.trim(),
    category: document.getElementById('editTplCategory').value,
    body_text: document.getElementById('editTplBody').value.trim()
  };

  try {
    await API.put(`/whatsapp/templates/${id}`, payload);
    Utils.toast('Template updated successfully!');
    Utils.closeModal();
    App.renderWhatsAppAutomation(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteTemplate = async function(id) {
  if (!confirm('Are you sure you want to delete this template?')) return;
  try {
    await API.delete(`/whatsapp/templates/${id}`);
    Utils.toast('Template deleted successfully');
    App.renderWhatsAppAutomation(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
