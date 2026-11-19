const nodemailer = require('nodemailer');
const db = require('../db');
const config = require('../config');

// Default fallback public tunnel/portal URL
const DEFAULT_PORTAL_URL = 'https://intl-bryan-closer-timber.trycloudflare.com';

/**
 * Get effective SMTP configuration for an organization or fallback to env
 */
function getSmtpConfig(orgId) {
  let dbSettings = null;
  try {
    if (orgId) {
      dbSettings = db.get('SELECT * FROM smtp_settings WHERE organization_id = ? LIMIT 1', [orgId]);
    }
    if (!dbSettings) {
      dbSettings = db.get('SELECT * FROM smtp_settings WHERE organization_id IS NULL OR is_active = 1 LIMIT 1');
    }
  } catch (err) {
    // Table might not exist yet in some context
  }

  const host = (dbSettings && dbSettings.host) || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt((dbSettings && dbSettings.port) || process.env.SMTP_PORT || 587, 10);
  const secure = dbSettings ? Boolean(dbSettings.secure) : (process.env.SMTP_SECURE === 'true' || port === 465);
  const username = (dbSettings && dbSettings.username) || process.env.SMTP_USER || '';
  const password = (dbSettings && dbSettings.password) || process.env.SMTP_PASS || '';
  const fromName = (dbSettings && dbSettings.from_name) || process.env.SMTP_FROM_NAME || 'Workians Realty';
  
  // Anti-spam fix: If using Gmail or no custom domain SPF configured, fromEmail MUST match the authenticated username
  let fromEmail = (dbSettings && dbSettings.from_email) || process.env.SMTP_FROM_EMAIL || username;
  if (host.includes('gmail.com') || (username && username.includes('@gmail.com'))) {
    fromEmail = username; // Gmail forces From to match authenticated user to pass SPF/DKIM
  }
  if (!fromEmail) fromEmail = username || 'no-reply@workians.com';

  const publicUrl = (dbSettings && dbSettings.public_url) || process.env.PUBLIC_PORTAL_URL || DEFAULT_PORTAL_URL;

  const isConfigured = Boolean(username && password);

  return {
    host,
    port,
    secure,
    username,
    password,
    fromName,
    fromEmail,
    publicUrl,
    isConfigured
  };
}

/**
 * Create a nodemailer transporter instance
 */
function createTransporter(smtpConfig) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.username,
      pass: smtpConfig.password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Verify SMTP connection
 */
