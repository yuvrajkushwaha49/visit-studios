// Public Customer Invitation & Feedback Portal Component
App.renderPublicInvitation = async function(token) {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.body.classList.add('public-mode');
  const shell = document.getElementById('appShell');
  const publicContainer = document.getElementById('publicViewContainer');

  if (shell) {
    shell.classList.add('hidden');
    shell.style.setProperty('display', 'none', 'important');
    shell.style.setProperty('height', '0px', 'important');
    shell.style.setProperty('min-height', '0px', 'important');
    shell.style.setProperty('margin', '0px', 'important');
    shell.style.setProperty('padding', '0px', 'important');
  }
  publicContainer.classList.remove('hidden');
  publicContainer.style.setProperty('display', 'block', 'important');
  publicContainer.style.setProperty('margin-top', '0px', 'important');
  const mobNav = document.getElementById('mobileBottomNav');
  if (mobNav) {
    mobNav.classList.add('hidden');
    mobNav.style.setProperty('display', 'none', 'important');
  }

  publicContainer.innerHTML = `
    <div class="public-customer-shell">
      <div class="public-customer-wrap">
        <div class="invitation-card" style="padding: 32px 20px; text-align: center; border-radius: 16px;">
          <div class="inv-loader-spinner" style="margin: 0 auto 14px;"></div>
          <div style="font-family:'Cinzel', serif; font-size:12px; letter-spacing:2px; color:var(--purple); font-weight:700;">VISIT STUDIO</div>
          <div style="font-size:12.5px; color:var(--muted); margin-top:6px; font-weight:500;">Opening your personal property invitation...</div>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await API.get(`/invitations/public/${token}`);
    const inv = res.invitation;

    document.title = `${inv.project_name} — Your Personal Site Visit Invitation`;

    const dateBadge = Utils.getDateBadge(inv.visit_date);
    const formattedDate = Utils.formatDate(inv.visit_date);
    const formattedTime = Utils.formatTime(inv.visit_time);
    const mapUrl = inv.project_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inv.project_location + ' ' + inv.project_name)}`;

    const cleanAdvisorPhone = (inv.advisor_phone || '').replace(/[^\d+]/g, '');
    const cleanWaAdvisor = (inv.advisor_phone || '').replace(/[^\d]/g, '');
    const waAdvisorPhone = cleanWaAdvisor.length === 10 ? '91' + cleanWaAdvisor : cleanWaAdvisor;
    const waDirectUrl = `https://wa.me/${waAdvisorPhone}?text=${encodeURIComponent('Hello, I am reviewing my site visit invitation for ' + inv.project_name)}`;

    const gcalUrl = Utils.generateGoogleCalendarUrl({
      title: `Site Visit · ${inv.project_name}`,
      description: `Site visit for ${inv.customer_name}.\nLocation: ${inv.project_location}\nHost Advisor: ${inv.advisor_name} (${inv.advisor_phone})\nNotes: ${inv.notes || ''}`,
      location: inv.project_location,
      dateStr: inv.visit_date,
      timeStr: inv.visit_time,
      durationMinutes: inv.duration || 60
    });

    publicContainer.innerHTML = `
      <div class="public-customer-shell">
        <div class="public-customer-wrap">
          <!-- Luxury VIP Invitation Pass Card (Image 1 Background + Image 2 Content) -->
          <div style="margin-bottom: 24px; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.35); border: 2px solid #dfba73; background:#081224;">
              <img id="luxuryCardImg" src="/cards/${inv.id}.png" alt="VIP Pass" style="width: 100%; height: auto; display: block;" onerror="App.renderDynamicLuxuryCardFallback(this, '${token}')">
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: center; gap: 10px;">
              <button class="btn soft small" onclick="App.downloadLuxuryPass('${inv.id}', '${Utils.escapeHTML(inv.customer_name)}')" style="font-size:12px; padding:6px 14px; border-color:#dfba73; color:#dfba73; background:rgba(223,186,115,0.08); font-weight:600;">
                📥 Download Luxury Pass (HD)
              </button>
            </div>
          </div>

          <!-- Digital Invitation Card -->
          <article class="invitation-card" style="box-shadow: 0 16px 50px rgba(31, 27, 59, 0.12);">
            <div class="inv-inner">
              <!-- Top Branding Header -->
              <div class="inv-top">
                <div>
                  <div class="inv-agency" style="color: ${inv.brand_color || '#6c54a0'};">
                    ${Utils.escapeHTML(inv.agency_name || 'Visit Studio Realty')}
                  </div>
                  <div class="inv-agency-sub">${Utils.escapeHTML(inv.agency_subtitle || 'A personal property invitation')}</div>
                </div>
                <div class="inv-dev-badge" style="display:flex; align-items:center; gap:10px; justify-content:flex-end;">
                  <div style="text-align:right;">
                    <div class="inv-dev-name" style="font-size:15px; font-weight:700; color:var(--ink); line-height:1.2;">${Utils.escapeHTML(inv.developer_name || 'Developer')}</div>
                    <div class="inv-dev-sub" style="font-size:9px; letter-spacing:1.5px; color:var(--muted); text-transform:uppercase;">BUILDER / DEVELOPER</div>
                  </div>
                  ${inv.developer_logo ? `
                    <div style="width:42px; height:42px; border-radius:8px; background:#ffffff; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:3px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                      <img src="${inv.developer_logo}" alt="Developer Logo" style="max-width:100%; max-height:100%; object-fit:contain;">
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Hero Greeting -->
              <div class="inv-hero">
                <div class="eyebrow" style="color: ${inv.accent_color || '#f59e0b'};">YOU'RE PERSONALLY INVITED</div>
                <h2>Your next address.<br>A closer look.</h2>
                <p>Dear ${Utils.escapeHTML(inv.customer_name)}, we look forward to welcoming you.</p>
                <div style="display:flex; gap:8px; align-items:center; margin-top:10px;">
                  <span class="inv-badge-pill" style="background:var(--pale); color:var(--purple);">
                    ${inv.visit_status === 'confirmed' ? '✓ Visit Confirmed' : (inv.visit_status === 'reschedule_requested' ? 'Reschedule Requested' : 'Site Visit Invitation')}
                  </span>
                </div>
              </div>

              <!-- Property Residence Box -->
              <div class="inv-property-box" style="position:relative; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                  <div style="flex:1;">
                    <div class="eyebrow" style="color:var(--muted); margin-bottom:4px;">YOUR SELECTED RESIDENCE</div>
                    <h3 class="inv-property-title" style="margin-bottom:4px;">${Utils.escapeHTML(inv.project_name)}</h3>
                    <div style="font-size:12px; color:var(--purple); font-weight:600; margin-bottom:12px;">
                      BY ${Utils.escapeHTML(inv.developer_name || 'Developer')}
                    </div>
                  </div>
                  ${inv.project_logo ? `
                    <div style="width:52px; height:52px; border-radius:10px; background:#ffffff; border:1.5px solid #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:4px; flex-shrink:0; box-shadow:0 3px 10px rgba(0,0,0,0.06);">
                      <img src="${inv.project_logo}" alt="Project Logo" style="max-width:100%; max-height:100%; object-fit:contain;">
                    </div>
                  ` : ''}
                </div>
                <div class="inv-prop-specs">
                  <div>
                    <span>Super built-up area</span>
                    <b>${Utils.escapeHTML(inv.apartment_size || 'Apartment size')}</b>
                  </div>
                  <div>
                    <span>Discussed price</span>
                    <b>${Utils.escapeHTML(inv.discussed_price || 'Price on request')}</b>
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
                  <p>${formattedTime} · ${inv.duration || 60} minutes duration</p>
                </div>
              </div>

              <!-- Meeting Address -->
              <div class="inv-detail-block">
                <span>MEETING LOCATION</span>
                <div style="font-weight:500;">${Utils.escapeHTML(inv.project_location)}</div>
              </div>

              ${inv.notes ? `
                <div class="inv-detail-block">
                  <span>DISCUSSED WITH YOU</span>
                  <div style="color: #4a4658; white-space:pre-wrap;">${Utils.escapeHTML(inv.notes)}</div>
                </div>
              ` : ''}

              <!-- Advisor Host Card -->
              <div class="inv-advisor-row">
                <div>
                  <span>YOUR HOST ADVISOR</span>
                  <b>${Utils.escapeHTML(inv.advisor_name)}</b>
                </div>
                <div style="display:flex; gap:8px;">
                  ${cleanAdvisorPhone ? `
                    <a href="tel:${cleanAdvisorPhone}" class="btn small" style="background:var(--pale); color:var(--purple);">
                      Call Host
                    </a>
                  ` : ''}
                  <a href="${waDirectUrl}" target="_blank" rel="noopener noreferrer" class="btn small gold">
                    WhatsApp Host
                  </a>
                </div>
              </div>

              <!-- Contactless Check-in QR Pass -->
              <div class="inv-qr-section">
                <div style="font-size:11px; font-weight:700; color:var(--ink); margin-bottom:6px; letter-spacing:0.5px;">
                  YOUR CONTACTLESS RECEPTION PASS
                </div>
                <img src="${inv.qr_code_data}" alt="Check-in QR" class="inv-qr-img">
                <p class="inv-qr-caption">Show this QR pass upon arrival at the experience gallery for fast-track entry.</p>
              </div>

              <!-- Disclaimer -->
              <div class="inv-disclaimer">
                Issued as an exclusive site visit invitation, not a developer allocation, purchase agreement or booking confirmation. Area and pricing are as discussed and subject to verification and terms.
              </div>
            </div>

            <div class="inv-footer">
              PERSONALLY ARRANGED · ${Utils.escapeHTML(inv.agency_name || 'VISIT STUDIO')} · REF ${inv.id.slice(0, 8).toUpperCase()}
            </div>
          </article>

          <!-- Interactive Customer RSVP Buttons -->
          <div style="margin: 24px 0 16px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; text-align:center;">
              YOUR ATTENDANCE & NAVIGATION
            </div>

            <div class="public-actions-grid">
              ${inv.visit_status !== 'confirmed' ? `
                <button class="btn primary" onclick="App.handlePublicConfirm('${token}')">
                  ✓ Confirm My Attendance
                </button>
              ` : `
                <button class="btn" disabled style="background:#eaf6ef; color:var(--green); border-color:#bbf7d0;">
                  ✓ Attendance Confirmed
                </button>
              `}

              <a href="${Utils.escapeHTML(mapUrl)}" target="_blank" rel="noopener noreferrer" class="btn soft" style="text-align:center;">
                📍 Open in Google Maps ↗
              </a>

              <a href="${Utils.escapeHTML(gcalUrl)}" target="_blank" rel="noopener noreferrer" class="btn">
                📅 Add to Google Calendar ↗
              </a>

              <button class="btn" onclick="App.downloadPublicICS('${inv.id}', '${inv.project_name}', '${inv.project_location}', '${inv.visit_date}', '${inv.visit_time}', ${inv.duration || 60})">
                📥 Download Calendar (.ics)
              </button>

              <button class="btn" onclick="App.openPublicRescheduleDialog('${token}')">
                Request Reschedule
              </button>

              <button class="btn danger" onclick="App.openPublicCancelDialog('${token}')">
                Cancel Visit
              </button>
            </div>

            <div style="text-align:center; margin-top:20px;">
              <button class="btn small" onclick="window.print()">
                Print Invitation / Save PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch (err) {
    publicContainer.innerHTML = `
      <div class="public-customer-shell">
        <div class="public-customer-wrap">
          <div class="panel" style="padding:40px 24px; text-align:center;">
            <h2 style="font-family:'Playfair Display', Georgia, serif; color:var(--ink); margin-bottom:10px;">We Couldn't Open This Invitation</h2>
            <p style="color:var(--muted); font-size:13px; line-height:1.6; max-width:440px; margin:0 auto 20px;">
              ${Utils.escapeHTML(err.message || 'This invitation link may have been revoked or expired. Please contact your property advisor for an updated link.')}
            </p>
            <a href="/" class="btn primary">Return to Visit Studio</a>
          </div>
        </div>
      </div>
    `;
  }
};

