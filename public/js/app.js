// Visit Studio Application Core
const App = {
  currentUser: null,
  activePage: 'dashboard',
  cache: {
    projects: [],
    developers: [],
    associates: [],
    salesHeads: []
  },

  async init() {
    // 1. Check if public enquiry token exists in query (?enquiry=token) or hash (#enquiry=token)
    const urlParams = new URLSearchParams(window.location.search);
    const queryEnquiry = urlParams.get('enquiry');
    const hashEnquiry = window.location.hash.startsWith('#enquiry=') ? window.location.hash.replace('#enquiry=', '').trim() : null;
    const enquiryToken = queryEnquiry || hashEnquiry;

    if (enquiryToken) {
      document.body.classList.add('public-mode');
      return this.renderPublicEnquiry(enquiryToken);
    }

    // 2. Check if public invitation token exists in query (?invite=token) or hash (#invite=token)
    const queryInvite = urlParams.get('invite');
    const hashInvite = window.location.hash.startsWith('#invite=') ? window.location.hash.replace('#invite=', '').trim() : null;
    const inviteToken = queryInvite || hashInvite;

    if (inviteToken) {
      document.body.classList.add('public-mode');
      return this.renderPublicInvitation(inviteToken);
    }

    // 2. Check if feedback id exists in query (?feedback=id) or hash (#feedback=id)
    const queryFeedback = urlParams.get('feedback');
    const hashFeedback = window.location.hash.startsWith('#feedback=') ? window.location.hash.replace('#feedback=', '').trim() : null;
    const feedbackId = queryFeedback || hashFeedback;

    if (feedbackId) {
      document.body.classList.add('public-mode');
      return this.renderPublicFeedback(feedbackId);
    }

    // 3. Check if password reset token exists in query (?reset_token=token) or hash (#reset_token=token)
    const queryReset = urlParams.get('reset_token');
    const hashReset = window.location.hash.startsWith('#reset_token=') ? window.location.hash.replace('#reset_token=', '').trim() : null;
    const resetToken = queryReset || hashReset;

    if (resetToken) {
      document.body.classList.add('public-mode');
      return this.renderResetPasswordScreen(resetToken);
    }

    // 4. Authenticate staff user session
    document.body.classList.remove('public-mode');
    const user = API.getUser();
    const token = API.getToken();

    if (!token || !user) {
      return this.renderLoginScreen();
    }

    this.currentUser = user;
    this.renderShell();
    this.navigate(this.activePage);

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      if (window.location.hash.startsWith('#invite=')) {
        document.body.classList.add('public-mode');
        this.renderPublicInvitation(window.location.hash.replace('#invite=', '').trim());
      } else if (!window.location.hash) {
        document.body.classList.remove('public-mode');
        document.getElementById('publicViewContainer').classList.add('hidden');
        document.getElementById('appShell').classList.remove('hidden');
      }
    });
  },

  // Dedicated Luxury Split-Screen Login Screen
  renderLoginScreen() {
    document.body.classList.remove('public-mode');
    document.body.classList.add('auth-mode');
    const mobNav = document.getElementById('mobileBottomNav');
    if (mobNav) {
      mobNav.classList.add('hidden');
      mobNav.style.setProperty('display', 'none', 'important');
    }
    const shell = document.getElementById('appShell');
    shell.classList.remove('hidden');
    shell.style.removeProperty('display');
    shell.style.removeProperty('height');
    shell.style.removeProperty('min-height');
    shell.style.removeProperty('margin');
    shell.style.removeProperty('padding');
    shell.classList.add('auth-mode');
    shell.innerHTML = `
      <div class="auth-viewport">
        <div class="auth-container-box">
          
          <!-- Left Showcase Panel -->
          <div class="auth-showcase-panel">
            <div class="auth-showcase-content">
              <div class="auth-brand-lockup">
                <div class="auth-brand-logo">
                  <span>V</span>
                </div>
                <div>
                  <div class="auth-brand-title">VISIT STUDIO</div>
                  <span class="auth-brand-subtitle">Invitation Meeting Portal</span>
                </div>
              </div>

              <h2 class="auth-hero-heading">Track Property Invitations & Client Meetings</h2>
              <p class="auth-hero-desc">
                Centralized management system to coordinate client property invitations, schedule on-ground meetings, track daily visits, and record verified customer follow-ups.
              </p>

              <div class="auth-features-list">
                <div class="auth-feat-item">
                  <div class="auth-feat-icon">📅</div>
                  <div class="auth-feat-text">
                    <strong>Invitation & Meeting Scheduling</strong>
                    <span>Generate digital meeting invitations and schedule client site visits seamlessly.</span>
                  </div>
                </div>

                <div class="auth-feat-item">
                  <div class="auth-feat-icon">📍</div>
                  <div class="auth-feat-text">
                    <strong>Meeting Attendance & Verification</strong>
                    <span>Verify client arrival and completed property walkthroughs on-ground.</span>
                  </div>
                </div>

                <div class="auth-feat-item">
                  <div class="auth-feat-icon">👥</div>
                  <div class="auth-feat-text">
                    <strong>Team Coordination & Reports</strong>
                    <span>Complete management visibility into scheduled meetings, visit counts, and customer pipeline.</span>
                  </div>
                </div>
              </div>
            </div>

            
          </div>

          <!-- Right Form Panel -->
          <div class="auth-form-panel">
            <div class="auth-form-inner">
              <div class="auth-header-top">
                <div class="auth-status-chip">
                  <span class="auth-pulse-dot"></span>
                  <span>INVITATION MEETING PORTAL</span>
                </div>
              </div>

              <h1 class="auth-form-title">Member Sign In</h1>
              <p class="auth-form-subtitle">Enter your official credentials to access the Invitation Meeting Portal.</p>

              <form id="loginForm" onsubmit="App.handleLoginSubmit(event)">
                <div class="auth-input-group">
                  <label for="loginEmail">
                    <span>Work Email Address</span>
                  </label>
                  <div class="auth-input-wrapper">
                    <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <input type="email" id="loginEmail" required placeholder="name@company.com" autocomplete="email">
                  </div>
                </div>

                <div class="auth-input-group">
                  <label for="loginPassword">
                    <span>Account Password</span>
                    <a href="javascript:void(0)" onclick="App.showForgotPasswordModal()" class="auth-forgot-link">Forgot password?</a>
                  </label>
                  <div class="auth-input-wrapper">
                    <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input type="password" id="loginPassword" required placeholder="Enter your password" autocomplete="current-password">
                    <button type="button" class="auth-pwd-toggle" onclick="App.toggleLoginPassword()" title="Show/Hide Password" aria-label="Toggle password visibility">
                      <svg id="pwdEyeIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="auth-options-row">
                  <label class="auth-remember-checkbox">
                    <input type="checkbox" id="loginRemember" checked>
                    <span>Keep me signed in on this device</span>
                  </label>
                </div>

                <button type="submit" id="loginSubmitBtn" class="auth-submit-btn">
                  <span>Sign In to Dashboard</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </form>

              <!-- Enterprise Trust & Security Badges -->
              <div class="auth-trust-strip">
                <div class="auth-trust-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <span>Daily Visit Logs</span>
                </div>
                <div class="auth-trust-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Role-Based Access</span>
                </div>
                <div class="auth-trust-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>Activity Reports</span>
                </div>
              </div>
            </div>

            <div class="auth-footer-bottom">
              <span>Authorized sales & management personnel only. Need help? Contact <a href="mailto:support@visitstudio.com" class="auth-support-link">support@visitstudio.com</a></span>
              <div class="auth-copyright">© 2026 Visit Studio. All rights reserved.</div>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  toggleLoginPassword() {
    const input = document.getElementById('loginPassword');
    const eye = document.getElementById('pwdEyeIcon');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (eye) {
        eye.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
      }
    } else {
      input.type = 'password';
      if (eye) {
        eye.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    }
  },

  showForgotPasswordModal() {
    const currentTypedEmail = document.getElementById('loginEmail')?.value || '';

    const html = `
      <div style="text-align: left; padding: 4px 0;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <div style="width:42px; height:42px; border-radius:10px; background:rgba(37,99,235,0.1); color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:20px;">
            🔑
          </div>
          <div>
            <h3 style="font-size:18px; font-weight:700; color:var(--ink); margin:0;">Forgot Password</h3>
            <p style="font-size:12.5px; color:var(--muted); margin:3px 0 0;">Receive temporary login key & reset link by email</p>
          </div>
        </div>

        <p style="font-size:13px; color:var(--muted); line-height:1.5; margin-bottom:18px;">
          Enter your registered work email address (or mobile number). We will immediately dispatch a password reset link and a temporary login password directly to your inbox.
        </p>

        <form id="forgotPasswordForm" onsubmit="App.handleForgotPasswordSubmit(event)">
          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:12px; font-weight:600; color:var(--ink); margin-bottom:6px;">Registered Work Email / Phone</label>
            <div style="position:relative;">
              <input type="text" id="forgotInputEmail" required value="${Utils.escapeHTML(currentTypedEmail)}" placeholder="e.g. name@company.com or 10-digit mobile" style="width:100%; box-sizing:border-box; padding:12px 14px; border:1px solid var(--border); border-radius:8px; font-size:13.5px; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border)'">
            </div>
          </div>

          <div id="forgotStatusBox" class="hidden" style="margin-bottom:16px; padding:12px 14px; border-radius:8px; font-size:12.5px; line-height:1.5;"></div>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn soft" onclick="Utils.closeModal()">Cancel</button>
            <button type="submit" id="forgotSubmitBtn" class="btn primary" style="background:#2563eb; display:inline-flex; align-items:center; gap:8px;">
              <span>Send Password to Email</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    Utils.showModal(html);
  },

  async handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('forgotInputEmail');
    const btn = document.getElementById('forgotSubmitBtn');
    const statusBox = document.getElementById('forgotStatusBox');
    if (!input || !btn) return;

    const email = input.value.trim();
    if (!email) {
      Utils.toast('Please enter your email or registered phone number.');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Sending email...</span>`;
      statusBox.classList.add('hidden');

      const res = await API.post('/auth/forgot-password', { email });

      statusBox.className = 'status-box-success';
      statusBox.style.background = 'rgba(16, 185, 129, 0.1)';
      statusBox.style.color = '#065f46';
      statusBox.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      statusBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px; font-size:13px;">✓ Email Dispatched Successfully!</div>
        <div>${Utils.escapeHTML(res.message || 'Check your email inbox and spam folder for your login password.')}</div>
      `;
      statusBox.classList.remove('hidden');

      btn.style.display = 'none';

      // Update the main login email field if open
      const loginEmailField = document.getElementById('loginEmail');
      if (loginEmailField && email.includes('@')) {
        loginEmailField.value = email;
      }

      Utils.toast('Password reset email sent successfully!');
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `<span>Send Password to Email</span>`;
      statusBox.className = 'status-box-error';
      statusBox.style.background = 'rgba(239, 68, 68, 0.1)';
      statusBox.style.color = '#991b1b';
      statusBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      statusBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:2px;">⚠️ Request Failed</div>
        <div>${Utils.escapeHTML(err.message || 'Unable to send reset email. Please try again.')}</div>
      `;
      statusBox.classList.remove('hidden');
    }
  },

  async renderResetPasswordScreen(token) {
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.classList.add('hidden');
    const publicContainer = document.getElementById('publicViewContainer');
    if (publicContainer) {
      publicContainer.classList.remove('hidden');
      publicContainer.innerHTML = `
        <div class="auth-root" style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; padding:20px;">
          <div style="max-width:440px; width:100%; background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:36px 30px; box-shadow:0 20px 40px rgba(0,0,0,0.5); text-align:center;">
            <div style="width:48px; height:48px; border-radius:12px; background:rgba(37,99,235,0.2); color:#60a5fa; display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 16px;">
              🔐
            </div>
            <h2 style="font-size:21px; color:#ffffff; margin:0 0 8px; font-weight:700;">Set New Account Password</h2>
            <p id="resetSubTitle" style="font-size:13px; color:#94a3b8; margin:0 0 24px;">Verifying your reset link...</p>

            <div id="resetLoadingSpinner" class="inv-loader-spinner" style="margin: 20px auto;"></div>

            <div id="resetErrorBox" class="hidden" style="text-align:center; padding:16px 0;">
              <p id="resetErrorText" style="color:#f87171; font-size:13.5px; line-height:1.5; margin-bottom:20px;"></p>
              <a href="/" class="btn primary" style="background:#2563eb; color:#fff; text-decoration:none; padding:10px 22px; border-radius:8px; font-weight:600; font-size:13px;">Return to Sign In</a>
            </div>

            <form id="resetPasswordForm" class="hidden" onsubmit="App.handleResetPasswordSubmit(event, '${token}')" style="text-align:left;">
              <div style="margin-bottom:16px;">
                <label style="display:block; font-size:12px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">New Password</label>
                <input type="password" id="newPasswordInput" required minlength="6" placeholder="At least 6 characters" style="width:100%; box-sizing:border-box; padding:12px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#ffffff; font-size:14px;">
              </div>

              <div style="margin-bottom:24px;">
                <label style="display:block; font-size:12px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Confirm New Password</label>
                <input type="password" id="confirmPasswordInput" required minlength="6" placeholder="Repeat your new password" style="width:100%; box-sizing:border-box; padding:12px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#ffffff; font-size:14px;">
              </div>

              <button type="submit" id="resetSubmitBtn" style="width:100%; background:#2563eb; color:#ffffff; border:none; padding:13px; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer;">
                Update Password & Sign In
              </button>
            </form>
          </div>
        </div>
      `;
    }

    try {
      const res = await API.get(`/auth/verify-reset-token/${token}`);
      const spinner = document.getElementById('resetLoadingSpinner');
      if (spinner) spinner.style.display = 'none';

      const subTitle = document.getElementById('resetSubTitle');
      if (subTitle) subTitle.textContent = `Hello ${res.name || 'Member'}, enter your new password for ${res.email}.`;

      const form = document.getElementById('resetPasswordForm');
      if (form) form.classList.remove('hidden');
    } catch (err) {
      const spinner = document.getElementById('resetLoadingSpinner');
      if (spinner) spinner.style.display = 'none';

      const subTitle = document.getElementById('resetSubTitle');
      if (subTitle) subTitle.style.display = 'none';

      const errorBox = document.getElementById('resetErrorBox');
      const errorText = document.getElementById('resetErrorText');
      if (errorBox && errorText) {
        errorText.textContent = err.message || 'This password reset link is invalid or has expired.';
        errorBox.classList.remove('hidden');
      }
    }
  },

  async handleResetPasswordSubmit(e, token) {
    e.preventDefault();
    const newPass = document.getElementById('newPasswordInput')?.value || '';
    const confirmPass = document.getElementById('confirmPasswordInput')?.value || '';
    const btn = document.getElementById('resetSubmitBtn');

    if (newPass.length < 6) {
      Utils.toast('Password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      Utils.toast('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Updating password...';
      }

      const res = await API.post('/auth/reset-password', {
        token,
        new_password: newPass
      });

      API.setAuth(res.token, res.user);
      this.currentUser = res.user;
      Utils.toast(res.message || 'Password reset successfully! Welcome.');

      // Clear query string or hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Render main dashboard shell
      const publicContainer = document.getElementById('publicViewContainer');
      if (publicContainer) publicContainer.classList.add('hidden');
      document.body.classList.remove('public-mode');
      this.renderShell();
      this.navigate('dashboard');
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Update Password & Sign In';
      }
      Utils.toast('Error: ' + err.message);
    }
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginSubmitBtn');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Verifying credentials...</span>`;

      const res = await API.post('/auth/login', { email, password });
      API.setAuth(res.token, res.user);
      this.currentUser = res.user;
      Utils.toast(`Welcome back, ${res.user.name}!`);

      this.renderShell();
      this.navigate('dashboard');
    } catch (err) {
      Utils.toast('Login failed: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = `
        <span>Sign In to Workspace</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }
  },

  quickLogin(email, password) {
    const emailInput = document.getElementById('loginEmail');
    const pwdInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = email;
    if (pwdInput) pwdInput.value = password;
    const form = document.getElementById('loginForm');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
  },

  logout() {
    API.clearAuth();
    this.currentUser = null;
    this.renderLoginScreen();
    Utils.toast('You have been logged out.');
  },

  // Switch demonstration role seamlessly
  async switchRole(role) {
    try {
      Utils.toast(`Switching to ${role.replace('_', ' ')}...`);
      const res = await API.post('/auth/switch-role', { role });
      API.setAuth(res.token, res.user);
      this.currentUser = res.user;
      this.renderShell();
      this.navigate('dashboard');
      Utils.toast(`Logged in as ${res.user.name} (${res.user.role})`);
    } catch (err) {
      Utils.toast('Error switching role: ' + err.message);
    }
  },

  // Reset demo database to pristine state
  async resetSeed() {
    if (!confirm('Reset database to clean production demonstration seed data?')) return;
    try {
      Utils.toast('Resetting database...');
      await API.post('/auth/reset-seed');
      Utils.toast('Database successfully reset to pristine demo state!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      Utils.toast('Reset failed: ' + err.message);
    }
  },

  // Toggle mobile off-canvas drawer
  toggleSidebar(forceState) {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
      document.body.style.overflow = '';
    }
  },

  // Renders the main SaaS layout and sidebar based on role
  renderShell() {
    document.body.classList.remove('public-mode');
    document.body.classList.remove('auth-mode');
    const user = this.currentUser || {};
    const role = user.role || 'admin';

    const shell = document.getElementById('appShell');
    shell.classList.remove('auth-mode');
    shell.classList.remove('hidden');
    shell.style.removeProperty('display');
    shell.style.removeProperty('height');
    shell.style.removeProperty('min-height');
    shell.style.removeProperty('margin');
    shell.style.removeProperty('padding');
    shell.innerHTML = `
      <!-- Backdrop for mobile drawer -->
      <div id="sidebarBackdrop" class="sidebar-backdrop" onclick="App.toggleSidebar(false)"></div>

      <aside class="sidebar">
        <div class="sidebar-header-row">
          <a href="#" class="brand" onclick="App.navigate('dashboard'); App.toggleSidebar(false); return false;">
            <div class="monogram">v</div>
            <div>
              Visit Studio
              <small>Site Visit Platform</small>
            </div>
          </a>
          <button type="button" class="sidebar-close-btn" onclick="App.toggleSidebar(false)" aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="sidebar-org">
          <span>${Utils.escapeHTML(user.organization_name || 'Visit Studio')}</span>
          <span style="font-size: 9px; opacity: 0.7;">● LIVE</span>
        </div>

        <nav id="sidebarNav" style="margin-top: 10px;">
          ${this.getNavItems(role)}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-note">
            <strong>Role-Based Access</strong>
            Active role: <span style="color: var(--purple); font-weight:600;">${role.replace('_', ' ').toUpperCase()}</span>
            <br>Hierarchy enforced at database level.
          </div>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" class="hamburger-btn" onclick="App.toggleSidebar(true)" aria-label="Open menu">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div class="crumb">
              <span class="crumb-prefix">Visit Studio /</span> <b><span id="topbarCrumb">Dashboard</span></b>
            </div>
          </div>

          <div class="topbar-right">
            <button type="button" class="btn small soft" onclick="App.navigate('notifications')" title="Notifications" style="position:relative; padding:6px 10px;">
              🔔
              <span id="notifBellBadge" class="hidden" style="position:absolute; top:-4px; right:-4px; background:var(--red); color:#fff; border-radius:999px; font-size:10px; font-weight:700; min-width:17px; height:17px; display:inline-flex; align-items:center; justify-content:center; padding:0 4px;">0</span>
            </button>
            <div class="user-profile">
              <div class="avatar">${(user.name || 'VS').slice(0, 2).toUpperCase()}</div>
              <div class="user-meta">
                <div style="line-height:1.2;">${Utils.escapeHTML(user.name || 'Staff')}</div>
                <div style="font-size:10px; color:var(--muted); font-weight:400;">${role.replace('_', ' ')}</div>
              </div>
            </div>

            <button class="btn small soft logout-btn" onclick="App.logout()" title="Sign out of account" style="color:var(--red);">
              <span class="logout-text">Logout</span> ↪
            </button>
          </div>
        </header>

        <div id="pageContent" class="content">
          <!-- Dynamic page content will render here -->
        </div>
      </main>
    `;

    const mobNav = document.getElementById('mobileBottomNav');
    if (mobNav) {
      mobNav.classList.remove('hidden');
      mobNav.style.removeProperty('display');
    }
    if (typeof this.refreshNotificationBadge === 'function') {
      this.refreshNotificationBadge();
    }
  },

  getNavItems(role) {
    if (role === 'super_admin') {
      return `
        <div class="nav-section">SUPER ADMIN MODULES</div>
        <button class="nav-item ${this.activePage === 'dashboard' ? 'active' : ''}" onclick="App.navigate('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Global Overview</span>
        </button>
        <button class="nav-item ${this.activePage === 'organizations' ? 'active' : ''}" onclick="App.navigate('organizations')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v2m6-2v2m-6 3v2m6-2v2m-5 5v-3h4v3"/></svg>
          <span>Organizations</span>
        </button>
        <button class="nav-item ${this.activePage === 'reports' ? 'active' : ''}" onclick="App.navigate('reports')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>Global Reports</span>
        </button>
        <button class="nav-item ${this.activePage === 'activity_logs' ? 'active' : ''}" onclick="App.navigate('activity_logs')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>System Audit Logs</span>
        </button>

        <div class="nav-section">LEAD MANAGEMENT</div>
        <button class="nav-item ${this.activePage === 'lead_dashboard' ? 'active' : ''}" onclick="App.navigate('lead_dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          <span>Lead Dashboard</span>
        </button>
        <button class="nav-item ${this.activePage === 'leads' ? 'active' : ''}" onclick="App.navigate('leads')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>All Leads</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_pipeline' ? 'active' : ''}" onclick="App.navigate('lead_pipeline')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v6h-4z"/></svg>
          <span>Lead Pipeline</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_analytics' ? 'active' : ''}" onclick="App.navigate('lead_analytics')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>Lead Analytics</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_reports' ? 'active' : ''}" onclick="App.navigate('lead_reports')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Lead Reports</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_settings' ? 'active' : ''}" onclick="App.navigate('lead_settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/></svg>
          <span>Lead Settings</span>
        </button>
      `;
    }

    if (role === 'admin') {
      return `
        <div class="nav-section">ORGANIZATION</div>
        <button class="nav-item ${this.activePage === 'dashboard' ? 'active' : ''}" onclick="App.navigate('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Overview</span>
        </button>
        <button class="nav-item ${this.activePage === 'create_invitation' ? 'active' : ''}" onclick="App.navigate('create_invitation')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5m-1 3v4m-2-2h4"/></svg>
          <span>Create Invitation</span>
        </button>
        <button class="nav-item ${this.activePage === 'invitations' ? 'active' : ''}" onclick="App.navigate('invitations')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16v14H4zM7 3v6m10-6v6M4 11h16"/></svg>
          <span>Invitations</span>
        </button>
        <button class="nav-item ${this.activePage === 'visits' ? 'active' : ''}" onclick="App.navigate('visits')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <span>Site Visits & Check-in</span>
        </button>
        <button class="nav-item ${this.activePage === 'customers' ? 'active' : ''}" onclick="App.navigate('customers')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>
          <span>Customers</span>
        </button>
        <button class="nav-item ${this.activePage === 'followups' ? 'active' : ''}" onclick="App.navigate('followups')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Follow-ups</span>
        </button>

        <div class="nav-section">MANAGEMENT</div>
        <button class="nav-item ${this.activePage === 'digital_invitations' ? 'active' : ''}" onclick="App.navigate('digital_invitations')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16v14H4zM7 3v6m10-6v6M4 11h16"/></svg>
          <span>Invitations Report</span>
        </button>
        <button class="nav-item ${this.activePage === 'management_customers' ? 'active' : ''}" onclick="App.navigate('management_customers')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>
          <span>Customer</span>
        </button>
        <button class="nav-item ${this.activePage === 'team' ? 'active' : ''}" onclick="App.navigate('team')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
          <span>Sales Team</span>
        </button>
        <button class="nav-item ${this.activePage === 'projects' ? 'active' : ''}" onclick="App.navigate('projects')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v2m6-2v2m-6 3v2m6-2v2m-5 5v-3h4v3"/></svg>
          <span>Developers & Projects</span>
        </button>
        <button class="nav-item ${this.activePage === 'whatsapp' ? 'active' : ''}" onclick="App.navigate('whatsapp')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
          <span>WhatsApp Automation</span>
        </button>
        <button class="nav-item ${this.activePage === 'settings' ? 'active' : ''}" onclick="App.navigate('settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          <span>Brand & Settings</span>
        </button>

        <div class="nav-section">LEAD MANAGEMENT</div>
        <button class="nav-item ${this.activePage === 'lead_dashboard' ? 'active' : ''}" onclick="App.navigate('lead_dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          <span>Lead Dashboard</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_generation' ? 'active' : ''}" onclick="App.navigate('lead_generation')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          <span>Lead Generation</span>
        </button>
        <button class="nav-item ${this.activePage === 'leads' ? 'active' : ''}" onclick="App.navigate('leads')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>All Leads</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_pipeline' ? 'active' : ''}" onclick="App.navigate('lead_pipeline')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v6h-4z"/></svg>
          <span>Lead Pipeline</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_analytics' ? 'active' : ''}" onclick="App.navigate('lead_analytics')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>Lead Analytics</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_reports' ? 'active' : ''}" onclick="App.navigate('lead_reports')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Lead Reports</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_settings' ? 'active' : ''}" onclick="App.navigate('lead_settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/></svg>
          <span>Lead Settings</span>
        </button>
      `;
    }

    if (role === 'sales_head') {
      return `
        <div class="nav-section">SALES HEAD TEAM</div>
        <button class="nav-item ${this.activePage === 'dashboard' ? 'active' : ''}" onclick="App.navigate('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Team Dashboard</span>
        </button>
        <button class="nav-item ${this.activePage === 'team' ? 'active' : ''}" onclick="App.navigate('team')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>My Associates</span>
        </button>
        <button class="nav-item ${this.activePage === 'customers' ? 'active' : ''}" onclick="App.navigate('customers')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>
          <span>Team Customers</span>
        </button>
        <button class="nav-item ${this.activePage === 'create_invitation' ? 'active' : ''}" onclick="App.navigate('create_invitation')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5m-1 3v4m-2-2h4"/></svg>
          <span>Create Invitation</span>
        </button>
        <button class="nav-item ${this.activePage === 'invitations' ? 'active' : ''}" onclick="App.navigate('invitations')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16v14H4zM7 3v6m10-6v6M4 11h16"/></svg>
          <span>Team Invitations</span>
        </button>
        <button class="nav-item ${this.activePage === 'visits' ? 'active' : ''}" onclick="App.navigate('visits')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <span>Site Visits & Check-in</span>
        </button>
        <button class="nav-item ${this.activePage === 'followups' ? 'active' : ''}" onclick="App.navigate('followups')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Follow-up Pipeline</span>
        </button>
        <button class="nav-item ${this.activePage === 'reports' ? 'active' : ''}" onclick="App.navigate('reports')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>Team Performance</span>
        </button>

        <div class="nav-section">LEAD MANAGEMENT</div>
        <button class="nav-item ${this.activePage === 'lead_dashboard' ? 'active' : ''}" onclick="App.navigate('lead_dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          <span>Lead Dashboard</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_generation' ? 'active' : ''}" onclick="App.navigate('lead_generation')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          <span>Lead Generation</span>
        </button>
        <button class="nav-item ${this.activePage === 'leads' ? 'active' : ''}" onclick="App.navigate('leads')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>Team Leads</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_pipeline' ? 'active' : ''}" onclick="App.navigate('lead_pipeline')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v6h-4z"/></svg>
          <span>Lead Pipeline</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_analytics' ? 'active' : ''}" onclick="App.navigate('lead_analytics')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>Lead Analytics</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_reports' ? 'active' : ''}" onclick="App.navigate('lead_reports')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Lead Reports</span>
        </button>
        <button class="nav-item ${this.activePage === 'lead_settings' ? 'active' : ''}" onclick="App.navigate('lead_settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/></svg>
          <span>Notification Prefs</span>
        </button>
      `;
    }

    // sales_associate
    return `
      <div class="nav-section">MY WORKSPACE</div>
      <button class="nav-item ${this.activePage === 'dashboard' ? 'active' : ''}" onclick="App.navigate('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>My Dashboard</span>
      </button>
      <button class="nav-item ${this.activePage === 'create_invitation' ? 'active' : ''}" onclick="App.navigate('create_invitation')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5m-1 3v4m-2-2h4"/></svg>
        <span>Create Invitation</span>
      </button>
      <button class="nav-item ${this.activePage === 'invitations' ? 'active' : ''}" onclick="App.navigate('invitations')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16v14H4zM7 3v6m10-6v6M4 11h16"/></svg>
        <span>My Invitations</span>
      </button>
      <button class="nav-item ${this.activePage === 'visits' ? 'active' : ''}" onclick="App.navigate('visits')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <span>Upcoming Visits & Check-in</span>
      </button>
      <button class="nav-item ${this.activePage === 'customers' ? 'active' : ''}" onclick="App.navigate('customers')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <span>My Customers</span>
      </button>
      <button class="nav-item ${this.activePage === 'followups' ? 'active' : ''}" onclick="App.navigate('followups')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <span>My Follow-ups</span>
      </button>
      <button class="nav-item ${this.activePage === 'reports' ? 'active' : ''}" onclick="App.navigate('reports')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        <span>My Performance</span>
      </button>

      <div class="nav-section">LEAD MANAGEMENT</div>
      <button class="nav-item ${this.activePage === 'lead_dashboard' ? 'active' : ''}" onclick="App.navigate('lead_dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
        <span>Lead Dashboard</span>
      </button>
      <button class="nav-item ${this.activePage === 'lead_generation' ? 'active' : ''}" onclick="App.navigate('lead_generation')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        <span>Lead Generation</span>
      </button>
      <button class="nav-item ${this.activePage === 'leads' ? 'active' : ''}" onclick="App.navigate('leads')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <span>My Leads</span>
      </button>
      <button class="nav-item ${this.activePage === 'lead_pipeline' ? 'active' : ''}" onclick="App.navigate('lead_pipeline')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v6h-4z"/></svg>
        <span>Lead Pipeline</span>
      </button>
      <button class="nav-item ${this.activePage === 'lead_analytics' ? 'active' : ''}" onclick="App.navigate('lead_analytics')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        <span>Personal Analytics</span>
      </button>
      <button class="nav-item ${this.activePage === 'lead_settings' ? 'active' : ''}" onclick="App.navigate('lead_settings')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/></svg>
        <span>Notification Prefs</span>
      </button>
    `;
  },

  navigate(pageId) {
    this.activePage = pageId;
    this.toggleSidebar(false);

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btn = document.querySelector(`.nav-item[onclick*="${pageId}"]`);
    if (btn) btn.classList.add('active');
    if (pageId === 'team_member') {
      document.querySelectorAll('.nav-item').forEach(el => {
        const action = el.getAttribute('onclick') || '';
        if (action.includes("navigate('team')") && !action.includes('team_member')) el.classList.add('active');
      });
    }
    if (pageId === 'customer_detail') {
      const returnPage = this.customerDetailReturnPage || 'management_customers';
      document.querySelectorAll('.nav-item').forEach(el => {
        const action = el.getAttribute('onclick') || '';
        if (action.includes(`navigate('${returnPage}')`)) el.classList.add('active');
      });
    }

    // Update active mobile bottom nav item
    document.querySelectorAll('.mob-nav-btn').forEach(el => el.classList.remove('active'));
    const mobBtn = document.querySelector(`.mob-nav-btn[data-page="${pageId}"]`);
    if (mobBtn) mobBtn.classList.add('active');

    // Update breadcrumb
    const crumb = document.getElementById('topbarCrumb');
    if (crumb) {
      if (pageId === 'team') {
        crumb.textContent = 'Sales Team';
      } else if (pageId === 'digital_invitations') {
        crumb.textContent = 'Invitations Report';
      } else if (pageId === 'team_member') {
        crumb.textContent = 'Team Member';
      } else if (pageId === 'customer_detail') {
        crumb.textContent = 'Customer';
      } else if (pageId === 'management_customers') {
        crumb.textContent = 'Customer';
      } else {
        crumb.textContent = pageId.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    const container = document.getElementById('pageContent');
    if (!container) return;

    switch (pageId) {
      case 'dashboard':
        return this.currentUser.role === 'super_admin' ? this.renderSuperAdminDashboard(container) : this.renderDashboard(container);
      case 'organizations':
        return this.renderOrganizations(container);
      case 'activity_logs':
        return this.renderActivityLogs(container);
      case 'create_invitation':
        return this.renderInvitationBuilder(container);
      case 'invitations':
        return this.renderInvitationsList(container);
      case 'digital_invitations':
        return this.renderDigitalInvitations(container);
      case 'visits':
        return this.renderVisitsList(container);
      case 'customers':
        return this.renderCustomersList(container);
      case 'management_customers':
        return this.renderManagementCustomers(container);
      case 'customer_detail':
        return this.renderCustomerDetail(container);
      case 'followups':
        return this.renderFollowupsList(container);
      case 'team':
        return this.renderTeamManagement(container);
      case 'team_member':
        return this.renderTeamMemberDetail(container);
      case 'projects':
        return this.renderProjectsManagement(container);
      case 'whatsapp':
        return this.renderWhatsAppAutomation(container);
      case 'reports':
        return this.renderReportsAnalytics(container);
      case 'settings':
        return this.renderSettings(container);
      case 'lead_dashboard':
        return this.renderLeadDashboard(container);
      case 'lead_generation':
        return this.renderLeadGeneration(container);
      case 'leads':
        return this.renderLeadsList(container);
      case 'lead_pipeline':
        return this.renderLeadPipeline(container);
      case 'customer_360':
        return this.renderCustomer360(container);
      case 'lead_analytics':
        return this.renderLeadReports(container, true);
      case 'lead_reports':
        return this.renderLeadReports(container, false);
      case 'lead_settings':
        return this.renderLeadSettings(container);
      case 'notifications':
        return this.renderNotificationsCenter(container);
      default:
        return this.renderDashboard(container);
    }
  }
};

window.App = App;

App.pagerState = App.pagerState || {};
App.pagerRefresh = App.pagerRefresh || {};

App.ensurePager = function(key, options = {}) {
  if (!this.pagerState[key]) {
    this.pagerState[key] = { page: 1, pageSize: 10 };
  }
  const state = this.pagerState[key];
  if (options.resetPage) state.page = 1;
  if (options.pageSize) state.pageSize = Math.max(1, Number(options.pageSize) || 10);
  state.pageSize = Math.max(1, Number(state.pageSize) || 10);
  state.page = Math.max(1, Number(state.page) || 1);
  return state;
};

App.paginateList = function(items, key, options = {}) {
  const list = Array.isArray(items) ? items : [];
  const state = this.ensurePager(key, options);
  const pageSize = state.pageSize;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  if (state.page > totalPages) state.page = totalPages;
  const page = state.page;
  const start = total ? (page - 1) * pageSize : 0;
  const end = total ? Math.min(start + pageSize, total) : 0;
  return {
    items: list.slice(start, end),
    total,
    page,
    pageSize,
    totalPages,
    start,
    end,
    label: total
      ? `Showing ${start + 1}–${end} of ${total}`
      : 'Showing 0'
  };
};

App.renderPager = function(pagerId, key, total, page, pageSize, totalPages, noun = 'items') {
  const bar = document.getElementById(pagerId);
  if (!bar) return;
  if (!total) {
    bar.innerHTML = '';
    bar.classList.add('is-empty');
    return;
  }
  bar.classList.remove('is-empty');

  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  startPage = Math.max(1, endPage - maxButtons + 1);
  const pageButtons = [];
  for (let i = startPage; i <= endPage; i += 1) {
    pageButtons.push(`
      <button type="button" class="page-btn ${i === page ? 'active' : ''}" onclick="App.goPagerPage('${key}', ${i})" ${i === page ? 'aria-current="page"' : ''}>${i}</button>
    `);
  }

  bar.innerHTML = `
    <div class="table-pagination-meta">
      <label>
        Rows
        <select onchange="App.changePagerSize('${key}', this.value)">
          ${[10, 25, 50].map(size => `<option value="${size}" ${size === pageSize ? 'selected' : ''}>${size}</option>`).join('')}
        </select>
      </label>
      <span>Page ${page} of ${totalPages} · ${total} ${noun}</span>
    </div>
    <div class="table-pagination-nav">
      <button type="button" class="page-btn" onclick="App.goPagerPage('${key}', ${page - 1})" ${page <= 1 ? 'disabled' : ''}>Prev</button>
      ${pageButtons.join('')}
      <button type="button" class="page-btn" onclick="App.goPagerPage('${key}', ${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;
};

App.goPagerPage = function(key, page) {
  const state = this.ensurePager(key);
  state.page = Math.max(1, Number(page) || 1);
  const refresh = this.pagerRefresh[key];
  if (typeof refresh === 'function') refresh.call(this);
};

App.changePagerSize = function(key, size) {
  this.ensurePager(key, { pageSize: size, resetPage: true });
  const refresh = this.pagerRefresh[key];
  if (typeof refresh === 'function') refresh.call(this);
};

App.applyDomTablePager = function({ key, tableId, pagerId, matchRow, resetPage = false, noun = 'items', countElId = null }) {
  this.pagerRefresh[key] = () => this.applyDomTablePager({
    key, tableId, pagerId, matchRow, noun, countElId
  });
  const rows = [...document.querySelectorAll(`#${tableId} tbody tr[data-search]`)];
  const matched = rows.filter(row => {
    try { return matchRow(row); } catch { return true; }
  });
  rows.forEach(row => { row.style.display = 'none'; });
  const pageData = this.paginateList(matched, key, { resetPage });
  pageData.items.forEach(row => { row.style.display = ''; });
  this.renderPager(pagerId, key, pageData.total, pageData.page, pageData.pageSize, pageData.totalPages, noun);
  if (countElId) {
    const countEl = document.getElementById(countElId);
    if (countEl) {
      countEl.textContent = pageData.total
        ? `${pageData.label} ${noun}`
        : `0 ${noun}`;
    }
  }
  return pageData;
};

// Shared filter catalog loader for all list views (Team Name, Associate Name, Builder Name, Project Name)
App.getFilterCatalog = async function() {
  const role = this.currentUser?.role || 'sales_associate';
  const [usersRes, devsRes, projsRes] = await Promise.all([
    role !== 'sales_associate' ? API.get('/users').catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
    API.get('/developers').catch(() => ({ developers: [] })),
    API.get('/projects').catch(() => ({ projects: [] }))
  ]);
  const users = usersRes.users || [];
  const teams = users
    .filter(u => u.role === 'sales_head' && u.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
  const associates = users
    .filter(u => u.role === 'sales_associate' && u.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
  const developers = (devsRes.developers || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const projects = (projsRes.projects || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  return { role, teams, associates, developers, projects };
};

// Shared filter fields builder: Date (From - To), Team Name, Associate Name, Builder Name, Project Name
App.buildStandardFilterFieldsHtml = function({ state, catalog, onChangeHandler, idPrefix }) {
  const role = catalog.role || 'sales_associate';
  const showTeam = role === 'admin' || role === 'super_admin';
  const showAssoc = role === 'admin' || role === 'super_admin' || role === 'sales_head';
  const visibleProjects = state.developer_id
    ? catalog.projects.filter(p => p.developer_id === state.developer_id)
    : catalog.projects;
  const visibleAssociates = state.team_id
    ? catalog.associates.filter(a => a.sales_head_id === state.team_id)
    : catalog.associates;

  return `
    <label class="inv-filter-field">
      <span>Date From</span>
      <input type="date" id="${idPrefix}DateFrom" value="${Utils.escapeHTML(state.date_from || '')}" onchange="${onChangeHandler}('date_from', this.value)">
    </label>
    <label class="inv-filter-field">
      <span>Date To</span>
      <input type="date" id="${idPrefix}DateTo" value="${Utils.escapeHTML(state.date_to || '')}" onchange="${onChangeHandler}('date_to', this.value)">
    </label>
    ${showTeam ? `
      <label class="inv-filter-field">
        <span>Team Name</span>
        <select id="${idPrefix}Team" onchange="${onChangeHandler}('team_id', this.value)">
          <option value="">All Teams</option>
          ${catalog.teams.map(t => `<option value="${t.id}" ${state.team_id === t.id ? 'selected' : ''}>${Utils.escapeHTML(t.name)}</option>`).join('')}
        </select>
      </label>
    ` : ''}
    ${showAssoc ? `
      <label class="inv-filter-field">
        <span>Associate Name</span>
        <select id="${idPrefix}Assoc" onchange="${onChangeHandler}('associate_id', this.value)">
          <option value="">All Associates</option>
          ${visibleAssociates.map(a => `<option value="${a.id}" ${state.associate_id === a.id ? 'selected' : ''}>${Utils.escapeHTML(a.name)}</option>`).join('')}
        </select>
      </label>
    ` : ''}
    <label class="inv-filter-field">
      <span>Builder Name</span>
      <select id="${idPrefix}Dev" onchange="${onChangeHandler}('developer_id', this.value)">
        <option value="">All Builders</option>
        ${catalog.developers.map(d => `<option value="${d.id}" ${state.developer_id === d.id ? 'selected' : ''}>${Utils.escapeHTML(d.name)}</option>`).join('')}
      </select>
    </label>
    <label class="inv-filter-field">
      <span>Project Name</span>
      <select id="${idPrefix}Proj" onchange="${onChangeHandler}('project_id', this.value)">
        <option value="">All Projects</option>
        ${visibleProjects.map(p => `<option value="${p.id}" ${state.project_id === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)}</option>`).join('')}
      </select>
    </label>
  `;
};
