// Public 5-Step Property Enquiry Form Component (Dark Ivory & Gold Editorial Theme)
App.enquiryState = {
  token: null,
  sessionId: null,
  formMeta: null,
  step: 1,
  startedEventSent: false,
  values: {
    project_id: '',
    project_name: '',
    configuration_id: '',
    apartment_size: '',
    budget: '',
    purchase_timeline: '',
    preferred_callback_time: '',
    full_name: '',
    country_code: '+91',
    mobile_number: '',
    email: '',
    city: '',
    requirements: '',
    contact_consent: true
  }
};

App.renderPublicEnquiry = async function(token) {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.body.classList.add('public-mode');
  const shell = document.getElementById('appShell');
  const publicContainer = document.getElementById('publicViewContainer');

  if (shell) {
    shell.classList.add('hidden');
    shell.style.setProperty('display', 'none', 'important');
    shell.style.setProperty('height', '0px', 'important');
    shell.style.setProperty('min-height', '0px', 'important');
  }
  if (publicContainer) {
    publicContainer.classList.remove('hidden');
    publicContainer.style.setProperty('display', 'block', 'important');
    publicContainer.style.setProperty('margin-top', '0px', 'important');
  }
  const mobNav = document.getElementById('mobileBottomNav');
  if (mobNav) {
    mobNav.classList.add('hidden');
    mobNav.style.setProperty('display', 'none', 'important');
  }

  const sessionId = 'ses_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  App.enquiryState = {
    token,
    sessionId,
    formMeta: null,
    step: 1,
    startedEventSent: false,
    values: {
      project_id: '',
      project_name: '',
      configuration_id: '',
      apartment_size: '',
      budget: '',
      purchase_timeline: '',
      preferred_callback_time: '',
      full_name: '',
      country_code: '+91',
      mobile_number: '',
      email: '',
      city: '',
      requirements: '',
      contact_consent: true
    }
  };

  publicContainer.innerHTML = `
    <div class="public-customer-shell enq-dark-mode">
      <div class="public-customer-wrap enq-wrap-compact">
        <article class="enq-wizard-card" style="padding:40px 24px; text-align:center;">
          <div class="inv-loader-spinner" style="margin:0 auto 14px;"></div>
          <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; letter-spacing:2.5px; color:#d6b36e; font-weight:700;">PROPERTY ENQUIRY</div>
          <div style="font-size:13px; color:#8c8577; margin-top:6px;">Preparing your enquiry form...</div>
        </article>
      </div>
    </div>
  `;

  try {
    const res = await API.get(`/public/enquiry/${encodeURIComponent(token)}`, { session_id: sessionId });
    const meta = res.enquiryForm;
    App.enquiryState.formMeta = meta;

    if (meta.projects && meta.projects.length === 1) {
      App.enquiryState.values.project_id = meta.projects[0].id;
      App.enquiryState.values.project_name = meta.projects[0].name;
      if (meta.project_locked) {
        App.enquiryState.step = 2;
      }
    }

    document.title = `${meta.title || 'Property Enquiry'} — ${meta.agency_name || 'Visit Studio'}`;
    App.paintPublicEnquiryStep();
  } catch (err) {
    publicContainer.innerHTML = `
      <div class="public-customer-shell enq-dark-mode">
        <div class="public-customer-wrap enq-wrap-compact">
          <article class="enq-wizard-card" style="padding:40px 24px; text-align:center;">
            <div style="font-size:32px; margin-bottom:10px;">🔒</div>
            <h2 style="font-family:Arial, Helvetica, sans-serif; color:#f5f2eb; margin-bottom:10px; font-size:20px;">Enquiry Link Unavailable</h2>
            <p style="color:#8c8577; font-size:13px; line-height:1.6; margin:0 auto;">
              ${Utils.escapeHTML(err.message || 'This enquiry link is invalid, deactivated, or has expired. Please request a fresh link from your property advisor.')}
            </p>
          </article>
        </div>
      </div>
    `;
  }
};

App.notifyEnquiryFormStarted = function() {
  const st = App.enquiryState;
  if (st.startedEventSent || !st.token) return;
  st.startedEventSent = true;
  API.post(`/public/enquiry/${encodeURIComponent(st.token)}/start`, { session_id: st.sessionId }).catch(() => {});
};