// Customer Confirm RSVP
App.handlePublicConfirm = async function(token) {
  try {
    const res = await API.post(`/invitations/public/${token}/confirm`);
    Utils.toast(res.message || 'Attendance confirmed!');
    App.renderPublicInvitation(token);
  } catch (err) {
    Utils.toast('Confirmation error: ' + err.message);
  }
};

// Customer Reschedule Request
App.openPublicRescheduleDialog = function(token) {
  const todayStr = new Date().toISOString().split('T')[0];
  const html = `
    <h3 class="modal-title">Request Visit Reschedule</h3>
    <p class="modal-desc">Please choose your preferred date and time. Your dedicated host advisor will be notified immediately.</p>

    <form onsubmit="App.handlePublicRescheduleSubmit(event, '${token}')">
      <div style="margin-bottom:14px;">
        <label>Preferred New Date *</label>
        <input type="date" id="publicReschedDate" required min="${todayStr}">
      </div>
      <div style="margin-bottom:14px;">
        <label>Preferred Time</label>
        <input type="time" id="publicReschedTime" value="11:30">
      </div>
      <div style="margin-bottom:18px;">
        <label>Any Specific Notes</label>
        <textarea id="publicReschedNotes" placeholder="Weekend morning preferred..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Close</button>
        <button type="submit" class="btn primary">Submit Request</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handlePublicRescheduleSubmit = async function(e, token) {
  e.preventDefault();
  const requested_date = document.getElementById('publicReschedDate').value;
  const requested_time = document.getElementById('publicReschedTime').value;
  const notes = document.getElementById('publicReschedNotes').value.trim();

  try {
    const res = await API.post(`/invitations/public/${token}/reschedule`, {
      requested_date,
      requested_time,
      notes
    });
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderPublicInvitation(token);
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

// Customer Cancel Dialog
App.openPublicCancelDialog = function(token) {
  const html = `
    <h3 class="modal-title" style="color:var(--red);">Cancel Site Visit</h3>
    <p class="modal-desc">Are you sure you wish to cancel this visit?</p>

    <form onsubmit="App.handlePublicCancelSubmit(event, '${token}')">
      <div style="margin-bottom:18px;">
        <label>Reason for Cancellation (optional)</label>
        <textarea id="publicCancelReason" placeholder="Change of plans, out of town..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn" onclick="Utils.closeModal()">Back</button>
        <button type="submit" class="btn danger">Cancel Visit</button>
      </div>
    </form>
  `;
  Utils.showModal(html);
};

App.handlePublicCancelSubmit = async function(e, token) {
  e.preventDefault();
  const reason = document.getElementById('publicCancelReason').value.trim();

  try {
    const res = await API.post(`/invitations/public/${token}/cancel`, { reason });
    Utils.toast(res.message);
    Utils.closeModal();
    App.renderPublicInvitation(token);
  } catch (err) {
    Utils.toast('Error: ' + err.message);
  }
};

App.downloadPublicICS = function(id, title, location, dateStr, timeStr, duration) {
  Utils.downloadICS({
    id,
    title: `Property Site Visit: ${title}`,
    description: `Site visit for ${title}.\nLocation: ${location}`,
    location,
    dateStr,
    timeStr,
    durationMinutes: duration
  });
};

App.renderDynamicLuxuryCardFallback = async function(imgElem, token) {
  try {
    const res = await API.get(`/invitations/public/${token}`);
    const inv = res.invitation;
    if (!inv) return;

    const cardData = {
      agency_name: inv.agency_name || 'NCR',
      customer_name: inv.customer_name || 'Valued Client',
      project_name: inv.project_name || 'MONARCH',
      developer_name: inv.developer_name || 'M3M INDIA',
      project_logo: inv.project_logo,
      developer_logo: inv.developer_logo,
      visit_date: inv.visit_date,
      visit_time: inv.visit_time,
      location: inv.project_location || inv.location || 'Noida',
      advisor_name: inv.advisor_name || 'Karan Verma',
      advisor_phone: inv.advisor_phone || '+91 98111 22334',
      shortUrl: `${window.location.origin}/i/${inv.short_code || inv.id?.replace('inv-', '') || ''}`,
      short_code: inv.short_code,
      qr_code_data: inv.qr_code_data
    };

    const card = await Utils.generateInvitationCard(cardData);
    if (imgElem && card?.dataUrl) {
      imgElem.src = card.dataUrl;
      imgElem.removeAttribute('onerror');
      if (inv.id) {
        API.post(`/invitations/${inv.id}/card-image`, { image_base64: card.dataUrl }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Luxury card fallback error:', e);
  }
};

App.downloadLuxuryPass = function(id, custName) {
  const img = document.getElementById('luxuryCardImg');
  if (img && img.src && !img.src.endsWith('.png')) {
    Utils.downloadDataUrl(img.src, `VIP_Invitation_Pass_${(custName || 'Guest').replace(/\s+/g, '_')}.png`);
  } else if (img && img.src) {
    Utils.downloadDataUrl(img.src, `VIP_Invitation_Pass_${(custName || 'Guest').replace(/\s+/g, '_')}.png`);
  } else {
    window.open(`/cards/${id}.png`, '_blank');
  }
};

// Public Feedback Submission (#feedback=<visitId>)
App.renderPublicFeedback = async function(visitId) {
  document.body.classList.add('public-mode');
  const shell = document.getElementById('appShell');
  const publicContainer = document.getElementById('publicViewContainer');

  if (shell) {
    shell.classList.add('hidden');
    shell.style.setProperty('display', 'none', 'important');
    shell.style.setProperty('height', '0px', 'important');
    shell.style.setProperty('min-height', '0px', 'important');
    shell.style.setProperty('margin', '0px', 'important');
    shell.style.setProperty('padding', '0px', 'important');
  }
  publicContainer.classList.remove('hidden');
  publicContainer.style.setProperty('display', 'block', 'important');
  publicContainer.style.setProperty('margin-top', '0px', 'important');
  const mobNav = document.getElementById('mobileBottomNav');
  if (mobNav) {
    mobNav.classList.add('hidden');
    mobNav.style.setProperty('display', 'none', 'important');
  }

  publicContainer.innerHTML = `
    <div class="public-customer-shell">
      <div class="public-customer-wrap">
        <div class="panel" style="padding:32px 28px;">
          <div class="eyebrow" style="text-align:center;">YOUR OPINION MATTERS</div>
          <h2 class="modal-title" style="text-align:center; margin-bottom:8px;">How was your site visit experience?</h2>
          <p class="modal-desc" style="text-align:center; margin-bottom:24px;">Please take 30 seconds to share your thoughts.</p>

          <form onsubmit="App.handlePublicFeedbackSubmit(event, '${visitId}')">
            <div style="margin-bottom:20px; text-align:center;">
              <label style="font-size:12px; margin-bottom:10px;">Overall Rating</label>
              <div style="display:flex; justify-content:center; gap:12px; font-size:24px;">
                <label style="cursor:pointer;"><input type="radio" name="fbRating" value="5" checked> ★★★★★</label>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <label>Interest Level in Property</label>
              <select id="fbInterest">
                <option value="very_high">Very High - Ready to discuss booking</option>
                <option value="high" selected>High - Evaluating comparison</option>
                <option value="medium">Medium - Considering other projects</option>
                <option value="low">Low - Exploring options</option>
              </select>
            </div>

            <div style="margin-bottom:16px;">
              <label>Budget Fit</label>
              <select id="fbBudgetFit">
                <option value="within_budget" selected>Well within budget</option>
                <option value="flexible">Flexible / Negotiable</option>
                <option value="over_budget">Higher than expected</option>
              </select>
            </div>

            <div style="margin-bottom:20px;">
              <label>Your Feedback & Experience Remarks</label>
              <textarea id="fbNotes" required placeholder="What did you like most? Any queries regarding floor plan or payment schedule?"></textarea>
            </div>

            <button type="submit" class="btn primary" style="width:100%; min-height:44px;">
              Submit Feedback ✓
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
};

App.handlePublicFeedbackSubmit = async function(e, visitId) {
  e.preventDefault();
  const rating = 5;
  const interest_level = document.getElementById('fbInterest').value;
  const budget_fit = document.getElementById('fbBudgetFit').value;
  const notes = document.getElementById('fbNotes').value.trim();

  try {
    await API.post(`/visits/${visitId}/feedback`, {
      rating,
      interest_level,
      budget_fit,
      notes
    });
    Utils.toast('Thank you for sharing your feedback!');
    document.getElementById('publicViewContainer').innerHTML = `
      <div class="public-customer-shell">
        <div class="public-customer-wrap">
          <div class="panel" style="padding:48px 24px; text-align:center;">
            <h2 style="font-family:'Playfair Display', Georgia, serif; color:var(--ink);">Thank You!</h2>
            <p style="color:var(--muted); font-size:13px; margin:12px 0 24px;">Your feedback has been received. Our team looks forward to assisting you further.</p>
            <a href="/" class="btn primary">Return to Home</a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    Utils.toast('Error submitting feedback: ' + err.message);
  }
};
