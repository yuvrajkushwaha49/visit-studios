const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

router.use(authenticate);

// GET /api/whatsapp/templates - View templates
router.get('/templates', (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const templates = db.all('SELECT * FROM whatsapp_templates WHERE organization_id = ? ORDER BY created_at ASC', [orgId]);
    return res.json({ templates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/templates - Create template
router.post('/templates', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const { template_name, category, body_text } = req.body;
    if (!template_name || !body_text) {
      return res.status(400).json({ error: 'Template name and body text are required' });
    }

    const tplId = 'tpl-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO whatsapp_templates (id, organization_id, template_name, category, body_text, status)
       VALUES (?, ?, ?, ?, ?, 'approved')`,
      [tplId, req.user.organization_id, template_name.trim(), category || 'UTILITY', body_text.trim()]
    );

    return res.status(201).json({ success: true, message: 'Template created successfully', id: tplId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/whatsapp/templates/:id - Edit template
router.put('/templates/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    const { template_name, category, body_text } = req.body;
    db.run(
      `UPDATE whatsapp_templates SET
        template_name = COALESCE(?, template_name),
        category = COALESCE(?, category),
        body_text = COALESCE(?, body_text)
       WHERE id = ?`,
      [template_name ?? null, category ?? null, body_text ?? null, req.params.id]
    );
    return res.json({ success: true, message: 'Template updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/templates/:id - Delete template
router.delete('/templates/:id', authorizeRoles('super_admin', 'admin'), (req, res) => {
  try {
    db.run('DELETE FROM whatsapp_templates WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/logs - View message delivery logs
router.get('/logs', (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const logs = db.all(`
      SELECT * FROM whatsapp_logs
      WHERE organization_id = ?
      ORDER BY sent_at DESC
      LIMIT 100
    `, [orgId]);
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/test-send - Test template dispatch
router.post('/test-send', authorizeRoles('super_admin', 'admin', 'sales_head'), async (req, res) => {
  try {
    const { recipient_phone, template_name, custom_text } = req.body;
    if (!recipient_phone) {
      return res.status(400).json({ error: 'Recipient phone number is required' });
    }

    const result = await whatsappService.sendMessage({
      organizationId: req.user.organization_id,
      recipientPhone: recipient_phone,
      templateName: template_name || 'visit_invitation_v1',
      customText: custom_text || null,
      variables: {
        customer_name: 'Valued Client',
        project_name: 'Luxury Showcase Residence',
        visit_date: 'Tomorrow',
        visit_time: '11:00 AM IST',
        invitation_link: 'http://localhost:3000/#invite=sample',
        agency_name: 'Visit Studio Realty'
      }
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/retry/:logId - Retry a failed message
router.post('/retry/:logId', authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const log = db.get('SELECT * FROM whatsapp_logs WHERE id = ?', [req.params.logId]);
    if (!log) return res.status(404).json({ error: 'Log entry not found' });

    const result = await whatsappService.sendMessage({
      organizationId: log.organization_id,
      recipientPhone: log.recipient_phone,
      templateName: log.template_name,
      customText: log.message_body
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