App.paintPublicEnquiryStep = function() {
  const publicContainer = document.getElementById('publicViewContainer');
  const st = App.enquiryState;
  const meta = st.formMeta;
  const v = st.values;
  if (!publicContainer || !meta) return;

  const stepMeta = {
    1: { tag: 'Project', title: 'Select a project', sub: 'Choose one' },
    2: { tag: 'Size', title: 'Select an apartment size', sub: 'Choose one' },
    3: { tag: 'Timeline', title: 'How soon would you like to proceed?', sub: 'Choose one' },
    4: { tag: 'Call time', title: 'What is the best time for our relationship manager to call? (IST)', sub: 'Choose one' },
    5: { tag: 'Details', title: 'Your details', sub: 'So we can reach you about this enquiry' }
  }[st.step];

  const selectedProject = (meta.projects || []).find(p => p.id === v.project_id) || (meta.projects || [])[0] || null;
  const headerLogo = selectedProject?.developer_logo || selectedProject?.project_logo || meta.agency_logo || '';
  const headerBrandName = selectedProject?.developer_name || meta.agency_name || 'Prestige Group';

  const progressBarHtml = `
    <div class="enq-step-top-row">
      <span>Step ${st.step} of 5</span>
      <span class="enq-step-name">${stepMeta.tag}</span>
    </div>
    <div class="enq-progress-track">
      <div class="enq-progress-fill" style="width:${(st.step / 5) * 100}%;"></div>
    </div>
  `;

  let bodyHtml = '';

  if (st.step === 1) {
    const projects = meta.projects || [];
    bodyHtml = `
      <div class="enq-step-head">
        <h1 class="enq-q">${stepMeta.title}</h1>
        <p>${stepMeta.sub}</p>
      </div>
      <div class="enq-options-list">
        ${projects.length ? projects.map(p => `
          <button type="button" class="enq-option-row ${v.project_id === p.id ? 'selected' : ''}" onclick="App.selectEnquiryProject('${p.id}')">
            <div class="enq-option-text">
              <strong>${Utils.escapeHTML(p.name)}</strong>
              ${p.location ? `<small>${Utils.escapeHTML(p.location)}</small>` : ''}
            </div>
            <span class="enq-radio" aria-hidden="true"></span>
          </button>
        `).join('') : `<div style="padding:20px; text-align:center; color:#A29B8D;">No active projects available right now.</div>`}
      </div>
      <div class="enq-actions-bar">
        <button type="button" class="enq-next-btn" onclick="App.nextEnquiryStep()">Next</button>
      </div>
    `;
  } else if (st.step === 2) {
    const configs = selectedProject?.configurations || [];
    const fallbackSizes = [
      '2BHK - 1300 sq.ft',
      '3BHK + 2T - 1600 sq.ft',
      '3BHK + 3T - 1800 sq.ft',
      '3BHK + 3T + Servant - 2400 sq.ft',
      '4BHK + 3T + Servant - 2500 sq.ft',
      '4BHK + 4T + Servant - 2700 sq.ft',
      '4BHK + 4T + Servant - 3350 sq.ft'
    ];
    const budgetOptions = ['₹1 Cr – ₹2 Cr', '₹2 Cr – ₹3.5 Cr', '₹3.5 Cr – ₹5 Cr', '₹5 Cr – ₹8 Cr', '₹8 Cr+'];

    bodyHtml = `
      <div class="enq-step-head">
        <h1 class="enq-q">${stepMeta.title}</h1>
        <p>${stepMeta.sub}</p>
      </div>
      <div class="enq-options-list">
        ${configs.length ? configs.map(cfg => {
          const label = cfg.name + (cfg.super_built_up_area ? ` (${cfg.super_built_up_area})` : '');
          const isSel = v.configuration_id === cfg.id || v.apartment_size === label;
          return `
            <button type="button" class="enq-option-row ${isSel ? 'selected' : ''}" onclick="App.selectEnquiryConfig('${cfg.id}', '${Utils.escapeHTML(label).replace(/'/g, "\\'")}', '${Utils.escapeHTML(cfg.price || '').replace(/'/g, "\\'")}')">
              <div class="enq-option-text">
                <strong>${Utils.escapeHTML(cfg.name)}</strong>
                ${(cfg.super_built_up_area || cfg.price) ? `<small>${Utils.escapeHTML([cfg.super_built_up_area, cfg.price].filter(Boolean).join(' · '))}</small>` : ''}
              </div>
              <span class="enq-radio" aria-hidden="true"></span>
            </button>
          `;
        }).join('') : fallbackSizes.map(sz => `
          <button type="button" class="enq-option-row ${v.apartment_size === sz ? 'selected' : ''}" onclick="App.selectEnquiryConfig('', '${sz}', '')">
            <div class="enq-option-text"><strong>${sz}</strong></div>
            <span class="enq-radio" aria-hidden="true"></span>
          </button>
        `).join('')}
      </div>

      <div class="enq-budget-block">
        <label class="enq-section-label">Approximate Budget Range <span class="enq-opt-tag">optional</span></label>
        <div class="enq-chip-group">
          ${budgetOptions.map(b => `
            <button type="button" class="enq-chip ${v.budget === b ? 'selected' : ''}" onclick="App.setEnquiryField('budget', '${b}')">${b}</button>
          `).join('')}
        </div>
      </div>

      <div class="enq-actions-bar">
        ${!meta.project_locked ? `<button type="button" class="enq-back-btn" onclick="App.goEnquiryStep(1)">Back</button>` : ''}
        <button type="button" class="enq-next-btn" onclick="App.nextEnquiryStep()">Next</button>
      </div>
    `;
  } else if (st.step === 3) {
    const timelines = [
      'Immediately',
      'Next Week',
      'Next Month'
    ];
    bodyHtml = `
      <div class="enq-step-head">
        <h1 class="enq-q">${stepMeta.title}</h1>
        <p>${stepMeta.sub}</p>
      </div>
      <div class="enq-options-list">
        ${timelines.map(t => `
          <button type="button" class="enq-option-row ${v.purchase_timeline === t ? 'selected' : ''}" onclick="App.setEnquiryField('purchase_timeline', '${t}')">
            <div class="enq-option-text"><strong>${t}</strong></div>
            <span class="enq-radio" aria-hidden="true"></span>
          </button>
        `).join('')}
      </div>
      <div class="enq-actions-bar">
        <button type="button" class="enq-back-btn" onclick="App.goEnquiryStep(2)">Back</button>
        <button type="button" class="enq-next-btn" onclick="App.nextEnquiryStep()">Next</button>
      </div>
    `;
  } else if (st.step === 4) {
    const slots = [
      '10:00 AM to 11:30 AM',
      '12:00 PM to 3:00 PM',
      '4:00 PM to 8:00 PM'
    ];
    bodyHtml = `
      <div class="enq-step-head">
        <h1 class="enq-q">${stepMeta.title}</h1>
        <p>${stepMeta.sub}</p>
      </div>
      <div class="enq-options-list">
        ${slots.map(s => `
          <button type="button" class="enq-option-row ${v.preferred_callback_time === s ? 'selected' : ''}" onclick="App.setEnquiryField('preferred_callback_time', '${s}')">
            <div class="enq-option-text"><strong>${s}</strong></div>
            <span class="enq-radio" aria-hidden="true"></span>
          </button>
        `).join('')}
      </div>
      <div class="enq-actions-bar">
        <button type="button" class="enq-back-btn" onclick="App.goEnquiryStep(3)">Back</button>
        <button type="button" class="enq-next-btn" onclick="App.nextEnquiryStep()">Next</button>
      </div>
    `;
  } else if (st.step === 5) {
    bodyHtml = `
      <div class="enq-step-head">
        <h1 class="enq-q">${stepMeta.title}</h1>
        <p>${stepMeta.sub}</p>
      </div>
      <form id="publicEnquiryFinalForm" onsubmit="App.submitPublicEnquiryForm(event)">
        <input type="text" id="enqHpField" name="website_url" tabindex="-1" autocomplete="off" style="position:absolute; left:-9999px; width:1px; height:1px; opacity:0;">

        <div class="enq-form-stack">
          <div>
            <label for="enqFullName">Full name <span class="enq-req">*</span></label>
            <input id="enqFullName" required minlength="2" maxlength="80" placeholder="Your full name" value="${Utils.escapeHTML(v.full_name)}" oninput="App.enquiryState.values.full_name=this.value">
          </div>
          <div>
            <label for="enqMobile">Mobile number <span class="enq-req">*</span></label>
            <div class="enq-phone-wrap">
              <select id="enqCountryCode" class="enq-cc-select" onchange="App.enquiryState.values.country_code=this.value">
                <option value="+91" ${v.country_code === '+91' ? 'selected' : ''}>+91</option>
                <option value="+971" ${v.country_code === '+971' ? 'selected' : ''}>+971</option>
                <option value="+1" ${v.country_code === '+1' ? 'selected' : ''}>+1</option>
                <option value="+44" ${v.country_code === '+44' ? 'selected' : ''}>+44</option>
                <option value="+65" ${v.country_code === '+65' ? 'selected' : ''}>+65</option>
              </select>
              <input id="enqMobile" type="tel" required minlength="10" maxlength="18" placeholder="98765 43210" value="${Utils.escapeHTML(v.mobile_number)}" oninput="App.enquiryState.values.mobile_number=this.value">
            </div>
            <p class="enq-hint-sm">Indian mobile number, with or without +91</p>
          </div>
          <div>
            <label for="enqEmail">Email <span class="enq-opt-tag">optional</span></label>
            <input id="enqEmail" type="email" maxlength="120" placeholder="you@example.com" value="${Utils.escapeHTML(v.email)}" oninput="App.enquiryState.values.email=this.value">
          </div>
          <div>
            <label for="enqCity">Current city <span class="enq-req">*</span></label>
            <input id="enqCity" required minlength="2" maxlength="80" placeholder="City" value="${Utils.escapeHTML(v.city)}" oninput="App.enquiryState.values.city=this.value">
          </div>
          <div>
            <label for="enqRequirements">Additional requirements <span class="enq-opt-tag">optional</span></label>
            <textarea id="enqRequirements" rows="3" maxlength="1000" placeholder="Anything else you would like to share" oninput="App.enquiryState.values.requirements=this.value">${Utils.escapeHTML(v.requirements)}</textarea>
          </div>
        </div>

        <label class="enq-consent-row">
          <input type="checkbox" id="enqConsent" ${v.contact_consent ? 'checked' : ''} onchange="App.enquiryState.values.contact_consent=this.checked">
          <span>I agree to be contacted about this enquiry. <span class="enq-req">*</span></span>
        </label>

        <div id="enqSubmitError" class="hidden" style="margin-top:12px; padding:11px 13px; border-radius:8px; background:rgba(227,145,120,0.10); border:1px solid rgba(227,145,120,0.35); color:#F3C6B6; font-size:13px;"></div>

        <div class="enq-actions-bar">
          <button type="button" class="enq-back-btn" onclick="App.goEnquiryStep(4)">Back</button>
          <button type="submit" id="enqSubmitBtn" class="enq-next-btn">Submit</button>
        </div>
      </form>
    `;
  }

  publicContainer.innerHTML = `
    <div class="public-customer-shell enq-dark-mode">
      <div class="public-customer-wrap enq-wrap-compact">
        <article class="enq-wizard-card">
          <div class="enq-wizard-header">
            ${headerLogo ? `
              <img src="${Utils.escapeHTML(headerLogo)}" alt="${Utils.escapeHTML(headerBrandName)}" class="enq-header-logo" onerror="this.style.display='none'">
            ` : `
              <div class="enq-header-brand-fallback">${Utils.escapeHTML(headerBrandName)}</div>
            `}
            <div class="enq-header-eyebrow">Property enquiry</div>
          </div>

          <div class="enq-bar">
            ${progressBarHtml}
          </div>

          <div class="enq-wizard-body">
            ${bodyHtml}
          </div>

          <footer class="enq-disclaimer">
            <p>Enquiry form only — not the official developer website.</p>
            <p>Details you submit are stored for this enquiry.</p>
          </footer>
        </article>
      </div>
    </div>
  `;
};

