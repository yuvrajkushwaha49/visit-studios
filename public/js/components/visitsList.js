// Site Visits Management & Attendance Component
App.renderVisitsList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading site visits...</div>`;

  try {
    const range = this.currentVisitRange || '';
    const data = await API.get('/visits', { range });
    const visits = data.visits || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">ATTENDANCE & EXPERIENCES</div>
          <h1 class="page-title">Site Visit Management</h1>
          <p class="page-desc">Real-time attendance recording, contactless QR check-in, and customer walkthroughs.</p>
        </div>
        <div class="actions">
          <button class="btn gold" onclick="App.openCreateVisitModal()">
            + Schedule Site Visit
          </button>
          <button class="btn primary" onclick="App.openCheckInModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4v1m6 11h1M4 12h1m14 0h1m-7 7v1M6.34 6.34l.7.7m10.92 10.92l.7.7M6.34 17.66l.7-.7m10.92-10.92l.7-.7"/></svg>
            Scan / Verify QR Check-in
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <input class="filter-input filter-search" id="visitSearch" placeholder="Search customer, project or advisor..." oninput="App.filterVisitsTable()">
        <select class="filter-input" id="visitRangeFilter" onchange="App.onVisitRangeChange(this.value)">
          <option value="" ${!range ? 'selected' : ''}>All Dates</option>
          <option value="today" ${range === 'today' ? 'selected' : ''}>Today's Visits</option>
          <option value="tomorrow" ${range === 'tomorrow' ? 'selected' : ''}>Tomorrow's Visits</option>
          <option value="week" ${range === 'week' ? 'selected' : ''}>This Week</option>
          <option value="month" ${range === 'month' ? 'selected' : ''}>This Month</option>
        </select>
        <select class="filter-input" id="visitStatusFilter" onchange="App.filterVisitsTable()">
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="completed">Completed</option>
          <option value="no_show">No Show</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="visitsTable">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Project</th>
                <th>Scheduled Time</th>
                <th>Advisor / Host</th>
                <th>Status</th>
                <th>Check-in Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${visits.length ? visits.map(v => `
                <tr data-search="${Utils.escapeHTML((v.customer_name + ' ' + v.project_name + ' ' + v.associate_name).toLowerCase())}" data-status="${v.status}">
                  <td>
                    <strong>${Utils.escapeHTML(v.customer_name)}</strong>
                    <small>${Utils.escapeHTML(v.customer_phone)}</small>
                  </td>
                  <td>
                    ${Utils.escapeHTML(v.project_name)}
                    <small>${Utils.escapeHTML(v.developer_name || '')}</small>
                  </td>
                  <td>
                    <strong>${Utils.formatDate(v.scheduled_date)}</strong>
                    <small>${Utils.formatTime(v.scheduled_time)} · ${v.duration || 60}m</small>
                  </td>
                  <td>
                    ${Utils.escapeHTML(v.associate_name)}
                  </td>
                  <td>
                    <span class="badge ${v.status}">${v.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    ${v.check_in_time ? `
                      <span style="color:var(--green); font-weight:600;">
                        ✓ ${v.check_in_method?.toUpperCase() || 'CHECKED IN'}
                      </span>
                      <small>${v.check_in_time.slice(11, 16)} by ${Utils.escapeHTML(v.staff_name || 'Staff')}</small>
                    ` : `
                      <span style="color:var(--muted); font-size:11px;">Pending arrival</span>
                    `}
                  </td>
                  <td>
                    <div class="actions">
                      ${v.status !== 'completed' && v.status !== 'checked_in' ? `
                        <button class="btn small primary" onclick="App.openCheckInModal('${v.id}')">
                          Check-in
                        </button>
                      ` : ''}

                      ${v.status === 'checked_in' ? `
                        <button class="btn small soft" onclick="App.openCheckOutModal('${v.id}', '${Utils.escapeHTML(v.customer_name)}')">
                          Conclude Visit
                        </button>
                      ` : ''}

                      ${v.status === 'completed' ? `
                        <span class="badge completed">Completed</span>
                      ` : ''}

                      <button class="btn small" onclick="App.openVisitNotesModal('${v.id}', '${v.status}')">
                        Notes
                      </button>
                      <button class="btn small soft" onclick="App.openEditVisitModal('${v.id}')">
                        Edit
                      </button>
                      <button class="btn small danger" onclick="App.deleteVisit('${v.id}')">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
                    No site visits recorded for the selected filter.
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

App.onVisitRangeChange = function(range) {
  this.currentVisitRange = range;
  this.renderVisitsList(document.getElementById('pageContent'));
};

App.filterVisitsTable = Utils.debounce(function() {
  const query = (document.getElementById('visitSearch')?.value || '').toLowerCase();
  const status = document.getElementById('visitStatusFilter')?.value || '';
  const rows = document.querySelectorAll('#visitsTable tbody tr');

  rows.forEach(r => {
    const s = r.getAttribute('data-search') || '';
    const st = r.getAttribute('data-status') || '';
    const matchesQuery = !query || s.includes(query);
    const matchesStatus = !status || st === status;
    r.style.display = matchesQuery && matchesStatus ? '' : 'none';
  });
}, 100);

// Check-in Modal: Supports scanning QR or entering token / direct check-in
App.openCheckInModal = function(visitId = null) {
  const html = `
    <div style="text-align:center; margin-bottom: 20px;">
      <div class="eyebrow">RECEPTION CHECK-IN</div>
      <h2 class="modal-title">Verify Customer Arrival</h2>
      <p class="modal-desc">Scan the customer's invitation QR pass or enter their secure visit token.</p>
    </div>

    <form onsubmit="App.handleCheckInSubmit(event, '${visitId || ''}')">
      <div style="margin-bottom: 16px;">
        <label>Invitation Token or Scanned QR Payload</label>
        <input id="checkInTokenInput" placeholder="Paste or scan token (e.g. inv_...)">
        <small style="color:var(--muted); font-size:10.5px; display:block; margin-top:4px;">
          Works automatically with optical handheld barcode / QR scanners or manual entry.
        </small>
      </div>

      <div style="margin-bottom: 16px;">
        <label>Staff Reception Notes</label>
        <textarea id="checkInNotes" placeholder="Customer escorted to Conference Suite / Sample Flat..."></textarea>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">
          Confirm Check-in Attendance ✓
        </button>
      </div>
    </form>
  `;
  Utils.showModal(html);
  setTimeout(() => document.getElementById('checkInTokenInput')?.focus(), 150);
};

App.handleCheckInSubmit = async function(e, directVisitId) {
  e.preventDefault();
  const rawInput = document.getElementById('checkInTokenInput')?.value.trim();
  const notes = document.getElementById('checkInNotes')?.value.trim();

  let token = rawInput;
  // If the scanned data is JSON from the QR code, extract token
  try {
    if (rawInput.startsWith('{')) {
      const parsed = JSON.parse(rawInput);
      if (parsed.token) token = parsed.token;
    }
  } catch {}

  const payload = {
    token: token || undefined,
    visit_id: directVisitId || undefined,
    check_in_method: token ? 'qr' : 'manual',
    staff_notes: notes
  };

  try {
    const res = await API.post('/visits/check-in', payload);
    Utils.toast(`Check-in verified! ${res.message}`);
    Utils.closeModal();
    App.navigate('visits');
  } catch (err) {
    Utils.toast('Check-in failed: ' + err.message);
  }
};

// Check-out Modal: Concludes visit, records discussion outcome, triggers feedback
App.openCheckOutModal = function(visitId, customerName) {
  const html = `
    <h3 class="modal-title">Conclude Site Visit</h3>
    <p class="modal-desc">Recording check-out for ${Utils.escapeHTML(customerName)}. This will automatically trigger a WhatsApp feedback request.</p>

    <form onsubmit="App.handleCheckOutSubmit(event, '${visitId}')">
      <div style="margin-bottom: 14px;">
        <label>Visit Walkthrough Notes</label>
        <textarea id="checkOutNotes" required placeholder="Customer interest level, feedback on layout, next agreed steps..."></textarea>
      </div>

      <div style="margin-bottom: 16px; display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="checkOutProceedBooking" style="width:auto; min-height:auto;">
        <label for="checkOutProceedBooking" style="margin-bottom:0; cursor:pointer;">
          Customer is proceeding towards expression of interest / booking token
        </label>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Mark Completed & Send Feedback</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleCheckOutSubmit = async function(e, visitId) {
  e.preventDefault();
  const staff_notes = document.getElementById('checkOutNotes').value.trim();
  const proceed_to_booking = document.getElementById('checkOutProceedBooking').checked;

  try {
    await API.post(`/visits/${visitId}/check-out`, { staff_notes, proceed_to_booking });
    Utils.toast('Visit marked completed! Feedback request sent.');
    Utils.closeModal();
    App.navigate('visits');
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.openVisitNotesModal = function(visitId, currentStatus) {
  const html = `
    <h3 class="modal-title">Update Visit Status & Notes</h3>
    <form onsubmit="App.handleUpdateVisitStatus(event, '${visitId}')">
      <div style="margin-bottom:14px;">
        <label>Visit Status</label>
        <select id="updateVisitStatusSelect">
          <option value="upcoming" ${currentStatus === 'upcoming' ? 'selected' : ''}>Upcoming</option>
          <option value="confirmed" ${currentStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="no_show" ${currentStatus === 'no_show' ? 'selected' : ''}>No Show</option>
          <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div style="margin-bottom:18px;">
        <label>Staff Notes</label>
        <textarea id="updateVisitNotes" placeholder="Add visit remarks..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Changes</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleUpdateVisitStatus = async function(e, visitId) {
  e.preventDefault();
  const status = document.getElementById('updateVisitStatusSelect').value;
  const staff_notes = document.getElementById('updateVisitNotes').value.trim();

  try {
    await API.patch(`/visits/${visitId}/status`, { status, staff_notes: staff_notes || undefined });
    Utils.toast('Visit updated successfully');
    Utils.closeModal();
    App.renderVisitsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Create Site Visit Modal (Direct visit creation)
App.openCreateVisitModal = async function() {
  Utils.showModal('<div style="text-align:center; padding:30px; color:var(--muted);">Loading details...</div>');
  try {
    const [custRes, projRes, teamRes] = await Promise.all([
      API.get('/customers'),
      API.get('/projects'),
      API.get('/users/team')
    ]);

    const customers = custRes.customers || [];
    const projects = projRes.projects || [];
    const associates = teamRes.associates || [];

    const today = new Date().toISOString().slice(0, 10);

    const html = `
      <h3 class="modal-title">Schedule Direct Site Visit</h3>
      <p class="modal-desc">Record a client property appointment directly into the attendance pipeline.</p>
      <form onsubmit="App.handleCreateVisitSubmit(event)">
        <div style="margin-bottom:12px;">
          <label>Select Customer *</label>
          <select id="createVisitCustomer" required>
            <option value="">-- Choose Customer --</option>
            ${customers.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.full_name)} (${c.mobile_number})</option>`).join('')}
          </select>
        </div>

        <div style="margin-bottom:12px;">
          <label>Select Project / Residence *</label>
          <select id="createVisitProject" required>
            <option value="">-- Choose Project --</option>
            ${projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)} - ${Utils.escapeHTML(p.location)}</option>`).join('')}
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Scheduled Date *</label>
            <input type="date" id="createVisitDate" required value="${today}">
          </div>
          <div>
            <label>Scheduled Time *</label>
            <input type="time" id="createVisitTime" required value="11:00">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Duration (mins)</label>
            <input type="number" id="createVisitDuration" value="60" min="15" step="15">
          </div>
          <div>
            <label>Assigned Property Host / Advisor</label>
            <select id="createVisitAssociate">
              ${associates.map(a => `<option value="${a.id}">${Utils.escapeHTML(a.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label>Staff Appointment Remarks</label>
          <textarea id="createVisitNotes" placeholder="Client walkthrough preferences, special hospitality instructions..."></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Schedule Visit</button>
        </div>
      </form>
    `;
    Utils.showModal(html);
  } catch (err) {
    Utils.showModal(`<div style="padding:20px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`);
  }
};

App.handleCreateVisitSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    customer_id: document.getElementById('createVisitCustomer').value,
    project_id: document.getElementById('createVisitProject').value,
    scheduled_date: document.getElementById('createVisitDate').value,
    scheduled_time: document.getElementById('createVisitTime').value,
    duration: parseInt(document.getElementById('createVisitDuration').value) || 60,
    associate_id: document.getElementById('createVisitAssociate').value || undefined,
    staff_notes: document.getElementById('createVisitNotes').value.trim()
  };

  try {
    await API.post('/visits', payload);
    Utils.toast('Site visit scheduled successfully!');
    Utils.closeModal();
    App.renderVisitsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Edit Visit Modal
App.openEditVisitModal = async function(visitId) {
  Utils.showModal('<div style="text-align:center; padding:30px; color:var(--muted);">Loading visit...</div>');
  try {
    const data = await API.get(`/visits/${visitId}`);
    const v = data.visit;

    const html = `
      <h3 class="modal-title">Edit Site Visit Appointment</h3>
      <p class="modal-desc">Modifying visit for ${Utils.escapeHTML(v.customer_name)} at ${Utils.escapeHTML(v.project_name)}.</p>
      <form onsubmit="App.handleEditVisitSubmit(event, '${visitId}')">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Scheduled Date *</label>
            <input type="date" id="editVisitDate" required value="${v.scheduled_date}">
          </div>
          <div>
            <label>Scheduled Time *</label>
            <input type="time" id="editVisitTime" required value="${v.scheduled_time}">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label>Duration (mins)</label>
            <input type="number" id="editVisitDuration" value="${v.duration || 60}" min="15" step="15">
          </div>
          <div>
            <label>Visit Status</label>
            <select id="editVisitStatus">
              <option value="upcoming" ${v.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
              <option value="confirmed" ${v.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="checked_in" ${v.status === 'checked_in' ? 'selected' : ''}>Checked In</option>
              <option value="completed" ${v.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="no_show" ${v.status === 'no_show' ? 'selected' : ''}>No Show</option>
              <option value="cancelled" ${v.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label>Staff Walkthrough Remarks</label>
          <textarea id="editVisitNotes" placeholder="Remarks or follow-up actions...">${Utils.escapeHTML(v.staff_notes || '')}</textarea>
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

App.handleEditVisitSubmit = async function(e, visitId) {
  e.preventDefault();
  const payload = {
    scheduled_date: document.getElementById('editVisitDate').value,
    scheduled_time: document.getElementById('editVisitTime').value,
    duration: parseInt(document.getElementById('editVisitDuration').value) || 60,
    status: document.getElementById('editVisitStatus').value,
    staff_notes: document.getElementById('editVisitNotes').value.trim()
  };

  try {
    await API.put(`/visits/${visitId}`, payload);
    Utils.toast('Visit updated successfully!');
    Utils.closeModal();
    App.renderVisitsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteVisit = async function(visitId) {
  if (!confirm('Are you sure you want to delete this site visit record? This action cannot be undone.')) return;
  try {
    await API.delete(`/visits/${visitId}`);
    Utils.toast('Site visit deleted successfully');
    App.renderVisitsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
