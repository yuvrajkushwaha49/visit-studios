const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../middleware/audit');

router.use(authenticate);

// GET /api/settings - Fetch organization branding settings
router.get('/', (req, res) => {
  try {
    const orgId = req.user.organization_id;
    let settings = db.get('SELECT * FROM organization_settings WHERE organization_id = ?', [orgId]);

    if (!settings) {
      const id = 'sett-' + orgId;
      db.run(
        `INSERT INTO organization_settings (id, organization_id, agency_name, agency_subtitle, brand_color, accent_color)
         VALUES (?, ?, 'Visit Studio Realty', 'Luxury Real Estate Advisory', '#1e1b4b', '#f59e0b')`,
        [id, orgId]
      );
      settings = db.get('SELECT * FROM organization_settings WHERE organization_id = ?', [orgId]);
    }

    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings - Update organization branding settings
router.put('/', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const {
      agency_name,
      agency_subtitle,
      logo_url,
      brand_color,
      accent_color
    } = req.body;

    const existing = db.get('SELECT id FROM organization_settings WHERE organization_id = ?', [orgId]);

    if (existing) {
      db.run(
        `UPDATE organization_settings SET
          agency_name = COALESCE(?, agency_name),
          agency_subtitle = COALESCE(?, agency_subtitle),
          logo_url = COALESCE(?, logo_url),
          brand_color = COALESCE(?, brand_color),
          accent_color = COALESCE(?, accent_color),
          updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ?`,
        [agency_name, agency_subtitle, logo_url, brand_color, accent_color, orgId]
      );
    } else {
      db.run(
        `INSERT INTO organization_settings (
          id, organization_id, agency_name, agency_subtitle, logo_url, brand_color, accent_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'sett-' + orgId, orgId, agency_name || 'Visit Studio Realty', agency_subtitle || 'Luxury Real Estate Advisory',
          logo_url || null, brand_color || '#1e1b4b', accent_color || '#f59e0b'
        ]
      );
    }

    logActivity(req, 'UPDATE_SETTINGS', 'organization_settings', orgId, 'Updated organization branding settings');
    return res.json({ success: true, message: 'Organization brand settings updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/smtp - Fetch SMTP email configuration
router.get('/smtp', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { getSmtpConfig } = require('../services/emailService');
    const conf = getSmtpConfig(orgId);

    return res.json({
      smtp: {
        host: conf.host,
        port: conf.port,
        secure: conf.secure,
        username: conf.username,
        password_set: Boolean(conf.password),
        from_name: conf.fromName,
        from_email: conf.fromEmail,
        public_url: conf.publicUrl,
        is_configured: conf.isConfigured
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/smtp - Save or update SMTP email configuration
router.put('/smtp', authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const {
      host,
      port,
      secure,
      username,
      password,
      from_name,
      from_email,
      public_url
    } = req.body;

    const existing = db.get('SELECT * FROM smtp_settings WHERE organization_id = ?', [orgId]);
    let finalPassword = existing ? existing.password : '';
    if (password && password !== '••••••••' && password.trim()) {
      finalPassword = password.trim();
    }

    if (existing) {
      db.run(
        `UPDATE smtp_settings SET
          host = COALESCE(?, host),
          port = COALESCE(?, port),
          secure = COALESCE(?, secure),
          username = COALESCE(?, username),
          password = ?,
          from_name = COALESCE(?, from_name),
          from_email = COALESCE(?, from_email),
          public_url = COALESCE(?, public_url),
          updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ?`,
        [
          host || null,
          port ? parseInt(port, 10) : null,
          secure !== undefined ? (secure ? 1 : 0) : null,
          username || null,
          finalPassword,
          from_name || null,
          from_email || null,
          public_url || null,
          orgId
        ]
      );
    } else {
      const crypto = require('crypto');
      const id = 'smtp-' + crypto.randomUUID().slice(0, 8);
      db.run(
        `INSERT INTO smtp_settings (
          id, organization_id, host, port, secure, username, password, from_name, from_email, public_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id,
          orgId,
          host || 'smtp.gmail.com',
          port ? parseInt(port, 10) : 587,
          secure ? 1 : 0,
          username || '',
          finalPassword,
          from_name || 'Workians Realty',
          from_email || username || '',
          public_url || 'https://intl-bryan-closer-timber.trycloudflare.com'
        ]
      );
    }

    logActivity(req, 'UPDATE_SMTP_SETTINGS', 'smtp_settings', orgId, `Updated SMTP settings (${host || 'smtp'})`);

    return res.json({
      success: true,
      message: 'SMTP settings updated successfully!'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/smtp/test - Test SMTP connection & send test email
router.post('/smtp/test', authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { test_email, host, port, secure, username, password, from_name, from_email, public_url } = req.body;
    const { getSmtpConfig, verifySmtp, sendMail } = require('../services/emailService');

    let smtpConfig;
    if (host && username && password) {
      smtpConfig = {
        host,
        port: parseInt(port || 587, 10),
        secure: Boolean(secure),
        username,
        password,
        fromName: from_name || 'Workians Realty',
        fromEmail: from_email || username,
        publicUrl: public_url || 'https://intl-bryan-closer-timber.trycloudflare.com',
        isConfigured: true
      };
    } else {
      smtpConfig = getSmtpConfig(orgId);
    }

    if (!smtpConfig.isConfigured) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both SMTP Username (email) and Password (App Password) to test.'
      });
    }

    // First verify connection
    const verifyResult = await verifySmtp(smtpConfig);
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: `SMTP Connection Failed: ${verifyResult.error}`
      });
    }

    // If test_email provided, send test email
    const recipient = test_email || req.user.email;
    if (recipient) {
      const testHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e1b4b; margin: 0 0 12px;">Workians Realty &bull; SMTP Verification Test</h2>
          <p style="color: #334155; font-size: 14px; line-height: 22px;">
            Congratulations! Your SMTP email service has been connected and configured successfully.
          </p>
          <div style="background: #ffffff; padding: 14px 18px; border-radius: 6px; border-left: 4px solid #10b981; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #047857; font-weight: 600;">
              ✓ Status: Ready to send user login IDs and passwords with access links!
            </p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Test sent to: <strong>${recipient}</strong> via ${smtpConfig.host}:${smtpConfig.port}
          </p>
        </div>
      `;

      await sendMail({
        to: recipient,
        subject: 'Test Email — SMTP Setup Verified (Workians Realty)',
        html: testHtml,
        text: 'Congratulations! Your SMTP email setup has been verified and is ready to send credentials.',
        customSmtp: smtpConfig
      });
    }

    logActivity(req, 'TEST_SMTP', 'smtp_settings', orgId, `Sent test email to ${recipient}`);

    return res.json({
      success: true,
      message: `SMTP connection verified and test email sent successfully to ${recipient}!`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
