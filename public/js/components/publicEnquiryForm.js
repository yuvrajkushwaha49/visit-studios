// Public 5-Step Property Enquiry Form Component (Project Logo-Matched Editorial Theme)
App.enquiryLogoColorCache = {};

App.hexToRgb = function(hex) {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return { r: 198, g: 161, b: 91 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

App.buildDarkPaletteFromAccent = function(accentHex, opts = {}) {
  const { r, g, b } = App.hexToRgb(accentHex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const lighten = (amt) => `rgb(${Math.min(255, Math.round(r + (255 - r) * amt))}, ${Math.min(255, Math.round(g + (255 - g) * amt))}, ${Math.min(255, Math.round(b + (255 - b) * amt))})`;
  const tintDark = (ratio, base = 14) => `rgb(${Math.round(base + r * ratio)}, ${Math.round(base + g * ratio)}, ${Math.round(base + b * ratio)})`;
  return {
    pageBg: opts.pageBg || tintDark(0.03, 9),
    glow: opts.glow || `rgba(${r}, ${g}, ${b}, 0.16)`,
    cardBg: opts.cardBg || tintDark(0.05, 14),
    surface: opts.surface || tintDark(0.075, 20),
    footerBg: opts.footerBg || tintDark(0.035, 11),
    border: opts.border || tintDark(0.14, 34),
    borderStrong: opts.borderStrong || tintDark(0.22, 46),
    mastheadBg: opts.mastheadBg || '#FFFFFF',
    mastheadBorder: opts.mastheadBorder || 'rgba(12, 12, 12, 0.08)',
    mastheadText: opts.mastheadText || '#181818',
    eyebrow: opts.eyebrow || '#5E5B55',
    accent: accentHex,
    accentSoft: opts.accentSoft || lighten(0.22),
    accentDim: opts.accentDim || `rgba(${r}, ${g}, ${b}, 0.15)`,
    accentText: opts.accentText || (lum > 0.52 ? '#10120E' : '#FFFFFF'),
    heading: opts.heading || '#F6F4EF',
    text: opts.text || '#EFECE6',
    muted: opts.muted || '#A29D93'
  };
};

App.resolveEnquiryProjectTheme = function(project, meta) {
  const key = `${project?.name || ''} ${project?.developer_name || ''} ${project?.project_logo || ''} ${project?.developer_logo || ''}`.toLowerCase();

  if (key.includes('godrej')) {
    return App.buildDarkPaletteFromAccent('#78BE20', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#4B5E48',
      accentSoft: '#93D63D',
      accentText: '#0B1605',
      cardBg: '#0E1410',
      surface: '#141D17',
      border: '#223327',
      borderStrong: '#304938',
      heading: '#F2F7F2'
    });
  }
  if (key.includes('jacob')) {
    return App.buildDarkPaletteFromAccent('#C42534', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#6B4246',
      accentSoft: '#DC3B4B',
      accentText: '#FFFFFF',
      cardBg: '#130C0D',
      surface: '#1B1113',
      border: '#341F23',
      borderStrong: '#4B2D33',
      heading: '#FBF2F3'
    });
  }
  if (key.includes('trump')) {
    return App.buildDarkPaletteFromAccent('#E2B65E', {
      mastheadBg: '#0D0B08',
      mastheadBorder: 'rgba(226, 182, 94, 0.22)',
      mastheadText: '#E2B65E',
      eyebrow: '#B8A06E',
      accentSoft: '#EECA7E',
      accentText: '#141006',
      pageBg: '#080705',
      cardBg: '#12100B',
      surface: '#1A1610',
      footerBg: '#0D0B08',
      border: '#2F281A',
      borderStrong: '#483E28',
      heading: '#FBF5E8'
    });
  }
  if (key.includes('peridona') || key.includes('crc')) {
    return App.buildDarkPaletteFromAccent('#2EB37B', {
      mastheadBg: '#F3F8F5',
      mastheadText: '#143D2E',
      eyebrow: '#3D6353',
      accentSoft: '#49CA92',
      accentText: '#05170F',
      cardBg: '#0D1512',
      surface: '#131E19',
      footerBg: '#0A110E',
      border: '#1F332B',
      borderStrong: '#2D493E',
      heading: '#F0F7F4'
    });
  }
  if (key.includes('prestige')) {
    return App.buildDarkPaletteFromAccent('#C6A15B', {
      mastheadBg: '#F6F1E7',
      eyebrow: '#6C6355',
      accentSoft: '#DCC08A',
      accentText: '#14110B',
      pageBg: '#0C0C0C',
      cardBg: '#111110',
      surface: '#171614',
      footerBg: '#0E0E0D',
      border: '#2A2723',
      borderStrong: '#3A352D',
      heading: '#F6F1E7'
    });
  }
  if (key.includes('elie') || key.includes('elle saab')) {
    return App.buildDarkPaletteFromAccent('#D4AF37', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#6E5F3E',
      accentText: '#141005'
    });
  }
  if (key.includes('cullinan') || key.includes('the line') || key.includes('m3m')) {
    return App.buildDarkPaletteFromAccent('#1D8FE1', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#3B5670',
      accentText: '#FFFFFF'
    });
  }
  if (key.includes('saya')) {
    return App.buildDarkPaletteFromAccent('#F59E0B', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#1D3C78',
      cardBg: '#0D121D',
      surface: '#131B2A',
      border: '#23324D',
      borderStrong: '#314569'
    });
  }
  if (key.includes('ncr')) {
    return App.buildDarkPaletteFromAccent('#DC2626', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#6E4545',
      accentText: '#FFFFFF'
    });
  }
  if (key.includes('gulshan')) {
    return App.buildDarkPaletteFromAccent('#B68D65', {
      mastheadBg: '#FAF7F2',
      eyebrow: '#6F5842',
      accentText: '#14100B'
    });
  }
  if (key.includes('max') || key.includes('ekanam')) {
    return App.buildDarkPaletteFromAccent('#14B8A6', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#3F635E',
      accentText: '#041715'
    });
  }
  if (key.includes('dlf') || key.includes('camellias')) {
    return App.buildDarkPaletteFromAccent('#E11D48', {
      mastheadBg: '#FFFFFF',
      eyebrow: '#694952',
      accentText: '#FFFFFF'
    });
  }

  const logoUrl = project?.project_logo || project?.developer_logo || meta?.agency_logo || '';
  if (logoUrl && App.enquiryLogoColorCache[logoUrl]) {
    return App.buildDarkPaletteFromAccent(App.enquiryLogoColorCache[logoUrl], { mastheadBg: '#FFFFFF' });
  }
  if (meta?.accent_color && /^#[0-9a-f]{6}$/i.test(meta.accent_color)) {
    return { ...App.buildDarkPaletteFromAccent(meta.accent_color, { mastheadBg: '#F6F1E7' }), isFallback: true };
  }
  return { ...App.buildDarkPaletteFromAccent('#C6A15B', { mastheadBg: '#F6F1E7' }), isFallback: true };
};