async function verifySmtp(smtpConfig) {
  const conf = smtpConfig || getSmtpConfig();
  if (!conf.isConfigured) {
    return {
      success: false,
      error: 'SMTP username or password is not configured.'
    };
  }
  const transporter = createTransporter(conf);
  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send an email
 */
async function sendMail({ to, subject, html, text, orgId, customSmtp }) {
  const conf = customSmtp || getSmtpConfig(orgId);

  if (!conf.isConfigured) {
    console.warn(`[EMAIL PREVIEW / SMTP NOT CONFIGURED]`);
    console.warn(`  To: ${to}`);
    console.warn(`  Subject: ${subject}`);
    console.warn(`  Note: Please configure SMTP in Settings to send real emails.`);
    return {
      success: false,
      notConfigured: true,
      error: 'SMTP is not yet configured with valid username and password. Please configure SMTP in Settings.'
    };
  }

  const transporter = createTransporter(conf);
  const from = `"${conf.fromName}" <${conf.fromEmail}>`;

  const info = await transporter.sendMail({
    from,
    to,
    replyTo: conf.username || conf.fromEmail,
    subject,
    text,
    html,
    headers: {
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'X-Mailer': 'Invitation Meeting Portal Mailer'
    }
  });

  return {
    success: true,
    messageId: info.messageId
  };
}

/**
 * Generate Credentials Email HTML Template (Arial font, clean, professional)
 */
function buildCredentialsEmailHtml({ name, roleLabel, email, password, reportingHead, portalUrl, orgName }) {
  const safePortalUrl = portalUrl || DEFAULT_PORTAL_URL;
  const safeOrgName = orgName || 'Workians Realty';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Invitation Meeting Portal Login Details</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: Arial, Helvetica, sans-serif; background-color: #f1f5f9; color: #1e293b; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- HEADER -->
    <tr>
      <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #29244d 100%); text-align: left;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; font-family: Arial, sans-serif;">
                ${safeOrgName}
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1; font-family: Arial, sans-serif;">
                Invitation Meeting Portal
              </p>
            </td>
            <td align="right" style="vertical-align: middle;">
              <span style="display: inline-block; padding: 5px 12px; background-color: rgba(255,255,255,0.15); color: #ffffff; font-size: 11px; font-weight: 600; text-transform: uppercase; border-radius: 20px; letter-spacing: 0.5px;">
                ${roleLabel}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- BODY CONTENT -->
    <tr>
      <td style="padding: 32px 32px 24px; font-family: Arial, Helvetica, sans-serif;">
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #0f172a;">
          Hello <strong>${name}</strong>,
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #475569;">
          Your official account for the <strong>Invitation Meeting Portal</strong> has been created. You can use these credentials to log in, track scheduled invitations and meetings, coordinate site visits, and manage customer interactions.
        </p>

        <!-- CREDENTIALS BOX -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px 24px; margin-bottom: 28px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: Arial, sans-serif; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Portal Access:</td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600; word-break: break-all;">
                <a href="${safePortalUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${safePortalUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Login ID (Email):</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 15px;">
                ${email}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 15px;">
                ${password}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Designation:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">
                ${roleLabel}
              </td>
            </tr>
            ${reportingHead ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Reporting Head:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">
                ${reportingHead}
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- ACTION BUTTON -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <a href="${safePortalUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 6px; font-family: Arial, sans-serif; box-shadow: 0 4px 10px rgba(37,99,235,0.25);">
                Log In to Invitation Meeting Portal &rarr;
              </a>
            </td>
          </tr>
        </table>

        <!-- INSTRUCTIONS -->
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 12.5px; line-height: 19px; color: #92400e; font-family: Arial, sans-serif;">
            <strong>Important Notice:</strong> Keep your login credentials secure. All activity on the portal is tracked for daily invitation and visit reporting.
          </p>
        </div>

        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b; font-family: Arial, sans-serif;">
          If you have trouble logging in or need any assistance, please reach out to your team coordinator.
        </p>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: Arial, sans-serif;">
          &copy; ${new Date().getFullYear()} ${safeOrgName} &bull; Invitation Meeting Portal
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send user credentials email
 */
async function sendUserCredentialsEmail({ user, plainPassword, orgId, customPortalUrl }) {
  if (!user || !user.email) {
    return { success: false, error: 'User or email address is missing' };
  }

  const conf = getSmtpConfig(orgId || user.organization_id);
  const portalUrl = customPortalUrl || conf.publicUrl || DEFAULT_PORTAL_URL;

  // Resolve Reporting Head name if associate
  let reportingHead = null;
  if (user.role === 'sales_associate' && user.sales_head_id) {
    const head = db.get('SELECT name FROM users WHERE id = ?', [user.sales_head_id]);
    if (head) reportingHead = head.name;
  }

  // Resolve Organization Name
  let orgName = 'Workians Realty';
  if (user.organization_id) {
    const org = db.get('SELECT name FROM organizations WHERE id = ?', [user.organization_id]);
    if (org && org.name) orgName = org.name;
  }

  const roleLabel = user.role === 'sales_head' 
    ? 'Sales Head' 
    : (user.role === 'sales_associate' ? 'Sales Associate' : 'Team Member');

  const password = plainPassword || user.phone || '12345678';

  const html = buildCredentialsEmailHtml({
    name: user.name,
    roleLabel,
    email: user.email,
    password,
    reportingHead,
    portalUrl,
    orgName
  });

  const text = `Hello ${user.name},\n\nYour account on the Invitation Meeting Portal has been set up.\n\nPortal URL: ${portalUrl}\nLogin ID: ${user.email}\nPassword: ${password}\nRole: ${roleLabel}${reportingHead ? `\nReporting Head: ${reportingHead}` : ''}\n\nPlease keep your credentials secure.\n\nRegards,\n${orgName}`;

  const subject = `${orgName} — Your Invitation Meeting Portal Account Information`;

  return await sendMail({
    to: user.email,
    subject,
    html,
    text,
    orgId: user.organization_id || orgId
  });
}

module.exports = {
  getSmtpConfig,
  verifySmtp,
  sendMail,
  sendUserCredentialsEmail,
  buildCredentialsEmailHtml,
  DEFAULT_PORTAL_URL
};
