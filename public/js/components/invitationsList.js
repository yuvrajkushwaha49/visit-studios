// Invitations List Component
App.renderInvitationsList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading invitations...</div>`;

  try {
    const data = await API.get('/invitations');
    const list = data.invitations || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">GUEST LIST & INVITATIONS</div>
          <h1 class="page-title">Digital Invitations</h1>
          <p class="page-desc">Track active invitation links, customer openings, and visit confirmations.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.navigate('create_invitation')">
            + New Invitation
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input class="filter-input filter-search" id="invSearch" placeholder="Search customer, project or advisor..." oninput="App.filterInvitationsTable()">
        <select class="filter-input" id="invStatusFilter" onchange="App.filterInvitationsTable()">
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="confirmed">Confirmed</option>
          <option value="reschedule_requested">Reschedule Requested</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="invitationsTable">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Residence</th>
                <th>Schedule</th>
                <th>Advisor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.length ? list.map(inv => `
                <tr data-search="${Utils.escapeHTML((inv.customer_name + ' ' + inv.project_name + ' ' + inv.associate_name).toLowerCase())}" data-status="${inv.status}">
                  <td>
                    <strong>${Utils.escapeHTML(inv.customer_name)}</strong>
                    <small>${Utils.escapeHTML(inv.customer_phone || '')}</small>
                  </td>
                  <td>
                    ${Utils.escapeHTML(inv.project_name)}
                    <small>${Utils.escapeHTML(inv.developer_name || '')}</small>
                  </td>
                  <td>
                    <strong>${Utils.formatDate(inv.visit_date)}</strong>
                    <small>${Utils.formatTime(inv.visit_time)}</small>
                  </td>
                  <td>${Utils.escapeHTML(inv.associate_name)}</td>
                  <td>
                    <span class="badge ${inv.status}">${inv.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn small gold" onclick="App.openShareModalForId('${inv.id}')" title="Share with generated Pass Card & Short Link">
                        Share Pass ↗
                      </button>
                      <a href="#invite=${inv.token}" target="_blank" class="btn small soft" title="Open customer page">
                        View ↗
                      </a>
                      <button class="btn small" onclick="App.copyInviteLink('${inv.token}', '${inv.short_code || ''}')" title="Copy short link">
                        Copy Link
                      </button>
                      <button class="btn small" onclick="App.openRescheduleModal('${inv.id}', '${inv.visit_date}', '${inv.visit_time}')">
                        Reschedule
                      </button>
                      <button class="btn small soft" onclick="App.openEditInvitationModal('${inv.id}')" title="Edit invitation">
                        Edit
                      </button>
                      <button class="btn small danger" onclick="App.revokeInvitation('${inv.id}')" title="Revoke link">
                        Revoke
                      </button>
                      <button class="btn small danger" onclick="App.deleteInvitation('${inv.id}')" title="Delete record">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="text-align:center; padding:40px; color:var(--muted);">
                    No invitations found. Click "New Invitation" to create one.
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

App.filterInvitationsTable = Utils.debounce(function() {
  const query = (document.getElementById('invSearch')?.value || '').toLowerCase();
  const status = document.getElementById('invStatusFilter')?.value || '';
  const rows = document.querySelectorAll('#invitationsTable tbody tr');

  rows.forEach(r => {
    const s = r.getAttribute('data-search') || '';
    const st = r.getAttribute('data-status') || '';
    const matchesQuery = !query || s.includes(query);
    const matchesStatus = !status || st === status;
    r.style.display = matchesQuery && matchesStatus ? '' : 'none';
  });
}, 100);

App.copyInviteLink = function(token, shortCode) {
  const url = shortCode ? `${window.location.origin}/i/${shortCode}` : `${window.location.origin}/#invite=${token}`;
  navigator.clipboard.writeText(url).then(() => {
    Utils.toast('Short invitation link copied to clipboard!');
  }).catch(() => {
    prompt('Copy invitation link:', url);
  });
};

App.openShareModalForId = async function(id) {
  try {
    Utils.toast('Preparing VIP pass card & short link...');
    const res = await API.get(`/invitations/${id}`);
    const inv = res.invitation;
    if (inv) {
      App.showShareModal(inv, inv.customer_name, inv.customer_phone);
    }
  } catch (err) {
    Utils.toast('Error opening pass: ' + err.message);
  }
};

App.revokeInvitation = async function(id) {
  if (!confirm('Are you sure you want to revoke this invitation link? The customer will no longer be able to open it.')) return;
  try {
    await API.delete(`/invitations/${id}`);
    Utils.toast('Invitation revoked successfully');
    App.renderInvitationsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openRescheduleModal = function(id, currentDate, currentTime) {
  const html = `
    <h3 class="modal-title">Reschedule Site Visit</h3>
    <p class="modal-desc">Enter the new visit date and time. An automated notification will be sent to the customer.</p>

    <form onsubmit="App.handleRescheduleSubmit(event, '${id}')">
      <div style="margin-bottom:14px;">
        <label>New Visit Date *</label>
        <input type="date" id="reschedDate" required value="${currentDate}">
      </div>
      <div style="margin-bottom:14px;">
        <label>New Visit Time *</label>
        <input type="time" id="reschedTime" required value="${currentTime}">
      </div>
      <div style="margin-bottom:18px;">
        <label>Reason / Notes</label>
        <textarea id="reschedNotes" placeholder="Reason for rescheduling..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Confirm Reschedule</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleRescheduleSubmit = async function(e, id) {
  e.preventDefault();
  const visit_date = document.getElementById('reschedDate').value;
  const visit_time = document.getElementById('reschedTime').value;
  const notes = document.getElementById('reschedNotes').value.trim();

  try {
    await API.patch(`/invitations/${id}/reschedule`, { visit_date, visit_time, notes });
    Utils.toast('Visit rescheduled and customer notified!');
    Utils.closeModal();
    App.navigate('invitations');
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openEditInvitationModal = async function(invId) {
  Utils.showModal('<div style="text-align:center; padding:30px; color:var(--muted);">Loading invitation...</div>');
  try {
    const data = await API.get(`/invitations/${invId}`);
    const inv = data.invitation;

    const html = `
      <h3 class="modal-title">Edit Digital Invitation</h3>
      <p class="modal-desc">Modifying invitation for ${Utils.escapeHTML(inv.customer_name)} - ${Utils.escapeHTML(inv.project_name)}.</p>
      <form onsubmit="App.handleEditInvitationSubmit(event, '${invId}')">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Visit Date *</label>
            <input type="date" id="editInvDate" required value="${inv.visit_date}">
          </div>
          <div>
            <label>Visit Time *</label>
            <input type="time" id="editInvTime" required value="${inv.visit_time}">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Discussed Price / Quotation</label>
            <input id="editInvPrice" value="${Utils.escapeHTML(inv.price || '')}" placeholder="e.g. ₹2.40 Cr">
          </div>
          <div>
            <label>Residence Size / Config</label>
            <input id="editInvSize" value="${Utils.escapeHTML(inv.size || '')}" placeholder="e.g. 3 BHK (1,850 sq.ft)">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Duration (mins)</label>
            <input type="number" id="editInvDuration" value="${inv.duration || 60}" min="15" step="15">
          </div>
          <div>
            <label>Invitation Status</label>
            <select id="editInvStatus">
              <option value="sent" ${inv.status === 'sent' ? 'selected' : ''}>Sent</option>
              <option value="opened" ${inv.status === 'opened' ? 'selected' : ''}>Opened</option>
              <option value="confirmed" ${inv.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="reschedule_requested" ${inv.status === 'reschedule_requested' ? 'selected' : ''}>Reschedule Requested</option>
              <option value="cancelled" ${inv.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label>Visit Experience / Meeting Location</label>
          <input id="editInvLocation" value="${Utils.escapeHTML(inv.location || '')}">
        </div>

        <div style="margin-bottom:16px;">
          <label>Invitation Notes</label>
          <textarea id="editInvNotes" placeholder="Special arrangements or notes...">${Utils.escapeHTML(inv.notes || '')}</textarea>
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

App.handleEditInvitationSubmit = async function(e, invId) {
  e.preventDefault();
  const payload = {
    visit_date: document.getElementById('editInvDate').value,
    visit_time: document.getElementById('editInvTime').value,
    price: document.getElementById('editInvPrice').value.trim(),
    size: document.getElementById('editInvSize').value.trim(),
    duration: parseInt(document.getElementById('editInvDuration').value) || 60,
    status: document.getElementById('editInvStatus').value,
    location: document.getElementById('editInvLocation').value.trim(),
    notes: document.getElementById('editInvNotes').value.trim()
  };

  try {
    await API.put(`/invitations/${invId}`, payload);
    Utils.toast('Invitation updated successfully!');
    Utils.closeModal();
    App.renderInvitationsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteInvitation = async function(invId) {
  if (!confirm('Are you sure you want to permanently delete this invitation and linked visit?')) return;
  try {
    await API.delete(`/invitations/${invId}?permanent=true`);
    Utils.toast('Invitation permanently deleted');
    App.renderInvitationsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