App.selectEnquiryProject = function(projectId) {
  App.notifyEnquiryFormStarted();
  const proj = (App.enquiryState.formMeta?.projects || []).find(p => p.id === projectId);
  App.enquiryState.values.project_id = projectId;
  App.enquiryState.values.project_name = proj?.name || '';
  App.enquiryState.values.configuration_id = '';
  App.enquiryState.values.apartment_size = '';
  App.paintPublicEnquiryStep();
};

App.selectEnquiryConfig = function(configId, sizeLabel, indicativePrice) {
  App.notifyEnquiryFormStarted();
  App.enquiryState.values.configuration_id = configId || '';
  App.enquiryState.values.apartment_size = sizeLabel || '';
  if (indicativePrice && !App.enquiryState.values.budget) {
    App.enquiryState.values.budget = indicativePrice;
  }
  App.paintPublicEnquiryStep();
};

App.setEnquiryField = function(field, val) {
  App.notifyEnquiryFormStarted();
  App.enquiryState.values[field] = val;
  App.paintPublicEnquiryStep();
};

App.goEnquiryStep = function(stepNum) {
  App.enquiryState.step = stepNum;
  App.paintPublicEnquiryStep();
};

App.nextEnquiryStep = function() {
  const st = App.enquiryState;
  const v = st.values;
  App.notifyEnquiryFormStarted();

  if (st.step === 1 && !v.project_id) {
    Utils.toast('Please select a project to continue.');
    return;
  }
  if (st.step === 2 && !v.apartment_size) {
    Utils.toast('Please select an apartment size or configuration.');
    return;
  }
  if (st.step === 3 && !v.purchase_timeline) {
    Utils.toast('Please select your purchase timeline.');
    return;
  }
  if (st.step === 4 && !v.preferred_callback_time) {
    Utils.toast('Please choose a preferred callback time.');
    return;
  }
  st.step = Math.min(5, st.step + 1);
  App.paintPublicEnquiryStep();
};

