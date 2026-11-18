const crypto = require('crypto');
const db = require('../db');

class WhatsAppService {
  /**
   * Dispatches WhatsApp notification record and generates direct wa.me link.
   * Completely standalone without requiring Meta Cloud API credentials or Facebook approval.
   */
  async sendMessage({ organizationId, recipientPhone, templateName, variables = {}, customText = null }) {
    const logId = 'walog-' + crypto.randomUUID();
    const cleanPhone = String(recipientPhone).replace(/[^\d]/g, '');
    const intlPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    // 1. Fetch template or construct formatted message
    let messageBody = customText;
    if (!messageBody && templateName) {
      const tpl = db.get(
        'SELECT body_text FROM whatsapp_templates WHERE organization_id = ? AND template_name = ?',
        [organizationId, templateName]
      );

      if (tpl) {
        messageBody = tpl.body_text;
        for (const [key, val] of Object.entries(variables)) {
          messageBody = messageBody.replace(new RegExp(`{{${key}}}`, 'g'), val);
        }
      } else {
        messageBody = Object.entries(variables).map(([k, v]) => `${k}: ${v}`).join('\n');
      }
    }

    // Direct WhatsApp Click-to-Chat URL
    const directWaUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(messageBody)}`;

    // Record in database notification logs
    db.run(
      `INSERT INTO whatsapp_logs (id, organization_id, recipient_phone, template_name, message_body, status)
       VALUES (?, ?, ?, ?, ?, 'delivered')`,
      [logId, organizationId, recipientPhone, templateName, messageBody]
    );

    return {
      success: true,
      status: 'delivered',
      directWaUrl,
      recipientPhone,
      messageBody,
      logId
    };
  }

  // Helper trigger events
  async notifyInvitationCreated({ organizationId, customerName, customerPhone, projectName, visitDate, visitTime, invitationLink, agencyName }) {
    return this.sendMessage({
      organizationId,
      recipientPhone: customerPhone,
      templateName: 'visit_invitation_v1',
      variables: {
        customer_name: customerName,
        project_name: projectName,
        visit_date: visitDate,
        visit_time: visitTime,
        invitation_link: invitationLink,
        agency_name: agencyName || 'Visit Studio Realty'
      }
    });
  }

  async notifyVisitConfirmed({ organizationId, customerName, customerPhone, projectName, visitDate, visitTime, advisorName, advisorPhone, invitationLink }) {
    return this.sendMessage({
      organizationId,
      recipientPhone: customerPhone,
      templateName: 'visit_confirmation_v1',
      variables: {
        customer_name: customerName,
        project_name: projectName,
        visit_date: visitDate,
        visit_time: visitTime,
        advisor_name: advisorName,
        advisor_phone: advisorPhone,
        invitation_link: invitationLink
      }
    });
  }

  async notifyVisitRescheduled({ organizationId, customerName, customerPhone, projectName, newDate, newTime, invitationLink }) {
    const customText = `Site visit update: Dear ${customerName}, your visit to ${projectName} has been rescheduled to ${newDate} at ${newTime}. View your updated invitation: ${invitationLink}`;
    return this.sendMessage({
      organizationId,
      recipientPhone: customerPhone,
      templateName: 'reschedule_update',
      customText
    });
  }

  async notifyVisitCancelled({ organizationId, customerName, customerPhone, projectName, visitDate }) {
    const customText = `Site visit update: Your scheduled visit for ${projectName} on ${visitDate} has been cancelled. Please contact your property advisor to select a new date.`;
    return this.sendMessage({
      organizationId,
      recipientPhone: customerPhone,
      templateName: 'cancellation',
      customText
    });
  }

  async notifyFeedbackRequest({ organizationId, customerName, customerPhone, projectName, feedbackLink }) {
    return this.sendMessage({
      organizationId,
      recipientPhone: customerPhone,
      templateName: 'visit_feedback_v1',
      variables: {
        project_name: projectName,
        feedback_link: feedbackLink
      }
    });
  }
}

module.exports = new WhatsAppService();