App.getEnquiryThemeStyleAttr = function(theme) {
  return [
    `--enq-page-bg:${theme.pageBg}`,
    `--enq-glow:${theme.glow}`,
    `--enq-card-bg:${theme.cardBg}`,
    `--enq-surface:${theme.surface}`,
    `--enq-footer-bg:${theme.footerBg}`,
    `--enq-border:${theme.border}`,
    `--enq-border-strong:${theme.borderStrong}`,
    `--enq-masthead-bg:${theme.mastheadBg}`,
    `--enq-masthead-border:${theme.mastheadBorder}`,
    `--enq-masthead-text:${theme.mastheadText}`,
    `--enq-eyebrow:${theme.eyebrow}`,
    `--enq-accent:${theme.accent}`,
    `--enq-accent-soft:${theme.accentSoft}`,
    `--enq-accent-dim:${theme.accentDim}`,
    `--enq-accent-text:${theme.accentText}`,
    `--enq-heading:${theme.heading}`,
    `--enq-text:${theme.text}`,
    `--enq-muted:${theme.muted}`
  ].join(';');
};

App.maybeExtractEnquiryLogoColor = function(logoUrl) {
  if (!logoUrl || App.enquiryLogoColorCache[logoUrl] !== undefined) return;
  App.enquiryLogoColorCache[logoUrl] = null; // mark in-flight
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const w = 36, h = 36;
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let best = null;
        let bestScore = -1;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 140) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max < 45 || min > 225) continue; // skip pure black & white
          const sat = max === 0 ? 0 : (max - min) / max;
          const score = sat * 2 + (max / 255) * 0.4;
          if (score > bestScore && sat > 0.18) {
            bestScore = score;
            best = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          }
        }
        if (best) {
          App.enquiryLogoColorCache[logoUrl] = best;
          const shell = document.querySelector('.public-customer-shell.enq-dark-mode');
          if (shell && !shell.dataset.curatedTheme) {
            const palette = App.buildDarkPaletteFromAccent(best, { mastheadBg: '#FFFFFF' });
            shell.setAttribute('style', App.getEnquiryThemeStyleAttr(palette));
          }
        }
      } catch (_) {}
    };
    img.src = logoUrl;
  } catch (_) {}
};

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

  const skipProjectStep = Boolean(meta.project_locked && (meta.projects || []).length === 1);
  const totalSteps = skipProjectStep ? 4 : 5;
  const displayStep = skipProjectStep ? Math.max(1, st.step - 1) : st.step;

  const selectedProject = (meta.projects || []).find(p => p.id === v.project_id) || (meta.projects || [])[0] || null;
  const headerLogo = selectedProject?.project_logo || selectedProject?.developer_logo || meta.agency_logo || '';
  const headerBrandName = selectedProject?.name || selectedProject?.developer_name || meta.agency_name || 'Property Enquiry';
  const projectTheme = App.resolveEnquiryProjectTheme(selectedProject, meta);
  const themeStyleAttr = App.getEnquiryThemeStyleAttr(projectTheme);
  if (headerLogo && projectTheme.isFallback) App.maybeExtractEnquiryLogoColor(headerLogo);

  const progressBarHtml = `
    <div class="enq-step-top-row">
      <span>Step ${displayStep} of ${totalSteps}</span>
      <span class="enq-step-name">${stepMeta.tag}</span>
    </div>
    <div class="enq-progress-track">
      <div class="enq-progress-fill" style="width:${(displayStep / totalSteps) * 100}%;"></div>
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
    const budgetOptions = ['₹2 Cr – ₹3.5 Cr', '₹3.5 Cr – ₹5 Cr', '₹5 Cr – ₹8 Cr', '₹8 Cr+'];

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
        ${!skipProjectStep ? `<button type="button" class="enq-back-btn" onclick="App.goEnquiryStep(1)">Back</button>` : ''}
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
    <div class="public-customer-shell enq-dark-mode" style="${themeStyleAttr}">
      <div class="public-customer-wrap enq-wrap-compact">
        <article class="enq-wizard-card">
          <div class="enq-wizard-header">
            ${headerLogo ? `
              <img src="${Utils.escapeHTML(headerLogo)}" alt="${Utils.escapeHTML(headerBrandName)}" class="enq-header-logo" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
              <div class="enq-header-brand-fallback" style="display:none;">${Utils.escapeHTML(headerBrandName)}</div>
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
    const headerLogo = selectedProject?.project_logo || selectedProject?.developer_logo || meta.agency_logo || '';
    const headerBrandName = selectedProject?.name || selectedProject?.developer_name || meta.agency_name || 'Property Enquiry';
    const projectTheme = App.resolveEnquiryProjectTheme(selectedProject, meta);
    const themeStyleAttr = App.getEnquiryThemeStyleAttr(projectTheme);

    const publicContainer = document.getElementById('publicViewContainer');
    publicContainer.innerHTML = `
      <div class="public-customer-shell enq-dark-mode" style="${themeStyleAttr}">
        <div class="public-customer-wrap enq-wrap-compact">
          <article class="enq-wizard-card">
            <div class="enq-wizard-header">
              ${headerLogo ? `
                <img src="${Utils.escapeHTML(headerLogo)}" alt="${Utils.escapeHTML(headerBrandName)}" class="enq-header-logo" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';">
                <div class="enq-header-brand-fallback" style="display:none;">${Utils.escapeHTML(headerBrandName)}</div>
              ` : `
                <div class="enq-header-brand-fallback">${Utils.escapeHTML(headerBrandName)}</div>
              `}
              <div class="enq-header-eyebrow">Property enquiry</div>
            </div>
            <div class="enq-wizard-body" style="padding:34px 24px 26px; text-align:center;">
              <div class="enq-done-mark" aria-hidden="true">✓</div>
              <h2 style="font-family:Arial, Helvetica, sans-serif; font-weight:500; margin:0 0 6px; color:var(--enq-heading); font-size:28px;">Enquiry received</h2>
              <p style="color:var(--enq-muted); font-size:14px; margin:0 auto 20px;">
                Your enquiry has been recorded.
              </p>
              <div class="enq-confirm-box">
                <div><span>Reference</span><strong><code>${Utils.escapeHTML(conf.enquiry_ref || '')}</code></strong></div>
                <div><span>Customer</span><strong>${Utils.escapeHTML(conf.customer_name || v.full_name)}</strong></div>
                <div><span>Mobile</span><strong>${Utils.escapeHTML(conf.customer_mobile || fullPhone)}</strong></div>
                <div><span>Project</span><strong>${Utils.escapeHTML(conf.project_name || v.project_name)}</strong></div>
                <div><span>Size</span><strong>${Utils.escapeHTML(conf.apartment_size || v.apartment_size)}</strong></div>
                <div><span>Advisor</span><strong>${Utils.escapeHTML(conf.advisor_name || 'Property Advisory Desk')}</strong></div>
                <div><span>Advisor No.</span><strong>${conf.advisor_phone ? `<a href="tel:${Utils.escapeHTML(conf.advisor_phone)}" style="color:#DCC08A; text-decoration:none;">${Utils.escapeHTML(conf.advisor_phone)}</a>` : '—'}</strong></div>
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