App.submitPublicEnquiryForm = async function(e) {
  e.preventDefault();
  const st = App.enquiryState;
  const v = st.values;
  const errBox = document.getElementById('enqSubmitError');
  const btn = document.getElementById('enqSubmitBtn');

  const showErr = (msg) => {
    if (errBox) {
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    } else {
      Utils.toast(msg);
    }
  };

  if (!v.full_name || v.full_name.trim().length < 2) return showErr('Please enter your full name.');
  const digits = String(v.mobile_number || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return showErr('Please enter a valid 10 to 15 digit mobile number.');
  if (!v.city || v.city.trim().length < 2) return showErr('Please enter your current city.');
  if (!v.contact_consent) return showErr('Please accept contact consent to submit your enquiry.');

  const fullPhone = digits.length === 10 ? `${v.country_code}${digits}` : v.mobile_number.trim();
  const hpVal = document.getElementById('enqHpField')?.value || '';

  try {
    if (errBox) errBox.classList.add('hidden');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Submitting...';
    }

    const res = await API.post(`/public/enquiry/${encodeURIComponent(st.token)}/submit`, {
      project_id: v.project_id,
      configuration_id: v.configuration_id || null,
      apartment_size: v.apartment_size,
      budget: v.budget,
      purchase_timeline: v.purchase_timeline,
      preferred_callback_time: v.preferred_callback_time,
      full_name: v.full_name.trim(),
      mobile_number: fullPhone,
      email: v.email.trim(),
      city: v.city.trim(),
      requirements: v.requirements.trim(),
      contact_consent: v.contact_consent,
      session_id: st.sessionId,
      website_url: hpVal
    });

    const conf = res.confirmation || {};
    const meta = st.formMeta || {};
    const selectedProject = (meta.projects || []).find(p => p.id === v.project_id) || (meta.projects || [])[0] || null;
    const headerLogo = selectedProject?.developer_logo || selectedProject?.project_logo || meta.agency_logo || '';
    const headerBrandName = selectedProject?.developer_name || meta.agency_name || 'Prestige Group';

    const publicContainer = document.getElementById('publicViewContainer');
    publicContainer.innerHTML = `
      <div class="public-customer-shell enq-dark-mode">
        <div class="public-customer-wrap enq-wrap-compact">
          <article class="enq-wizard-card">
            <div class="enq-wizard-header">
              ${headerLogo ? `
                <img src="${Utils.escapeHTML(headerLogo)}" alt="${Utils.escapeHTML(headerBrandName)}" class="enq-header-logo" onerror="this.style.display='none'">
              ` : `
                <div class="enq-header-brand-fallback">${Utils.escapeHTML(headerBrandName)}</div>
              `}
              <div class="enq-header-eyebrow">Property enquiry</div>
            </div>
            <div class="enq-wizard-body" style="padding:34px 24px 26px; text-align:center;">
              <div class="enq-done-mark" aria-hidden="true">✓</div>
              <h2 style="font-family:Arial, Helvetica, sans-serif; font-weight:500; margin:0 0 6px; color:#F6F1E7; font-size:28px;">Enquiry received</h2>
              <p style="color:#A29B8D; font-size:14px; margin:0 auto 20px;">
                Your enquiry has been recorded.
              </p>
              <div class="enq-confirm-box">
                <div><span>Reference</span><strong><code>${Utils.escapeHTML(conf.enquiry_ref || '')}</code></strong></div>
                <div><span>Project</span><strong>${Utils.escapeHTML(conf.project_name || v.project_name)}</strong></div>
                <div><span>Size</span><strong>${Utils.escapeHTML(conf.apartment_size || v.apartment_size)}</strong></div>
                <div><span>Advisor</span><strong>${Utils.escapeHTML(conf.advisor_name || 'Property Advisory Desk')}</strong></div>
                <div><span>Call time</span><strong>${Utils.escapeHTML(conf.preferred_callback_time || v.preferred_callback_time)}</strong></div>
              </div>
              <p style="margin:0; font-size:12.5px; color:#847D6F;">Keep the reference number for any follow-up about this enquiry.</p>
            </div>
            <footer class="enq-disclaimer">
              <p>Enquiry form only — not the official developer website.</p>
              <p>Details you submit are stored for this enquiry.</p>
            </footer>
          </article>
        </div>
      </div>
    `;
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
    showErr(err.message || 'Could not submit your enquiry. Please verify your details.');
  }
};
