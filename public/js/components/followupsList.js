// Follow-ups Management Component with Full CRUD
App.renderFollowupsList = async function(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">Loading follow-up pipeline...</div>`;

  try {
    const data = await API.get('/followups');
    const followups = data.followups || [];

    this.cache.followups = followups;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">PIPELINE CADENCE</div>
          <h1 class="page-title">Follow-up Management</h1>
          <p class="page-desc">Stay on top of upcoming buyer checkpoints, call schedules, and post-visit discussions.</p>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="App.openAddFollowupModal()">
            + Schedule Follow-up
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input class="filter-input filter-search" id="folSearch" placeholder="Search customer or notes..." oninput="App.filterFollowupsTable()">
        <select class="filter-input" id="folStatusFilter" onchange="App.filterFollowupsTable()">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue Alerts</option>
          <option value="completed">Completed</option>
        </select>
        <select class="filter-input" id="folPriorityFilter" onchange="App.filterFollowupsTable()">
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div class="panel">
        <div class="table-wrap">
          <table id="followupsTable">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Due Date & Time</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Discussion Note</th>
                <th>Assigned Advisor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${followups.length ? followups.map(f => `
                <tr data-search="${Utils.escapeHTML((f.customer_name + ' ' + f.notes + ' ' + f.associate_name).toLowerCase())}" data-status="${f.calculated_status}" data-priority="${f.priority}">
                  <td>
                    <strong>${Utils.escapeHTML(f.customer_name)}</strong>
                    <small>${Utils.escapeHTML(f.customer_phone)}</small>
                  </td>
                  <td>
                    <strong>${Utils.formatDate(f.follow_up_date)}</strong>
                    <small>${f.follow_up_time || '11:00 AM'}</small>
                  </td>
                  <td>
                    <span style="font-weight:600; text-transform:uppercase; font-size:11px; color:var(--purple);">
                      ${f.follow_up_type}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${f.priority === 'urgent' ? 'cancelled' : (f.priority === 'high' ? 'pending' : 'active')}">
                      ${f.priority}
                    </span>
                  </td>
                  <td style="max-width:260px;">
                    <div style="font-size:12px; line-height:1.4;">${Utils.escapeHTML(f.notes)}</div>
                  </td>
                  <td>${Utils.escapeHTML(f.associate_name)}</td>
                  <td>
                    <span class="badge ${f.calculated_status === 'overdue' ? 'cancelled' : (f.calculated_status === 'completed' ? 'confirmed' : 'pending')}">
                      ${f.calculated_status}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      ${f.status !== 'completed' ? `
                        <button class="btn small primary" onclick="App.openCompleteFollowupModal('${f.id}')">
                          Done ✓
                        </button>
                      ` : `
                        <span style="color:var(--green); font-size:11px; font-weight:600;">Completed</span>
                      `}
                      <button class="btn small soft" onclick="App.openEditFollowupModal('${f.id}')">
                        Edit
                      </button>
                      <button class="btn small danger" onclick="App.deleteFollowup('${f.id}')">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="8" style="text-align:center; padding:40px; color:var(--muted);">
                    No follow-ups in the pipeline. Click "Schedule Follow-up" to set a reminder.
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

App.filterFollowupsTable = Utils.debounce(function() {
  const query = (document.getElementById('folSearch')?.value || '').toLowerCase();
  const status = document.getElementById('folStatusFilter')?.value || '';
  const priority = document.getElementById('folPriorityFilter')?.value || '';
  const rows = document.querySelectorAll('#followupsTable tbody tr');

  rows.forEach(r => {
    const s = r.getAttribute('data-search') || '';
    const st = r.getAttribute('data-status') || '';
    const pr = r.getAttribute('data-priority') || '';
    const matchesQuery = !query || s.includes(query);
    const matchesStatus = !status || st === status;
    const matchesPriority = !priority || pr === priority;
    r.style.display = matchesQuery && matchesStatus && matchesPriority ? '' : 'none';
  });
}, 100);

// Add Follow-up Modal
App.openAddFollowupModal = async function() {
  const custRes = await API.get('/customers');
  const customers = custRes.customers || [];
  const todayStr = new Date().toISOString().split('T')[0];

  const html = `
    <h3 class="modal-title">Schedule Customer Follow-up</h3>
    <form onsubmit="App.handleAddFollowupSubmit(event)">
      <div style="margin-bottom:14px;">
        <label>Customer *</label>
        <select id="folCustomerSelect" required>
          ${customers.map(c => `
            <option value="${c.id}">${Utils.escapeHTML(c.full_name)} (${Utils.escapeHTML(c.mobile_number)})</option>
          `).join('')}
        </select>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        <div>
          <label>Follow-up Date *</label>
          <input type="date" id="folDate" required value="${todayStr}">
        </div>
        <div>
          <label>Time</label>
          <input type="time" id="folTime" value="14:00">
        </div>
        <div>
          <label>Interaction Type</label>
          <select id="folType">
            <option value="call">Phone Call</option>
            <option value="whatsapp">WhatsApp Message</option>
            <option value="visit">In-Person Meeting</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <label>Priority</label>
          <select id="folPriority">
            <option value="urgent">Urgent</option>
            <option value="high" selected>High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <label>Discussion Agenda / Notes *</label>
        <textarea id="folNotes" required placeholder="Send revised payment plan, confirm CA review..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Schedule Follow-up</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleAddFollowupSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    customer_id: document.getElementById('folCustomerSelect').value,
    follow_up_date: document.getElementById('folDate').value,
    follow_up_time: document.getElementById('folTime').value,
    follow_up_type: document.getElementById('folType').value,
    priority: document.getElementById('folPriority').value,
    notes: document.getElementById('folNotes').value.trim()
  };

  try {
    const res = await API.post('/followups', payload);
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderFollowupsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Edit Follow-up Modal
App.openEditFollowupModal = function(id) {
  const f = (this.cache.followups || []).find(x => x.id === id);
  if (!f) return;

  const html = `
    <h3 class="modal-title">Edit Follow-up</h3>
    <form onsubmit="App.handleEditFollowupSubmit(event, '${f.id}')">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        <div>
          <label>Follow-up Date *</label>
          <input type="date" id="editFolDate" required value="${f.follow_up_date}">
        </div>
        <div>
          <label>Time</label>
          <input type="time" id="editFolTime" value="${f.follow_up_time || '11:00'}">
        </div>
        <div>
          <label>Interaction Type</label>
          <select id="editFolType">
            <option value="call" ${f.follow_up_type === 'call' ? 'selected' : ''}>Phone Call</option>
            <option value="whatsapp" ${f.follow_up_type === 'whatsapp' ? 'selected' : ''}>WhatsApp Message</option>
            <option value="visit" ${f.follow_up_type === 'visit' ? 'selected' : ''}>In-Person Meeting</option>
            <option value="email" ${f.follow_up_type === 'email' ? 'selected' : ''}>Email</option>
          </select>
        </div>
        <div>
          <label>Priority</label>
          <select id="editFolPriority">
            <option value="urgent" ${f.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            <option value="high" ${f.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${f.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${f.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label>Status</label>
        <select id="editFolStatus">
          <option value="pending" ${f.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="completed" ${f.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${f.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>

      <div style="margin-bottom:18px;">
        <label>Discussion Agenda / Notes *</label>
        <textarea id="editFolNotes" required>${Utils.escapeHTML(f.notes)}</textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Save Changes</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleEditFollowupSubmit = async function(e, id) {
  e.preventDefault();
  const payload = {
    follow_up_date: document.getElementById('editFolDate').value,
    follow_up_time: document.getElementById('editFolTime').value,
    follow_up_type: document.getElementById('editFolType').value,
    priority: document.getElementById('editFolPriority').value,
    status: document.getElementById('editFolStatus').value,
    notes: document.getElementById('editFolNotes').value.trim()
  };

  try {
    const res = await API.put(`/followups/${id}`, payload);
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderFollowupsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.deleteFollowup = async function(id) {
  if (!confirm('Are you sure you want to delete this follow-up?')) return;
  try {
    const res = await API.delete(`/followups/${id}`);
    Utils.toast(res.message);
    App.renderFollowupsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Complete Follow-up Modal
App.openCompleteFollowupModal = function(id) {
  const html = `
    <h3 class="modal-title">Mark Follow-up as Completed</h3>
    <form onsubmit="App.handleCompleteFollowupSubmit(event, '${id}')">
      <div style="margin-bottom:18px;">
        <label>Outcome Notes</label>
        <textarea id="folOutcomeNotes" required placeholder="What was discussed with customer? Next steps agreed..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Confirm Completion ✓</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handleCompleteFollowupSubmit = async function(e, id) {
  e.preventDefault();
  const completion_notes = document.getElementById('folOutcomeNotes').value.trim();

  try {
    await API.patch(`/followups/${id}/status`, {
      status: 'completed',
      completion_notes
    });
    Utils.toast('Follow-up marked completed!');
    Utils.closeModal();
    App.renderFollowupsList(document.getElementById('pageContent'));
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};
