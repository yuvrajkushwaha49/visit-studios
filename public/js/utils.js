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
    // If the mousedown starts on the overlay backdrop (and not inside the card),
    // and mouseup/click finishes on the overlay backdrop, close modal immediately.
    overlay.onmousedown = (e) => {
      overlay._clickedBackdrop = (e.target === overlay);
    };
    overlay.onclick = (e) => {
      if (overlay._clickedBackdrop && e.target === overlay) {
        Utils.closeModal();
      }
      overlay._clickedBackdrop = false;
    };

    // Close / Cancel icon button placed at top-right corner of modal card
    const closeBtnHtml = `
      <button type="button" class="modal-close-btn" onclick="Utils.closeModal()" aria-label="Close popup" title="Close (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    overlay.innerHTML = `<div class="modal-card">${closeBtnHtml}${htmlContent}</div>`;
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

  // Generates high-res personalized invitation pass card image matching Reference Design
  generateInvitationCard(data) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1400;
      const ctx = canvas.getContext('2d');

      const agencyName = (data.agency_name || 'VISIT STUDIO').toUpperCase();
      const customerName = data.customer_name || 'Valued Client';
      const projectName = data.project_name || 'The Parkview Residences';
      const developerName = (data.developer_name || 'ELITE DEVELOPERS').toUpperCase();
      const shortUrl = data.shortUrl || `${window.location.origin}/i/${data.short_code || ''}`;
      const advisorName = data.advisor_name || 'Amit Verma';
      const advisorPhone = data.advisor_phone || '+91 98765 43210';

      // Parse Date components
      const d = data.visit_date ? new Date(data.visit_date + 'T00:00:00') : new Date();
      const weekday = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'long' }) + ',' : 'Wednesday,';
      const formattedDate = Utils.formatDate(data.visit_date) || '25 Nov 2026';
      const formattedTime = Utils.formatTime(data.visit_time) || '11:00 AM';

      // Location formatting
      let rawLoc = data.location || data.project_location || 'Greater Noida';
      let locationText = rawLoc;
      if (rawLoc.length > 20) {
        const parts = rawLoc.split(',');
        locationText = parts[parts.length - 1].trim();
      }

      // Drawing Routine
      const drawCardContent = (projLogoImg = null, devLogoImg = null, qrImg = null) => {
        // 1. Top Architectural / Brand Logo Mark (Project or Developer Logo)
        const topLogo = projLogoImg || devLogoImg;

        if (topLogo) {
          try {
            const maxW = 160;
            const maxH = 80;
            let w = topLogo.naturalWidth || topLogo.width || maxW;
            let h = topLogo.naturalHeight || topLogo.height || maxH;
            const ratio = Math.min(maxW / w, maxH / h);
            const renderW = Math.max(30, w * ratio);
            const renderH = Math.max(30, h * ratio);
            const drawX = 540 - renderW / 2;
            const drawY = 118 - renderH / 2;

            ctx.save();
            ctx.drawImage(topLogo, drawX, drawY, renderW, renderH);
            ctx.restore();
          } catch (e) {
            drawFallbackBuildingLogo();
          }
        } else {
          drawFallbackBuildingLogo();
        }

        function drawFallbackBuildingLogo() {
          const logoX = 540;
          const logoY = 125;
          ctx.fillStyle = '#102a45';
          ctx.beginPath();
          ctx.moveTo(logoX - 10, logoY - 45);
          ctx.lineTo(logoX - 42, logoY - 25);
          ctx.lineTo(logoX - 42, logoY + 30);
          ctx.lineTo(logoX - 26, logoY + 30);
          ctx.lineTo(logoX - 26, logoY - 8);
          ctx.lineTo(logoX - 10, logoY - 20);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f5ba13';
          ctx.beginPath();
          ctx.moveTo(logoX + 2, logoY - 42);
          ctx.lineTo(logoX + 42, logoY - 18);
          ctx.lineTo(logoX + 42, logoY + 30);
          ctx.lineTo(logoX + 26, logoY + 30);
          ctx.lineTo(logoX + 26, logoY - 4);
          ctx.lineTo(logoX + 2, logoY - 16);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#102a45';
          ctx.fillRect(logoX - 4, logoY - 5, 8, 35);
        }

        // 2. Main Brand Typography: Project Name & Builder
        ctx.textAlign = 'center';
        ctx.fillStyle = '#102a45';
        let titleSize = 34;
        if (projectName.length > 28) titleSize = 25;
        else if (projectName.length > 20) titleSize = 29;
        ctx.font = `bold ${titleSize}px "Inter", "Segoe UI", sans-serif`;
        ctx.fillText(projectName.toUpperCase(), 540, 196);

        ctx.fillStyle = '#1e293b';
        ctx.font = '700 12.5px "Inter", sans-serif';
        const subText = developerName ? `BY ${developerName.toUpperCase()} · PROPERTY VISIT INVITATION` : 'PROPERTY VISIT INVITATION';
        ctx.fillText(subText, 540, 226);

        // 3. Personalized Guest Greeting (Placed on top of invitation lead-in)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText(`Dear ${customerName},`, 540, 292);

        // Lead-in Text with Flanking Yellow Accent Lines (Below Greeting)
        ctx.fillStyle = '#334155';
        ctx.font = '600 19px "Inter", sans-serif';
        ctx.fillText('You are cordially invited for a', 540, 328);

        ctx.strokeStyle = '#f5ba13';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(150, 321);
        ctx.lineTo(320, 321);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(760, 321);
        ctx.lineTo(930, 321);
        ctx.stroke();

        // 4. Hero Title: PROPERTY SITE VISIT
        // Word: PROPERTY
        ctx.fillStyle = '#102a45';
        ctx.font = 'italic 900 76px "Inter", "Arial Black", sans-serif';
        ctx.fillText('PROPERTY', 540, 415);

        // Word: SITE VISIT inside Slanted Golden Banner
        const bannerW = 620;
        const bannerH = 74;
        const bannerX = (1080 - bannerW) / 2;
        const bannerY = 448;
        const skew = 22;

        ctx.fillStyle = '#f5ba13';
        ctx.beginPath();
        ctx.moveTo(bannerX + skew, bannerY);
        ctx.lineTo(bannerX + bannerW, bannerY);
        ctx.lineTo(bannerX + bannerW - skew, bannerY + bannerH);
        ctx.lineTo(bannerX, bannerY + bannerH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#102a45';
        ctx.font = 'italic 900 56px "Inter", "Arial Black", sans-serif';
        ctx.fillText('SITE VISIT', 540, bannerY + 56);

        // 5. Schedule & Location 3-Column Grid
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(395, 585);
        ctx.lineTo(395, 645);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(685, 585);
        ctx.lineTo(685, 645);
        ctx.stroke();

        // --- Column 1: Date ---
        const calX = 95;
        const calY = 590;
        ctx.fillStyle = '#f5ba13';
        ctx.beginPath();
        ctx.roundRect(calX, calY, 48, 48, 8);
        ctx.fill();

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(calX, calY, 48, 14, [8, 8, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(calX + 10, calY - 3, 4, 7);
        ctx.fillRect(calX + 34, calY - 3, 4, 7);

        ctx.fillStyle = '#ffffff';
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            ctx.fillRect(calX + 10 + c * 12, calY + 20 + r * 11, 4, 4);
          }
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = '500 17px "Inter", sans-serif';
        ctx.fillText(weekday, calX + 62, calY + 18);

        ctx.fillStyle = '#0f172a';
        ctx.font = '800 24px "Inter", sans-serif';
        ctx.fillText(formattedDate, calX + 62, calY + 44);

        // --- Column 2: Time ---
        const clockX = 445;
        const clockY = 614;
        ctx.strokeStyle = '#f5ba13';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(clockX, clockY, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#f5ba13';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(clockX, clockY);
        ctx.lineTo(clockX, clockY - 12);
        ctx.moveTo(clockX, clockY);
        ctx.lineTo(clockX + 9, clockY + 3);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 25px "Inter", sans-serif';
        ctx.fillText(formattedTime, clockX + 35, clockY + 8);

        // --- Column 3: Location ---
        const pinX = 725;
        const pinY = 610;
        ctx.fillStyle = '#f5ba13';
        ctx.beginPath();
        ctx.arc(pinX, pinY - 4, 14, Math.PI, 0, false);
        ctx.lineTo(pinX, pinY + 16);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pinX, pinY - 4, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 23px "Inter", sans-serif';
        ctx.fillText(locationText, pinX + 28, pinY + 8);

        // 6. Project Residence Card Box
        const boxX = 85;
        const boxY = 690;
        const boxW = 910;
        const boxH = 135;

        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 20);
        ctx.fill();

        const bldX = boxX + 65;
        const bldY = boxY + 70;

        const boxLogo = devLogoImg || projLogoImg;

        if (boxLogo) {
          try {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(bldX - 42, bldY - 42, 84, 84, 12);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.clip();
            ctx.drawImage(boxLogo, bldX - 38, bldY - 38, 76, 76);
            ctx.restore();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(bldX - 42, bldY - 42, 84, 84, 12);
            ctx.stroke();
          } catch (e) {
            drawBuildingLines();
          }
        } else {
          drawBuildingLines();
        }

        function drawBuildingLines() {
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bldX - 18, bldY + 28);
          ctx.lineTo(bldX - 18, bldY - 26);
          ctx.lineTo(bldX, bldY - 40);
          ctx.lineTo(bldX + 18, bldY - 26);
          ctx.lineTo(bldX + 18, bldY + 28);
          ctx.moveTo(bldX - 32, bldY + 28);
          ctx.lineTo(bldX - 32, bldY - 8);
          ctx.lineTo(bldX - 18, bldY - 18);
          ctx.moveTo(bldX + 18, bldY - 18);
          ctx.lineTo(bldX + 32, bldY - 8);
          ctx.lineTo(bldX + 32, bldY + 28);
          ctx.stroke();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(boxX + 135, boxY + 25);
        ctx.lineTo(boxX + 135, boxY + 110);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = '600 16px "Inter", sans-serif';
        ctx.fillText('Project', boxX + 165, boxY + 45);

        ctx.fillStyle = '#0f172a';
        ctx.font = '800 29px "Inter", sans-serif';
        ctx.letterSpacing = '-0.5px';
        ctx.fillText(projectName, boxX + 165, boxY + 80);

        ctx.fillStyle = '#1e293b';
        ctx.font = '700 14px "Inter", sans-serif';
        ctx.fillText(`BY ${developerName}`, boxX + 165, boxY + 112);

        // 7. Divider Line with Nodes (o————o)
        const nodeY = 880;
        const leftNodeX = 165;
        const rightNodeX = 915;

        ctx.strokeStyle = '#102a45';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(leftNodeX + 10, nodeY);
        ctx.lineTo(rightNodeX - 10, nodeY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#102a45';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(leftNodeX, nodeY, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rightNodeX, nodeY, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 8. Advisor Section
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '600 18px "Inter", sans-serif';
        ctx.fillText('Your Property Advisor', 540, 915);

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 35px "Inter", sans-serif';
        ctx.fillText(advisorName, 540, 955);

        // 9. Golden Phone Pill Button
        const pillW = 390;
        const pillH = 56;
        const pillX = (1080 - pillW) / 2;
        const pillY = 978;

        ctx.fillStyle = '#f5ba13';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 28);
        ctx.fill();

        // Phone handset icon inside pill
        const phX = pillX + 44;
        const phY = pillY + 28;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(phX, phY - 5, 7, Math.PI * 0.7, Math.PI * 1.8);
        ctx.arc(phX + 9, phY + 4, 7, Math.PI * 0.2, Math.PI * 1.3);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = '800 23px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(advisorPhone, 550, pillY + 36);

        // 10. Luxury VIP Entry QR Code Box (Replaced raw link bar)
        if (qrImg) {
          const qrBoxW = 206;
          const qrBoxH = 206;
          const qrBoxX = (1080 - qrBoxW) / 2;
          const qrBoxY = 1060;

          // Crisp white background card with gentle shadow
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = 6;
          ctx.beginPath();
          ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 18);
          ctx.fill();
          ctx.restore();

          // Elegant thin border
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 18);
          ctx.stroke();

          // Draw QR Code centered inside card
          const qrSize = 176;
          const qrX = 540 - qrSize / 2;
          const qrY = qrBoxY + (qrBoxH - qrSize) / 2;
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Visit Verification caption below QR
          ctx.textAlign = 'center';
          ctx.fillStyle = '#102a45';
          ctx.font = '800 15px Arial, sans-serif';
          ctx.fillText('SCAN TO VERIFY SITE VISIT', 540, qrBoxY + qrBoxH + 32);

          ctx.fillStyle = '#64748b';
          ctx.font = '600 12.5px "Inter", sans-serif';
          const cleanDisplayUrl = shortUrl.replace(/^https?:\/\//, '');
          ctx.fillText(cleanDisplayUrl, 540, qrBoxY + qrBoxH + 52);
        }

        // Return final output
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        canvas.toBlob((blob) => {
          const file = new File([blob], `invitation-${customerName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
          resolve({ dataUrl, blob, file, canvas });
        }, 'image/png');
      };

      // Helper function to safely load image with crossOrigin
      const loadImg = (src) => {
        if (!src) return Promise.resolve(null);
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      // Determine QR Code source: use data URL if available, otherwise fetch from /api/qr
      let qrSource = data.qr_code_data;
      if (!qrSource || !qrSource.startsWith('data:image')) {
        const qrPayload = qrSource || data.shortUrl || `${window.location.origin}/i/${data.short_code || ''}`;
        qrSource = `/api/qr?text=${encodeURIComponent(qrPayload)}`;
      }

      // Load background template image (Reference Image 1) & Project/Developer Logos & QR Code
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = async () => {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        try {
          const [pLogo, dLogo, qr] = await Promise.all([
            loadImg(data.project_logo),
            loadImg(data.developer_logo),
            loadImg(qrSource)
          ]);
          drawCardContent(pLogo, dLogo, qr);
        } catch (err) {
          drawCardContent(null, null, null);
        }
      };
      bgImg.onerror = async () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        try {
          const [pLogo, dLogo, qr] = await Promise.all([
            loadImg(data.project_logo),
            loadImg(data.developer_logo),
            loadImg(qrSource)
          ]);
          drawCardContent(pLogo, dLogo, qr);
        } catch (err) {
          drawCardContent(null, null, null);
        }
      };
      bgImg.src = '/images/card-template.jpg';
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
