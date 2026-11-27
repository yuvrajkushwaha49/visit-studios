// Customer 360° Profile Component
App.openCustomer360 = function(customerId, returnPage = null) {
  this.selectedCustomerId = customerId;
  this.customer360ReturnPage = returnPage || this.activePage || 'leads';
  this.navigate('customer_360');
};

App.renderCustomer360 = async function(container) {
  const customerId = this.selectedCustomerId;
  if (!customerId) {
    container.innerHTML = `<div class="panel" style="padding:30px;">Select a customer or lead to view Customer 360° Profile.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted);">Loading Customer 360° Profile...</div>`;
  try {
    const [detail, timelineRes] = await Promise.all([
      API.get(`/customers/${customerId}`),
      API.get(`/customers/${customerId}/timeline`).catch(() => ({ timeline: [] }))
    ]);

    const c = detail.customer;
    const enquiries = detail.enquiries || [];
    const invitations = detail.invitations || [];
    const visits = detail.visits || [];
    const followups = detail.followups || [];
    const interactions = detail.interactions || [];
    const stageHistory = detail.stageHistory || [];
    const assignmentHistory = detail.assignmentHistory || [];
    const timeline = timelineRes.timeline || [];

    const interestedProjects = [...new Set(enquiries.map(e => e.project_name).filter(Boolean))];
    if (c.interested_project_name && !interestedProjects.includes(c.interested_project_name)) {
      interestedProjects.unshift(c.interested_project_name);
    }
    const configurations = [...new Set(enquiries.map(e => e.apartment_size || e.configuration_name).filter(Boolean))];
    if (c.configuration && !configurations.includes(c.configuration)) {
      configurations.unshift(c.configuration);
    }
    const bookedEnquiry = enquiries.find(e => e.stage === 'booked_won');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="eyebrow">CUSTOMER 360° PROFILE · ${Utils.escapeHTML(c.customer_code || '')}</div>
          <h1 class="page-title">${Utils.escapeHTML(c.full_name)}</h1>
          <p class="page-desc">${Utils.escapeHTML(c.mobile_number)} ${c.email ? `· ${Utils.escapeHTML(c.email)}` : ''} ${c.city ? `· ${Utils.escapeHTML(c.city)}` : ''}</p>
        </div>
        <div class="actions">
          <button class="btn soft" onclick="App.navigate('${Utils.escapeHTML(this.customer360ReturnPage || 'leads')}')">← Back</button>
          <button class="btn primary" onclick="App.openAddFollowupModal('${c.id}')">+ Schedule Follow-up</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card purple">
          <div class="kpi-label">Original Lead Source</div>
          <div class="kpi-value" style="font-size:17px;">${Utils.escapeHTML(c.original_source || c.lead_source || 'Direct')}</div>
          <div class="kpi-sub">Customer Status: ${Utils.escapeHTML(String(c.status || '').replace(/_/g, ' '))}</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-label">Current Assignment</div>
          <div class="kpi-value" style="font-size:17px;">${Utils.escapeHTML(c.assigned_associate_name || 'Unassigned')}</div>
          <div class="kpi-sub">Sales Head: ${Utils.escapeHTML(c.assigned_sales_head_name || 'Direct')}</div>
        </div>
        <div class="kpi-card gold">
          <div class="kpi-label">Project Enquiries</div>
          <div class="kpi-value">${enquiries.length}</div>
          <div class="kpi-sub">${interestedProjects.length} interested project${interestedProjects.length === 1 ? '' : 's'}</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-label">Invitations & Visits</div>
          <div class="kpi-value">${invitations.length} / ${visits.length}</div>
          <div class="kpi-sub">${followups.length} follow-up${followups.length === 1 ? '' : 's'} logged</div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:20px; padding:18px 20px;">
        <h3 class="panel-title" style="margin-bottom:12px;">Consolidated Buyer Profile & Preferences</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:12px;">
          <div><div class="kpi-label">Mobile</div><strong>${Utils.escapeHTML(c.mobile_number || '—')}</strong></div>
          <div><div class="kpi-label">WhatsApp</div><strong>${Utils.escapeHTML(c.whatsapp_number || '—')}</strong></div>
          <div><div class="kpi-label">Email</div><strong>${Utils.escapeHTML(c.email || '—')}</strong></div>
          <div><div class="kpi-label">City / Preferred Location</div><strong>${Utils.escapeHTML(c.city || c.preferred_location || '—')}</strong></div>
          <div><div class="kpi-label">Budget</div><strong>${Utils.escapeHTML(c.budget || enquiries[0]?.budget || 'Open')}</strong></div>
          <div><div class="kpi-label">Interested Projects</div><strong>${Utils.escapeHTML(interestedProjects.join(', ') || 'Exploring')}</strong></div>
          <div><div class="kpi-label">Configurations</div><strong>${Utils.escapeHTML(configurations.join(', ') || '—')}</strong></div>
          <div><div class="kpi-label">Booking Details</div><strong>${bookedEnquiry ? `Booked (${Utils.escapeHTML(bookedEnquiry.project_name || '')} · ${Utils.escapeHTML(bookedEnquiry.enquiry_ref)})` : (c.status === 'booked' ? 'Booked' : 'In Pipeline')}</strong></div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:20px;">
        <div class="panel-header"><h3 class="panel-title">All Project Enquiries (${enquiries.length})</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ref</th><th>Project & Config</th><th>Timeline & Callback</th><th>Source / Orig Owner</th><th>Current Owner</th><th>Stage</th><th>Action</th></tr></thead>
            <tbody>
              ${enquiries.length ? enquiries.map(e => `
                <tr>
                  <td><code>${Utils.escapeHTML(e.enquiry_ref)}</code><small>${Utils.formatDate(e.submitted_at)}</small></td>
                  <td><strong>${Utils.escapeHTML(e.project_name || '—')}</strong><small>${Utils.escapeHTML(e.apartment_size || '')}${e.budget ? ' · ' + Utils.escapeHTML(e.budget) : ''}</small></td>
                  <td>${Utils.escapeHTML(e.purchase_timeline || '—')}<small>Callback: ${Utils.escapeHTML(e.preferred_callback_time || '—')}</small></td>
                  <td>${Utils.escapeHTML(e.enquiry_source || '—')}<small>Orig: ${Utils.escapeHTML(e.original_associate_name || e.original_link_owner_name || 'Direct')}</small></td>
                  <td>${Utils.escapeHTML(e.assigned_associate_name || 'Unassigned')}</td>
                  <td><span class="badge lead-stage-${e.stage}">${Utils.escapeHTML(e.stage.replace(/_/g, ' '))}</span></td>
                  <td><button class="btn small primary" onclick="App.openLeadDetailModal('${e.id}')">Manage</button></td>
                </tr>
              `).join('') : `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">No enquiries recorded for this customer yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:20px; margin-bottom:20px;">
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Consolidated Timeline (${timeline.length})</h3></div>
          <div style="padding:14px 18px; max-height:320px; overflow-y:auto;">
            ${timeline.length ? timeline.map(ev => `
              <div style="padding:8px 0; border-bottom:1px solid var(--line);">
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                  <strong>${Utils.escapeHTML(ev.title)}</strong>
                  <span style="color:var(--muted);">${Utils.formatDate(ev.timestamp)}</span>
                </div>
                <div style="font-size:12px; color:var(--muted); margin-top:2px;">${Utils.escapeHTML(ev.description)} · <em>${Utils.escapeHTML(ev.actor)}</em></div>
              </div>
            `).join('') : `<div style="color:var(--muted); text-align:center; padding:20px;">No timeline events yet.</div>`}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Assignment & Stage History</h3></div>
          <div style="padding:14px 18px; max-height:320px; overflow-y:auto;">
            <strong style="font-size:12px; color:var(--purple);">Lead Stage Transitions (${stageHistory.length})</strong>
            ${stageHistory.map(h => `
              <div style="font-size:12px; padding:5px 0; border-bottom:1px dashed var(--line);">
                <code>${Utils.escapeHTML(h.enquiry_ref)}</code>: ${Utils.escapeHTML(h.previous_stage || 'Start')} → <strong>${Utils.escapeHTML(h.new_stage)}</strong> (${Utils.escapeHTML(h.changed_by_name || 'System')})
              </div>
            `).join('') || '<div style="font-size:12px; color:var(--muted); margin-bottom:10px;">None</div>'}
            <strong style="font-size:12px; color:var(--purple); display:block; margin-top:12px;">Assignment History (${assignmentHistory.length})</strong>
            ${assignmentHistory.map(a => `
              <div style="font-size:12px; padding:5px 0; border-bottom:1px dashed var(--line);">
                <code>${Utils.escapeHTML(a.enquiry_ref)}</code>: ${Utils.escapeHTML(a.previous_owner_name || 'Unassigned')} → <strong>${Utils.escapeHTML(a.new_owner_name || 'Team Pool')}</strong> (${Utils.escapeHTML(a.reason || '')})
              </div>
            `).join('') || '<div style="font-size:12px; color:var(--muted);">None</div>'}
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Invitations (${invitations.length}) & Site Visits (${visits.length})</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                ${visits.length ? visits.map(v => `
                  <tr>
                    <td>${Utils.escapeHTML(v.project_name)}</td>
                    <td>${Utils.formatDate(v.scheduled_date)} <small>${Utils.formatTime(v.scheduled_time)}</small></td>
                    <td><span class="badge ${v.status}">${Utils.escapeHTML(v.status)}</span></td>
                  </tr>
                `).join('') : `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--muted);">No site visits yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Follow-ups (${followups.length}) & Notes (${interactions.length})</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Due Date</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                ${followups.length ? followups.map(f => `
                  <tr>
                    <td>${Utils.formatDate(f.follow_up_date)}</td>
                    <td>${Utils.escapeHTML(f.notes)}</td>
                    <td><span class="badge ${f.status}">${Utils.escapeHTML(f.status)}</span></td>
                  </tr>
                `).join('') : `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--muted);">No follow-ups scheduled.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="panel" style="padding:30px; color:var(--red);">Error: ${Utils.escapeHTML(err.message)}</div>`;
  }
};
