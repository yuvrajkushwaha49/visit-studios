// Utility functions
const Utils = {
  toastTimer: null,

  toast(msg, duration = 4000) {
    let el = document.getElementById('globalToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'globalToast';
      el.className = 'toast hidden';
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>●</span> ${this.escapeHTML(msg)}`;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  },

  escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  debounce(func, wait = 120) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const dt = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00+05:30'));
      if (isNaN(dt)) return dateStr;
      return dt.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        const [h, m] = timeStr.split(':');
        const hour = Number(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm} IST`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  },

  getDateBadge(dateStr) {
    if (!dateStr) return { month: 'DATE', day: '—' };
    try {
      const dt = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00+05:30'));
      if (isNaN(dt)) return { month: 'DATE', day: '—' };
      const month = dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
      const day = dt.toLocaleDateString('en-IN', { day: '2-digit' });
      return { month, day };
    } catch {
      return { month: 'DATE', day: '—' };
    }
  },

  generateGoogleCalendarUrl({ title, description, location, dateStr, timeStr, durationMinutes = 60 }) {
    try {
      const start = new Date(`${dateStr}T${timeStr}:00+05:30`);
      const end = new Date(start.getTime() + durationMinutes * 60000);
      const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${stamp(start)}/${stamp(end)}`,
        details: description,
        location: location || '',
        ctz: 'Asia/Kolkata'
      }).toString();
    } catch {
      return '#';
    }
  },

  downloadICS({ id, title, description, location, dateStr, timeStr, durationMinutes = 60 }) {
    try {
      const start = new Date(`${dateStr}T${timeStr}:00+05:30`);
      const end = new Date(start.getTime() + durationMinutes * 60000);
      const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Visit Studio//Property Invitations//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${id || Date.now()}@visit-studio.com`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${title}`,
        `LOCATION:${location || ''}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT60M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Your property site visit is in 1 hour',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-visit-${dateStr}.ics`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      console.error('ICS error:', e);
    }
  },

  showModal(htmlContent) {
    let overlay = document.getElementById('globalModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'globalModalOverlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    // Direct outside backdrop click detection:
    // If user clicks on the backdrop overlay, close modal immediately.
    overlay.onmousedown = (e) => {
      overlay._clickedBackdrop = (e.target === overlay);
    };
    overlay.onclick = (e) => {
      if (e.target === overlay || overlay._clickedBackdrop) {
        Utils.closeModal();
      }
      overlay._clickedBackdrop = false;
    };

    // Close / Cancel icon button pinned at top-right corner of modal card
    const closeBtnHtml = `
      <button type="button" class="modal-close-btn" onclick="Utils.closeModal()" aria-label="Close popup" title="Close (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    overlay.innerHTML = `<div class="modal-card">${closeBtnHtml}<div class="modal-scroll-body">${htmlContent}</div></div>`;
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  closeModal() {
    const overlay = document.getElementById('globalModalOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    }
    document.body.classList.remove('modal-open');
  },

  searchableSelects: new Map(),

  setupSearchableSelect(selectId, searchPlaceholder = 'Search options...') {
    const select = typeof selectId === 'string' ? document.getElementById(selectId) : selectId;
    if (!select) return;

    const id = select.id;
    // Remove existing wrapper if present
    const existing = document.getElementById(`searchable_wrap_${id}`);
    if (existing) {
      existing.remove();
    }

    // Keep native select hidden in DOM for accessibility, validation & form data
    select.style.display = 'none';

    // Create custom wrapper
    const wrapper = document.createElement('div');
    wrapper.id = `searchable_wrap_${id}`;
    wrapper.className = 'searchable-select-container';

    const selectedOpt = select.options[select.selectedIndex] || select.options[0];
    const initialText = selectedOpt ? selectedOpt.text : 'Select an option...';

    wrapper.innerHTML = `
      <button type="button" class="searchable-select-trigger" id="searchable_btn_${id}" aria-expanded="false">
        <span class="searchable-select-val">${this.escapeHTML(initialText)}</span>
        <svg class="searchable-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="searchable-dropdown-panel hidden" id="searchable_panel_${id}">
        <div class="searchable-search-box">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="searchable-search-input" placeholder="${this.escapeHTML(searchPlaceholder)}" autocomplete="off" spellcheck="false">
          <button type="button" class="searchable-clear-btn hidden" title="Clear">×</button>
        </div>
        <div class="searchable-options-list" id="searchable_list_${id}"></div>
      </div>
    `;

    select.parentNode.insertBefore(wrapper, select.nextSibling);

    const trigger = wrapper.querySelector('.searchable-select-trigger');
    const panel = wrapper.querySelector('.searchable-dropdown-panel');
    const searchInput = wrapper.querySelector('.searchable-search-input');
    const clearBtn = wrapper.querySelector('.searchable-clear-btn');
    const list = wrapper.querySelector('.searchable-options-list');

    const renderOptions = (filterText = '') => {
      const term = filterText.trim().toLowerCase();
      const opts = Array.from(select.options);
      if (opts.length === 0) {
        list.innerHTML = `<div class="searchable-no-results">No options available</div>`;
        return;
      }
      const filtered = opts.filter(o => {
        if (!term) return true;
        return o.text.toLowerCase().includes(term);
      });

      if (filtered.length === 0) {
        list.innerHTML = `<div class="searchable-no-results">No options match "${this.escapeHTML(filterText)}"</div>`;
        return;
      }

      list.innerHTML = filtered.map(opt => {
        const isSelected = opt.value === select.value;
        return `
          <div class="searchable-option ${isSelected ? 'selected' : ''}" data-value="${this.escapeHTML(opt.value)}">
            <span>${this.escapeHTML(opt.text)}</span>
            ${isSelected ? `
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : ''}
          </div>
        `;
      }).join('');

      list.querySelectorAll('.searchable-option').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = el.getAttribute('data-value');
          select.value = val;
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === val) {
              select.selectedIndex = i;
              break;
            }
          }
          trigger.querySelector('.searchable-select-val').textContent = select.options[select.selectedIndex]?.text || '';
          closePanel();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    };

    const openPanel = () => {
      document.querySelectorAll('.searchable-dropdown-panel:not(.hidden)').forEach(p => {
        if (p !== panel) p.classList.add('hidden');
      });
      document.querySelectorAll('.searchable-select-trigger.active').forEach(t => {
        if (t !== trigger) t.classList.remove('active');
      });

      panel.classList.remove('hidden');
      trigger.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      renderOptions('');
      setTimeout(() => searchInput.focus(), 50);
    };

    const closePanel = () => {
      panel.classList.add('hidden');
      trigger.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (panel.classList.contains('hidden')) {
        openPanel();
      } else {
        closePanel();
      }
    });

    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      clearBtn.classList.toggle('hidden', !val);
      renderOptions(val);
    });

    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      renderOptions('');
      searchInput.focus();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        closePanel();
      }
    });

    Utils.searchableSelects.set(id, {
      refresh() {
        const currentOpt = select.options[select.selectedIndex];
        const valSpan = trigger.querySelector('.searchable-select-val');
        if (valSpan) {
          valSpan.textContent = currentOpt ? currentOpt.text : 'Select an option...';
        }
        renderOptions('');
      },
      setValue(val) {
        select.value = val;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value === val) {
            select.selectedIndex = i;
            break;
          }
        }
        this.refresh();
      }
    });

    renderOptions('');
  },

  // 6 Luxury Project Themes matching Reference Images 1-12
  INVITATION_THEMES: {
    purple_elie_saab: {
      id: 'purple_elie_saab',
      name: 'Royal Purple (Smart World · Elie Saab)',
      bgImage: '/images/templates/theme_purple_elie_saab.jpg',
      isDark: true,
      brandDefault: 'SMART WORLD',
      projectDefault: 'ELIE SAAB',
      footerDefault: 'BY SMART WORLD INDIA',
      brandColor: '#dfba73',
      titleColor: '#dfba73',
      titleGrad: ['#e2c079', '#faebd0', '#dfba73'],
      subtitleColor: '#bfa36f',
      guestColor: '#faebd0',
      inviteTextColor: '#dfcaa0',
      projectHighlightColor: '#faebd0',
      dateColor: '#faebd0',
      timeColor: '#faebd0',
      locationColor: '#faebd0',
      advisorLabelColor: '#b8a176',
      advisorNameColor: '#faebd0',
      advisorPhoneColor: '#e5ce9f',
      footerColor: '#9e875e',
      shadowColor: 'rgba(223, 186, 115, 0.45)',
      cardBorderCss: '#3a103c',
      keywords: ['elie', 'saab', 'elle saab', 'smart world', 'purple', 'plum']
    },
    green_monarch: {
      id: 'green_monarch',
      name: 'Emerald Green (NCR · Monarch)',
      bgImage: '/images/templates/theme_green_monarch.jpg',
      isDark: true,
      brandDefault: 'NCR',
      projectDefault: 'MONARCH',
      footerDefault: 'BY M3M INDIA',
      brandColor: '#dfba73',
      titleColor: '#dfba73',
      titleGrad: ['#e2c079', '#faebd0', '#dfba73'],
      subtitleColor: '#bfa36f',
      guestColor: '#faebd0',
      inviteTextColor: '#dfcaa0',
      projectHighlightColor: '#faebd0',
      dateColor: '#faebd0',
      timeColor: '#faebd0',
      locationColor: '#faebd0',
      advisorLabelColor: '#b8a176',
      advisorNameColor: '#faebd0',
      advisorPhoneColor: '#e5ce9f',
      footerColor: '#9e875e',
      shadowColor: 'rgba(223, 186, 115, 0.45)',
      cardBorderCss: '#1b4332',
      keywords: ['monarch', 'cullinan', 'green', 'emerald', 'ncr']
    },
    blue_hummingbird: {
      id: 'blue_hummingbird',
      name: 'Royal Navy Blue (Gulshan · Hummingbird)',
      bgImage: '/images/templates/theme_blue_hummingbird.jpg',
      isDark: true,
      brandDefault: 'GULSHAN',
      projectDefault: 'HUMMINGBIRD',
      footerDefault: 'BY GULSHAN INDIA',
      brandColor: '#dfba73',
      titleColor: '#dfba73',
      titleGrad: ['#e2c079', '#faebd0', '#dfba73'],
      subtitleColor: '#bfa36f',
      guestColor: '#faebd0',
      inviteTextColor: '#dfcaa0',
      projectHighlightColor: '#faebd0',
      dateColor: '#faebd0',
      timeColor: '#faebd0',
      locationColor: '#faebd0',
      advisorLabelColor: '#b8a176',
      advisorNameColor: '#faebd0',
      advisorPhoneColor: '#e5ce9f',
      footerColor: '#9e875e',
      shadowColor: 'rgba(223, 186, 115, 0.45)',
      cardBorderCss: '#0b2545',
      keywords: ['hummingbird', 'gulshan', 'blue', 'navy', 'sapphire']
    },
    ivory_trump: {
      id: 'ivory_trump',
      name: 'Champagne Ivory Silk (M3M · Trump)',
      bgImage: '/images/templates/theme_ivory_trump.jpg',
      isDark: false, // Light silk background with luxury rich mocha espresso typography
      brandDefault: 'M3M',
      projectDefault: 'TRUMP',
      footerDefault: 'BY M3M INDIA',
      brandColor: '#4a3319',
      titleColor: '#4a3319',
      titleGrad: ['#634524', '#3d2813', '#634524'],
      subtitleColor: '#7b5a34',
      guestColor: '#3d2813',
      inviteTextColor: '#5c4022',
      projectHighlightColor: '#3d2813',
      dateColor: '#442f17',
      timeColor: '#442f17',
      locationColor: '#442f17',
      advisorLabelColor: '#7b5a34',
      advisorNameColor: '#3d2813',
      advisorPhoneColor: '#5c4022',
      footerColor: '#7b5a34',
      shadowColor: 'rgba(74, 51, 25, 0.20)',
      cardBorderCss: '#d4af37',
      keywords: ['trump', 'ivory', 'silk', 'champagne', 'cream']
    },
    black_ekanam: {
      id: 'black_ekanam',
      name: 'Midnight Onyx (Great Value · Ekanam)',
      bgImage: '/images/templates/theme_black_ekanam.jpg',
      isDark: true,
      brandDefault: 'GREAT VALUE',
      projectDefault: 'EKANAM',
      footerDefault: 'BY GREAT VALUE INDIA',
      brandColor: '#dfba73',
      titleColor: '#dfba73',
      titleGrad: ['#e2c079', '#faebd0', '#dfba73'],
      subtitleColor: '#bfa36f',
      guestColor: '#faebd0',
      inviteTextColor: '#dfcaa0',
      projectHighlightColor: '#faebd0',
      dateColor: '#faebd0',
      timeColor: '#faebd0',
      locationColor: '#faebd0',
      advisorLabelColor: '#b8a176',
      advisorNameColor: '#faebd0',
      advisorPhoneColor: '#e5ce9f',
      footerColor: '#9e875e',
      shadowColor: 'rgba(223, 186, 115, 0.45)',
      cardBorderCss: '#1a1a1a',
      keywords: ['ekanam', 'great value', 'black', 'onyx']
    },
    bronze_rajnagar: {
      id: 'bronze_rajnagar',
      name: 'Warm Bronze (Saya · Rajnagar)',
      bgImage: '/images/templates/theme_bronze_rajnagar.jpg',
      isDark: true,
      brandDefault: 'SAYA',
      projectDefault: 'RAJNAGAR',
      footerDefault: 'BY SAYA INDIA',
      brandColor: '#dfba73',
      titleColor: '#dfba73',
      titleGrad: ['#e2c079', '#faebd0', '#dfba73'],
      subtitleColor: '#bfa36f',
      guestColor: '#faebd0',
      inviteTextColor: '#dfcaa0',
      projectHighlightColor: '#faebd0',
      dateColor: '#faebd0',
      timeColor: '#faebd0',
      locationColor: '#faebd0',
      advisorLabelColor: '#b8a176',
      advisorNameColor: '#faebd0',
      advisorPhoneColor: '#e5ce9f',
      footerColor: '#9e875e',
      shadowColor: 'rgba(223, 186, 115, 0.45)',
      cardBorderCss: '#4a2e18',
      keywords: ['rajnagar', 'saya', 'bronze', 'coffee', 'leather']
    }
  },

  // Resolve matching theme for project/developer
  getInvitationTheme(projectName = '', developerName = '', manualThemeId = '') {
    if (manualThemeId && manualThemeId !== 'auto' && this.INVITATION_THEMES[manualThemeId]) {
      return this.INVITATION_THEMES[manualThemeId];
    }
    const combined = `${projectName || ''} ${developerName || ''}`.toLowerCase();

    if (combined.includes('elie') || combined.includes('saab') || combined.includes('elle saab') || combined.includes('smart world') || combined.includes('purple')) {
      return this.INVITATION_THEMES.purple_elie_saab;
    }
    if (combined.includes('trump') || combined.includes('ivory') || combined.includes('silk') || combined.includes('champagne')) {
      return this.INVITATION_THEMES.ivory_trump;
    }
    if (combined.includes('hummingbird') || combined.includes('gulshan') || combined.includes('blue') || combined.includes('navy')) {
      return this.INVITATION_THEMES.blue_hummingbird;
    }
    if (combined.includes('ekanam') || combined.includes('great value') || combined.includes('black') || combined.includes('onyx')) {
      return this.INVITATION_THEMES.black_ekanam;
    }
    if (combined.includes('rajnagar') || combined.includes('saya') || combined.includes('bronze') || combined.includes('coffee')) {
      return this.INVITATION_THEMES.bronze_rajnagar;
    }
    if (combined.includes('monarch') || combined.includes('cullinan') || combined.includes('ncr') || combined.includes('green') || combined.includes('emerald')) {
      return this.INVITATION_THEMES.green_monarch;
    }
    return this.INVITATION_THEMES.green_monarch;
  },

  // Cleans brand/developer name for punchy top header matching references
  cleanBrandName(devName, fallback = 'NCR') {
    let raw = (devName || fallback || 'NCR').trim();
    raw = raw.replace(/\b(Group|Homz|Properties|Pvt|Ltd|India|LLP|Realty)\b/gi, '').trim();
    if (!raw) raw = fallback || 'NCR';
    return raw.toUpperCase();
  },

  // Cleans project title for luxury display matching references
  cleanProjectTitle(projName, fallback = 'MONARCH') {
    let clean = (projName || fallback || 'MONARCH').trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      clean = parts[parts.length - 1].trim();
    }
    clean = clean.replace(/^(Saya|NCR|Gulshan|M3M|Smart World|Great Value)\s*[-:]?\s*/i, '').trim();
    if (/elie|saab/i.test(clean)) return 'ELIE SAAB';
    if (/monarch/i.test(clean)) return 'MONARCH';
    if (/hummingbird/i.test(clean)) return 'HUMMINGBIRD';
    if (/trump/i.test(clean)) return 'TRUMP';
    if (/ekanam/i.test(clean)) return 'EKANAM';
    if (/rajnagar/i.test(clean)) return 'RAJNAGAR';
    return clean.toUpperCase();
  },

  // Personalized viewing line highlight (e.g. "Smart World Elie Saab", "M3M The Cullinan")
  getProjectHighlight(projName = '', devName = '') {
    const rawProj = (projName || '').toLowerCase();
    if (rawProj.includes('elie') || rawProj.includes('saab')) return 'Smart World Elie Saab';
    if (rawProj.includes('cullinan') || rawProj.includes('monarch')) return 'M3M The Cullinan';
    if (rawProj.includes('hummingbird')) return 'Gulshan Hummingbird';
    if (rawProj.includes('trump')) return 'Trump Towers';
    if (rawProj.includes('ekanam')) return 'Great Value Ekanam';
    if (rawProj.includes('rajnagar')) return 'SAYA Rajnagar';

    const dClean = this.cleanBrandName(devName, '');
    const pClean = (projName || '').replace(/^(Saya|NCR|Gulshan|M3M|Smart World|Great Value)\s*[-:]?\s*/i, '').trim();
    if (dClean && !pClean.toLowerCase().includes(dClean.toLowerCase())) {
      return `${dClean} ${pClean}`;
    }
    return pClean || projName || 'Exclusive Property Residence';
  },

  // Generates high-res personalized invitation pass card image matching Reference Design 1-12
  generateInvitationCard(data) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 819;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // Resolve theme dynamically based on project name, developer, or explicit override
      const theme = Utils.getInvitationTheme(data.project_name, data.developer_name, data.theme_id || data.theme);

      const customerName = data.customer_name || 'Valued Client';
      const rawProject = data.project_name || theme.projectDefault;
      const rawDeveloper = data.developer_name || theme.brandDefault;

      const brandText = Utils.cleanBrandName(rawDeveloper, theme.brandDefault);
      const projectTitle = Utils.cleanProjectTitle(rawProject, theme.projectDefault);
      const projectHighlight = Utils.getProjectHighlight(rawProject, rawDeveloper);

      const shortUrl = data.shortUrl || `${window.location.origin}/i/${data.short_code || ''}`;
      const advisorName = data.advisor_name || 'Karan Verma';
      const advisorPhone = data.advisor_phone || '+91 98111 22334';

      // Parse Date components
      const d = data.visit_date ? new Date(data.visit_date + 'T00:00:00') : new Date();
      const weekday = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'long' }) : 'Wednesday';
      const formattedDate = Utils.formatDate(data.visit_date) || '18 Nov 2026';
      const formattedTime = Utils.formatTime(data.visit_time) || '11:30 AM';

      // Location formatting (clean city or venue name)
      let rawLoc = data.location || data.project_location || 'Noida';
      let locationText = rawLoc;
      if (rawLoc.includes(',')) {
        const parts = rawLoc.split(',');
        locationText = parts[parts.length - 1].trim();
      }
      if (!locationText || locationText.length < 2) locationText = 'Noida';

      // Footer developer branding
      let footerDev = brandText;
      if (/elie|saab/i.test(projectTitle)) footerDev = 'SMART WORLD';
      else if (/hummingbird/i.test(projectTitle)) footerDev = 'GULSHAN';
      else if (/ekanam/i.test(projectTitle)) footerDev = 'GREAT VALUE';
      else if (/rajnagar/i.test(projectTitle)) footerDev = 'SAYA';
      else if (/trump/i.test(projectTitle) || /monarch/i.test(projectTitle) || /cullinan/i.test(rawProject)) footerDev = 'M3M';
      const footerText = `BY ${footerDev} INDIA`;

      // Helper function to draw letter-spaced text with perfect centered alignment
      function drawLetterSpaced(text, centerX, y, letterSpacing) {
        ctx.textAlign = 'left';
        let totalW = 0;
        for (let i = 0; i < text.length; i++) {
          totalW += ctx.measureText(text[i]).width;
          if (i < text.length - 1) totalW += letterSpacing;
        }
        let curX = centerX - totalW / 2;
        for (let i = 0; i < text.length; i++) {
          ctx.fillText(text[i], curX, y);
          curX += ctx.measureText(text[i]).width + letterSpacing;
        }
      }

      // Drawing Routine matching Reference Images 1-12 (Pure luxury typography without image logos)
      const drawCardContent = () => {
        // 1. Top Brand / Developer Header (matching reference e.g. "SMART WORLD", "NCR", "GULSHAN", "M3M", "SAYA", "GREAT VALUE", "GODREJ")
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.brandColor;
        ctx.font = 'bold 36px "Cinzel", "Playfair Display", Georgia, serif';
        if (theme.isDark) {
          ctx.shadowColor = theme.shadowColor;
          ctx.shadowBlur = 10;
        }
        ctx.fillText(brandText.slice(0, 18), 410, 142);
        ctx.restore();

        // 2. Main Project Title (e.g. "ELIE SAAB", "MONARCH", "HUMMINGBIRD", "TRUMP", "EKANAM", "RAJNAGAR")
        ctx.save();
        ctx.textAlign = 'center';
        let projFontSize = 46;
        if (projectTitle.length > 22) projFontSize = 32;
        else if (projectTitle.length > 15) projFontSize = 38;

        ctx.font = `700 ${projFontSize}px "Cinzel", "Playfair Display", Georgia, serif`;
        if (theme.isDark) {
          const goldGrad = ctx.createLinearGradient(230, 210, 590, 255);
          goldGrad.addColorStop(0, theme.titleGrad[0]);
          goldGrad.addColorStop(0.5, theme.titleGrad[1]);
          goldGrad.addColorStop(1, theme.titleGrad[2]);
          ctx.fillStyle = goldGrad;
          ctx.shadowColor = theme.shadowColor;
          ctx.shadowBlur = 14;
        } else {
          // Rich mocha bronze for Ivory Trump silk template
          const mochaGrad = ctx.createLinearGradient(230, 210, 590, 255);
          mochaGrad.addColorStop(0, theme.titleGrad[0]);
          mochaGrad.addColorStop(0.5, theme.titleGrad[1]);
          mochaGrad.addColorStop(1, theme.titleGrad[2]);
          ctx.fillStyle = mochaGrad;
          ctx.shadowColor = theme.shadowColor;
          ctx.shadowBlur = 4;
        }
        ctx.fillText(projectTitle, 410, 245);
        ctx.restore();

        // 3. Subtitle ("AN EXCLUSIVE INVITATION" in reference)
        ctx.save();
        ctx.fillStyle = theme.subtitleColor;
        ctx.font = '600 12.5px "Cinzel", "Inter", sans-serif';
        drawLetterSpaced('AN EXCLUSIVE INVITATION', 410, 282, 3.5);
        ctx.restore();

        // 4. Personalized Guest Greeting & Viewing Invitation
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.guestColor;
        ctx.font = '500 21px "Playfair Display", Georgia, serif';
        ctx.fillText(`Dear ${customerName},`, 410, 395);

        ctx.fillStyle = theme.inviteTextColor;
        ctx.font = '400 18px "Playfair Display", Georgia, serif';
        ctx.fillText('You are cordially invited to a private viewing of', 410, 432);

        ctx.fillStyle = theme.projectHighlightColor;
        ctx.font = '600 22px "Playfair Display", Georgia, serif';
        ctx.fillText(projectHighlight, 410, 468);
        ctx.restore();

        // 5. Date, Time & City Block
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.dateColor;
        ctx.font = '500 21px "Playfair Display", Georgia, serif';
        ctx.fillText(`${weekday}, ${formattedDate}`, 410, 565);

        ctx.fillStyle = theme.timeColor;
        ctx.font = '500 20px "Playfair Display", Georgia, serif';
        const cleanTime = (formattedTime || '11:30 AM').replace(/\s*IST\s*$/i, '').trim();
        ctx.fillText(`${cleanTime} IST`, 410, 602);

        ctx.fillStyle = theme.locationColor;
        ctx.font = '500 20px "Playfair Display", Georgia, serif';
        ctx.fillText(locationText, 410, 638);
        ctx.restore();

        // 6. Property Advisor Block
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.advisorLabelColor;
        ctx.font = '400 14px "Playfair Display", Georgia, serif';
        ctx.fillText('Your Property Adviser', 410, 735);

        ctx.fillStyle = theme.advisorNameColor;
        ctx.font = '600 24px "Playfair Display", Georgia, serif';
        ctx.fillText(advisorName, 410, 770);

        ctx.fillStyle = theme.advisorPhoneColor;
        ctx.font = '500 18px "Playfair Display", Georgia, serif';
        ctx.fillText(advisorPhone, 410, 804);
        ctx.restore();

        // 7. Footer ("BY [DEVELOPER] INDIA" in reference)
        ctx.save();
        ctx.fillStyle = theme.footerColor;
        ctx.font = '600 12px "Cinzel", "Inter", sans-serif';
        drawLetterSpaced(footerText, 410, 905, 3.0);
        ctx.restore();

        // Return final output
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        canvas.toBlob((blob) => {
          const file = new File([blob], `invitation-${customerName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
          resolve({ dataUrl, blob, file, canvas, theme });
        }, 'image/png');
      };

      // Load matching project background template image (1 of 6 blank luxury backgrounds)
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        drawCardContent();
      };

      bgImg.onerror = () => {
        // High-end CSS fallback rendering corresponding luxury frame if image file is missing
        ctx.fillStyle = theme.isDark ? (theme.cardBorderCss || '#0b162c') : '#f8f4ec';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Elegant gold/mocha rectangular frame
        ctx.strokeStyle = theme.isDark ? '#c5a059' : '#8c6d48';
        ctx.lineWidth = 2;
        ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);

        // Subtle inner border
        ctx.strokeStyle = theme.isDark ? 'rgba(197, 160, 89, 0.4)' : 'rgba(140, 109, 72, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

        drawCardContent();
      };

      bgImg.src = theme.bgImage;
    });
  },

  downloadDataUrl(dataUrl, filename = 'invitation-pass.png') {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async copyImageToClipboard(blob) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        Utils.toast('Invitation card image copied to clipboard! Paste directly into WhatsApp Web (Ctrl+V).');
        return true;
      } else {
        Utils.toast('Clipboard image copy not supported in this browser. Please use Download Image.');
        return false;
      }
    } catch (err) {
      Utils.toast('Could not copy image: ' + err.message);
      return false;
    }
  }
};

// Global click & escape listeners for searchable dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchable-select-container')) {
    document.querySelectorAll('.searchable-dropdown-panel:not(.hidden)').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.searchable-select-trigger.active').forEach(t => t.classList.remove('active'));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close any open modals
    const overlay = document.getElementById('globalModalOverlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      Utils.closeModal();
    }
    // Close any open searchable dropdowns
    document.querySelectorAll('.searchable-dropdown-panel:not(.hidden)').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.searchable-select-trigger.active').forEach(t => t.classList.remove('active'));
  }
});

window.Utils = Utils;
