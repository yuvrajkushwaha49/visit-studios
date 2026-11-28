const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { logActivity } = require('../middleware/audit');
const { generateQRCodeDataURL } = require('./qrService');
const whatsappService = require('./whatsappService');
const notificationService = require('./notificationService');
const { resolveAttributionFromLink } = require('./attributionService');
const {
  resolvePublicLinkByToken,
  recordCampaignEvent,
  hashVisitor,
  getOrgLeadSettings
} = require('./trackingLinkService');
const {
  DEFAULT_LEAD_STAGES,
  STAGE_TO_CUSTOMER_STATUS,
  normalizeMobile,
  sanitizeText,
  validatePublicEnquiryPayload,
  validateStageTransition
} = require('../validators/leadValidators');

function generateEnquiryRef() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ENQ-${datePart}-${rand}`;
}

function getLeadById(leadId) {
  return db.get(
    `SELECT l.*,
       c.full_name as customer_name,
       c.mobile_number as customer_mobile,
       c.whatsapp_number as customer_whatsapp,
       c.email as customer_email,
       c.customer_code as customer_code,
       c.city as customer_city,
       p.name as project_name,
       p.location as project_location,
       d.name as developer_name,
       pc.name as configuration_name,
       camp.name as campaign_name,
       tl.short_code as tracking_short_code,
       tl.source_name as link_source_name,
       ua.name as assigned_associate_name,
       ua.role as assigned_associate_role,
       ua.phone as assigned_associate_phone,
       sh.name as assigned_associate_team_name,
       uh.name as assigned_sales_head_name,
       oa.name as original_associate_name,
       oh.name as original_sales_head_name,
       lo.name as original_link_owner_name,
       inv.short_code as invitation_short_code,
       inv.token as invitation_token,
       inv.status as invitation_status,
       sv.status as site_visit_status,
       sv.scheduled_date as site_visit_date,
       sv.scheduled_time as site_visit_time
     FROM leads l
     JOIN customers c ON l.customer_id = c.id
     LEFT JOIN projects p ON l.project_id = p.id
     LEFT JOIN developers d ON p.developer_id = d.id
     LEFT JOIN project_configurations pc ON l.configuration_id = pc.id
     LEFT JOIN campaigns camp ON l.campaign_id = camp.id
     LEFT JOIN tracking_links tl ON l.tracking_link_id = tl.id
     LEFT JOIN users ua ON l.assigned_associate_id = ua.id
     LEFT JOIN users sh ON ua.sales_head_id = sh.id
     LEFT JOIN users uh ON l.assigned_sales_head_id = uh.id
     LEFT JOIN users oa ON l.original_associate_id = oa.id
     LEFT JOIN users oh ON l.original_sales_head_id = oh.id
     LEFT JOIN users lo ON l.original_link_owner_id = lo.id
     LEFT JOIN invitations inv ON l.invitation_id = inv.id
     LEFT JOIN site_visits sv ON l.site_visit_id = sv.id
     WHERE l.id = ?`,
    [leadId]
  );
}

function canAccessLead(user, lead) {
  if (!user || !lead) return false;
  if (user.role === 'super_admin') return true;
  if (lead.organization_id !== user.organization_id) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'sales_head') {
    if (lead.assigned_sales_head_id === user.id || lead.original_sales_head_id === user.id) return true;
    if (lead.assigned_associate_id) {
      const assoc = db.get('SELECT sales_head_id FROM users WHERE id = ?', [lead.assigned_associate_id]);
      if (assoc && assoc.sales_head_id === user.id) return true;
    }
    return false;
  }
  if (user.role === 'sales_associate') {
    return lead.assigned_associate_id === user.id;
  }
  return false;
}

function canAssignLead(user, lead, targetAssociateId, targetSalesHeadId = null) {
  if (!user || !lead) return { allowed: false, reason: 'Lead not found' };
  if (user.role === 'sales_associate') {
    return { allowed: false, reason: 'Sales Associates cannot reassign leads.' };
  }
  if (user.role !== 'super_admin' && lead.organization_id !== user.organization_id) {
    return { allowed: false, reason: 'Cross-organization assignment is forbidden.' };
  }

  if (targetAssociateId) {
    const assoc = db.get(
      "SELECT id, organization_id, role, sales_head_id, status FROM users WHERE id = ?",
      [targetAssociateId]
    );
    if (!assoc || assoc.status !== 'active') {
      return { allowed: false, reason: 'Target associate not found or inactive.' };
    }
    if (assoc.organization_id !== lead.organization_id) {
      return { allowed: false, reason: 'Target associate belongs to a different organization.' };
    }
    if (assoc.role !== 'sales_associate' && assoc.role !== 'sales_head') {
      return { allowed: false, reason: 'Target user cannot be assigned leads.' };
    }
    if (user.role === 'sales_head') {
      if (!canAccessLead(user, lead)) {
        return { allowed: false, reason: 'Sales Head cannot reassign leads outside their team.' };
      }
      if (assoc.sales_head_id !== user.id && assoc.id !== user.id) {
        return { allowed: false, reason: 'Sales Head can only assign leads within their own team.' };
      }
    }
    return { allowed: true, targetAssoc: assoc };
  }

  if (targetSalesHeadId) {
    if (user.role === 'sales_head' && targetSalesHeadId !== user.id) {
      return { allowed: false, reason: 'Sales Head cannot transfer leads to another Sales Head.' };
    }
    const head = db.get(
      "SELECT id, organization_id, role, status FROM users WHERE id = ? AND role = 'sales_head' AND status = 'active'",
      [targetSalesHeadId]
    );
    if (!head || head.organization_id !== lead.organization_id) {
      return { allowed: false, reason: 'Target Sales Head not found in organization.' };
    }
    return { allowed: true, targetHead: head };
  }

  return { allowed: false, reason: 'Target assignee is required.' };
}

/**
 * Transactional public enquiry submission from a validated tracking link.
 */
function submitPublicEnquiry({ token, body, req }) {
  const resolved = resolvePublicLinkByToken(token);
  if (resolved.error) {
    throw Object.assign(new Error(resolved.error), { status: resolved.status || 400 });
  }
  const link = resolved.link;
  const visitorHash = hashVisitor(req);

  const validation = validatePublicEnquiryPayload(body);
  if (!validation.valid) {
    recordCampaignEvent({
      organizationId: link.organization_id,
      trackingLinkId: link.id,
      campaignId: link.campaign_id,
      eventType: 'submission_rejected',
      visitorHash,
      sessionId: body?.session_id || null,
      metadata: { isSpam: validation.isSpam, errors: validation.errors }
    });
    throw Object.assign(new Error(validation.errors[0] || 'Invalid enquiry submission.'), {
      status: 400,
      errors: validation.errors
    });
  }

  const data = validation.data;
  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const txResult = db.transaction(() => {
    // Re-verify link inside transaction
    const freshLink = db.get(
      `SELECT tl.*, c.name as campaign_name
       FROM tracking_links tl
       LEFT JOIN campaigns c ON tl.campaign_id = c.id
       WHERE tl.id = ?`,
      [link.id]
    );
    if (!freshLink || !freshLink.is_active) {
      throw Object.assign(new Error('This enquiry link is no longer active.'), { status: 410 });
    }
    if (freshLink.expires_at) {
      const exp = new Date(String(freshLink.expires_at).replace('T', ' ').replace(' ', 'T') + 'Z');
      if (!Number.isNaN(exp.getTime()) && exp.getTime() <= Date.now()) {
        throw Object.assign(new Error('This enquiry link has expired.'), { status: 410 });
      }
    }

    const attr = resolveAttributionFromLink(freshLink, data.project_id, data.configuration_id);
    const apartmentSizeLabel = data.apartment_size || attr.configuration?.name || '';

    // Duplicate detection by normalized mobile within organization
    const existingCustomer = db.get(
      `SELECT * FROM customers
       WHERE organization_id = ?
         AND (normalized_mobile = ? OR mobile_number = ? OR mobile_number LIKE ?)
       ORDER BY created_at ASC
       LIMIT 1`,
      [attr.organizationId, data.normalized_mobile, data.mobile_number, `%${data.normalized_mobile}`]
    );

    let customerId;
    let isNewCustomer = false;
    let duplicateStatus = 'unique';
    let duplicateOfLeadId = null;

    let finalAssignedAssocId = attr.assignedAssociateId;
    let finalAssignedHeadId = attr.assignedSalesHeadId;

    if (existingCustomer) {
      customerId = existingCustomer.id;

      // Preserve existing customer ownership — NEVER transfer ownership away from existing Associate
      if (existingCustomer.assigned_associate_id) {
        finalAssignedAssocId = existingCustomer.assigned_associate_id;
        finalAssignedHeadId = existingCustomer.assigned_sales_head_id || finalAssignedHeadId;
      } else if (existingCustomer.assigned_sales_head_id && !finalAssignedAssocId) {
        finalAssignedHeadId = existingCustomer.assigned_sales_head_id;
      }

      // Update missing profile details without overwriting original_source or ownership
      db.run(
        `UPDATE customers SET
          email = CASE WHEN (email IS NULL OR email = '') AND ? != '' THEN ? ELSE email END,
          city = CASE WHEN (city IS NULL OR city = '') AND ? != '' THEN ? ELSE city END,
          normalized_mobile = COALESCE(NULLIF(normalized_mobile, ''), ?),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [data.email, data.email, data.city, data.city, data.normalized_mobile, customerId]
      );

      // Check existing leads for same customer + same project
      const existingSameProjectLead = db.get(
        `SELECT id FROM leads WHERE organization_id = ? AND customer_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 1`,
        [attr.organizationId, customerId, attr.project.id]
      );

      if (existingSameProjectLead) {
        duplicateStatus = 'duplicate_flagged';
        duplicateOfLeadId = existingSameProjectLead.id;
      } else {
        duplicateStatus = 'existing_customer_new_project';
      }
    } else {
      isNewCustomer = true;
      customerId = 'cust-' + crypto.randomUUID().slice(0, 8);
      const countRow = db.get('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [attr.organizationId]);
      const customerCode = 'CUST-' + String(1001 + (countRow?.cnt || 0));

      db.run(
        `INSERT INTO customers (
          id, organization_id, customer_code, full_name, mobile_number, normalized_mobile, whatsapp_number,
          email, city, budget, preferred_location, interested_project_id, configuration,
          lead_source, original_source, requirements, assigned_associate_id, assigned_sales_head_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead')`,
        [
          customerId,
          attr.organizationId,
          customerCode,
          data.full_name,
          data.mobile_number,
          data.normalized_mobile,
          data.mobile_number,
          data.email || '',
          data.city,
          data.budget || '',
          data.city,
          attr.project.id,
          apartmentSizeLabel,
          attr.enquirySource,
          attr.enquirySource,
          data.requirements || '',
          finalAssignedAssocId,
          finalAssignedHeadId
        ]
      );
    }

    const leadId = 'lead-' + crypto.randomUUID().slice(0, 8);
    const enquiryRef = generateEnquiryRef();

    db.run(
      `INSERT INTO leads (
        id, enquiry_ref, organization_id, customer_id, project_id, configuration_id,
        apartment_size, budget, purchase_timeline, preferred_callback_time, city, requirements,
        contact_consent, consent_timestamp, tracking_link_id, campaign_id, enquiry_source,
        attribution_locked, original_link_owner_id, original_associate_id, original_sales_head_id,
        assigned_associate_id, assigned_sales_head_id, stage, duplicate_status, duplicate_of_lead_id, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 'new_lead', ?, ?, ?)`,
      [
        leadId,
        enquiryRef,
        attr.organizationId,
        customerId,
        attr.project.id,
        attr.configuration?.id || null,
        apartmentSizeLabel,
        data.budget || '',
        data.purchase_timeline,
        data.preferred_callback_time,
        data.city,
        data.requirements || '',
        data.contact_consent,
        nowIso,
        attr.trackingLinkId,
        attr.campaignId,
        attr.enquirySource,
        attr.originalLinkOwnerId,
        attr.originalAssociateId,
        attr.originalSalesHeadId,
        finalAssignedAssocId,
        finalAssignedHeadId,
        duplicateStatus,
        duplicateOfLeadId,
        nowIso
      ]
    );

    // Stage history entry
    db.run(
      `INSERT INTO lead_stage_history (id, organization_id, lead_id, previous_stage, new_stage, changed_by, notes)
       VALUES (?, ?, ?, NULL, 'new_lead', ?, ?)`,
      [
        'lsh-' + crypto.randomUUID().slice(0, 8),
        attr.organizationId,
        leadId,
        attr.originalLinkOwnerId || null,
        `Public enquiry submitted via ${attr.enquirySource} (${enquiryRef})`
      ]
    );

    // Initial assignment record if assigned
    if (finalAssignedAssocId || finalAssignedHeadId) {
      const reasonText = existingCustomer && existingCustomer.assigned_associate_id && attr.originalAssociateId && existingCustomer.assigned_associate_id !== attr.originalAssociateId
        ? 'Preserved existing customer owner per duplicate protection policy'
        : (attr.assignmentPolicyReason || 'Attributed from validated tracking link');
      db.run(
        `INSERT INTO lead_assignments (
          id, organization_id, lead_id, previous_owner_id, new_owner_id,
          previous_sales_head_id, new_sales_head_id, changed_by, reason
        ) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
        [
          'la-' + crypto.randomUUID().slice(0, 8),
          attr.organizationId,
          leadId,
          finalAssignedAssocId,
          finalAssignedHeadId,
          attr.originalLinkOwnerId || null,
          reasonText
        ]
      );
    }

    // Customer timeline interaction
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Enquiry Submitted', ?)`,
      [
        'int-' + crypto.randomUUID().slice(0, 8),
        customerId,
        finalAssignedAssocId || attr.originalLinkOwnerId || null,
        `Ref ${enquiryRef} · Project: ${attr.project.name} (${apartmentSizeLabel}) · Timeline: ${data.purchase_timeline} · Callback: ${data.preferred_callback_time} · Source: ${attr.enquirySource}`
      ]
    );

    // Campaign / tracking events
    recordCampaignEvent({
      organizationId: attr.organizationId,
      trackingLinkId: attr.trackingLinkId,
      campaignId: attr.campaignId,
      leadId,
      eventType: 'enquiry_submitted',
      visitorHash,
      sessionId: data.session_id
    });
    recordCampaignEvent({
      organizationId: attr.organizationId,
      trackingLinkId: attr.trackingLinkId,
      campaignId: attr.campaignId,
      leadId,
      eventType: 'submission_successful',
      visitorHash,
      sessionId: data.session_id
    });
    if (!isNewCustomer) {
      recordCampaignEvent({
        organizationId: attr.organizationId,
        trackingLinkId: attr.trackingLinkId,
        campaignId: attr.campaignId,
        leadId,
        eventType: 'duplicate_detected',
        visitorHash,
        sessionId: data.session_id,
        metadata: { duplicateStatus, duplicateOfLeadId }
      });
    }

    return {
      leadId,
      enquiryRef,
      customerId,
      isNewCustomer,
      duplicateStatus,
      attr,
      finalAssignedAssocId,
      finalAssignedHeadId
    };
  });

  // Notify authorized internal stakeholders asynchronously after commit
  const recipientIds = [];
  if (txResult.finalAssignedAssocId) recipientIds.push(txResult.finalAssignedAssocId);
  if (txResult.finalAssignedHeadId) recipientIds.push(txResult.finalAssignedHeadId);
  if (!txResult.finalAssignedAssocId && !txResult.finalAssignedHeadId) {
    const admins = db.all(
      "SELECT id FROM users WHERE organization_id = ? AND role = 'admin' AND status = 'active'",
      [txResult.attr.organizationId]
    );
    admins.forEach(a => recipientIds.push(a.id));
  }

  notificationService.notifyUsers({
    organizationId: txResult.attr.organizationId,
    recipientUserIds: recipientIds,
    eventType: 'new_enquiry',
    title: `New Enquiry: ${txResult.attr.project.name}`,
    message: `Enquiry ${txResult.enquiryRef} received from ${data.full_name} (${data.city}) for ${txResult.attr.project.name} · ${data.apartment_size || 'Residence'}. Callback: ${data.preferred_callback_time}.`,
    entityType: 'leads',
    entityId: txResult.leadId,
    dedupeKeyPrefix: `new_enquiry:${txResult.leadId}`
  }).catch(() => {});

  logActivity(
    {
      user: {
        id: null,
        name: data.full_name,
        role: 'public_customer',
        organization_id: txResult.attr.organizationId
      },
      headers: req?.headers,
      socket: req?.socket
    },
    'PUBLIC_ENQUIRY_SUBMITTED',
    'leads',
    txResult.leadId,
    `Enquiry ${txResult.enquiryRef} for ${txResult.attr.project.name} (${txResult.duplicateStatus})`
  );

  const isBulkWhatsapp = link.link_type === 'bulk_whatsapp';
  const assignedAdvisorId = txResult.finalAssignedAssocId || txResult.finalAssignedHeadId || null;
  const assignedAdvisor = !isBulkWhatsapp && assignedAdvisorId
    ? db.get('SELECT name, phone FROM users WHERE id = ?', [assignedAdvisorId])
    : null;
  const advisorName = isBulkWhatsapp
    ? (link.advisor_display_name || 'Aishwarya')
    : (link.advisor_display_name || assignedAdvisor?.name || link.owner_associate_name || link.owner_sales_head_name || link.creator_name || 'Property Advisory Desk');
  const advisorPhone = isBulkWhatsapp
    ? (link.advisor_display_phone || '9289846060')
    : (link.advisor_display_phone || assignedAdvisor?.phone || link.owner_associate_phone || link.owner_sales_head_phone || link.creator_phone || '');

  return {
    enquiry_ref: txResult.enquiryRef,
    submitted_at: nowIso,
    customer_name: data.full_name,
    customer_mobile: data.mobile_number,
    project_name: txResult.attr.project.name,
    apartment_size: data.apartment_size || txResult.attr.configuration?.name || '',
    preferred_callback_time: data.preferred_callback_time,
    purchase_timeline: data.purchase_timeline,
    advisor_name: advisorName,
    advisor_phone: advisorPhone
  };
}

/**
 * Create a manual lead inside the authenticated portal.
 */
function createStaffLead({ user, body, req }) {
  const orgId = user.role === 'super_admin' ? (body.organization_id || user.organization_id) : user.organization_id;
  if (!orgId) throw Object.assign(new Error('Organization context is required.'), { status: 400 });

  const fullName = sanitizeText(body.full_name, 120);
  const mobile = normalizeMobile(body.mobile_number);
  if (!fullName || !mobile.isValid) {
    throw Object.assign(new Error('Valid customer name and 10-15 digit mobile number are required.'), { status: 400 });
  }

  const projectId = sanitizeText(body.project_id, 64) || null;
  let proj = null;
  if (projectId) {
    proj = db.get('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [projectId, orgId]);
    if (!proj) throw Object.assign(new Error('Selected project not found in organization.'), { status: 400 });
  }

  // Resolve assignment strictly per role
  let assignedAssocId = null;
  let assignedHeadId = null;
  if (user.role === 'sales_associate') {
    assignedAssocId = user.id;
    assignedHeadId = user.sales_head_id || null;
  } else if (body.assigned_associate_id) {
    const target = db.get(
      "SELECT id, sales_head_id FROM users WHERE id = ? AND organization_id = ? AND status = 'active'",
      [body.assigned_associate_id, orgId]
    );
    if (!target) throw Object.assign(new Error('Selected associate not found in organization.'), { status: 400 });
    if (user.role === 'sales_head' && target.sales_head_id !== user.id && target.id !== user.id) {
      throw Object.assign(new Error('Sales Head can only assign leads to their own team.'), { status: 403 });
    }
    assignedAssocId = target.id;
    assignedHeadId = target.sales_head_id || (user.role === 'sales_head' ? user.id : null);
  } else if (user.role === 'sales_head') {
    assignedHeadId = user.id;
  }

  const enquiryRef = generateEnquiryRef();
  const email = sanitizeText(body.email, 160).toLowerCase();
  const city = sanitizeText(body.city || body.preferred_location, 100);
  const apartmentSize = sanitizeText(body.apartment_size || body.configuration, 120);
  const budget = sanitizeText(body.budget, 120);
  const purchaseTimeline = sanitizeText(body.purchase_timeline, 120) || 'Within 3 Months';
  const callbackTime = sanitizeText(body.preferred_callback_time, 120) || 'Anytime (10 AM - 7 PM)';
  const requirements = sanitizeText(body.requirements, 1000);
  const source = sanitizeText(body.enquiry_source || body.lead_source, 100) || 'Direct Entry';

  const result = db.transaction(() => {
    const existingCust = db.get(
      `SELECT * FROM customers WHERE organization_id = ? AND (normalized_mobile = ? OR mobile_number = ?) LIMIT 1`,
      [orgId, mobile.normalized10, mobile.rawClean]
    );

    let customerId;
    let duplicateStatus = 'unique';
    let duplicateOfLeadId = null;

    if (existingCust) {
      customerId = existingCust.id;
      if (existingCust.assigned_associate_id) {
        assignedAssocId = existingCust.assigned_associate_id;
        assignedHeadId = existingCust.assigned_sales_head_id || assignedHeadId;
      }
      if (projectId) {
        const sameProjLead = db.get(
          'SELECT id FROM leads WHERE organization_id = ? AND customer_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 1',
          [orgId, customerId, projectId]
        );
        duplicateStatus = sameProjLead ? 'duplicate_flagged' : 'existing_customer_new_project';
        duplicateOfLeadId = sameProjLead?.id || null;
      } else {
        duplicateStatus = 'existing_customer_new_project';
      }
    } else {
      customerId = 'cust-' + crypto.randomUUID().slice(0, 8);
      const cnt = db.get('SELECT COUNT(*) as cnt FROM customers WHERE organization_id = ?', [orgId])?.cnt || 0;
      db.run(
        `INSERT INTO customers (
          id, organization_id, customer_code, full_name, mobile_number, normalized_mobile, whatsapp_number,
          email, city, budget, preferred_location, interested_project_id, configuration,
          lead_source, original_source, requirements, assigned_associate_id, assigned_sales_head_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead')`,
        [
          customerId, orgId, 'CUST-' + String(1001 + cnt), fullName, mobile.rawClean, mobile.normalized10, mobile.rawClean,
          email, city, budget, city, projectId, apartmentSize,
          source, source, requirements, assignedAssocId, assignedHeadId
        ]
      );
    }

    const leadId = 'lead-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT INTO leads (
        id, enquiry_ref, organization_id, customer_id, project_id, configuration_id,
        apartment_size, budget, purchase_timeline, preferred_callback_time, city, requirements,
        contact_consent, consent_timestamp, enquiry_source, attribution_locked,
        original_link_owner_id, original_associate_id, original_sales_head_id,
        assigned_associate_id, assigned_sales_head_id, stage, duplicate_status, duplicate_of_lead_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, 1, ?, ?, ?, ?, ?, 'new_lead', ?, ?)`,
      [
        leadId, enquiryRef, orgId, customerId, projectId, sanitizeText(body.configuration_id, 64) || null,
        apartmentSize, budget, purchaseTimeline, callbackTime, city, requirements,
        source, user.id, assignedAssocId, assignedHeadId,
        assignedAssocId, assignedHeadId, duplicateStatus, duplicateOfLeadId
      ]
    );

    db.run(
      `INSERT INTO lead_stage_history (id, organization_id, lead_id, previous_stage, new_stage, changed_by, notes)
       VALUES (?, ?, ?, NULL, 'new_lead', ?, ?)`,
      ['lsh-' + crypto.randomUUID().slice(0, 8), orgId, leadId, user.id, `Lead created manually (${source})`]
    );

    if (assignedAssocId || assignedHeadId) {
      db.run(
        `INSERT INTO lead_assignments (id, organization_id, lead_id, previous_owner_id, new_owner_id, previous_sales_head_id, new_sales_head_id, changed_by, reason)
         VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, 'Initial assignment on lead creation')`,
        ['la-' + crypto.randomUUID().slice(0, 8), orgId, leadId, assignedAssocId, assignedHeadId, user.id]
      );
    }

    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Lead Added', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), customerId, user.id, `Ref ${enquiryRef} created (${source}). ${requirements || ''}`]
    );

    return { leadId, customerId };
  });

  logActivity(req, 'CREATE_LEAD', 'leads', result.leadId, `Created lead ${enquiryRef} for ${fullName}`);
  return getLeadById(result.leadId);
}

/**
 * Transition lead stage with strict validation, history logging, and customer status synchronization.
 */
function changeLeadStage({ leadId, newStage, notes = '', lossReason = '', user, req }) {
  const lead = db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 });
  if (!canAccessLead(user, lead)) throw Object.assign(new Error('Unauthorized to update this lead.'), { status: 403 });

  const settings = getOrgLeadSettings(lead.organization_id);
  const check = validateStageTransition(lead.stage, newStage, {
    strict: Boolean(settings?.strict_stage_transitions ?? 1),
    lossReason
  });
  if (!check.valid) {
    throw Object.assign(new Error(check.error), { status: 400 });
  }

  const cleanNotes = sanitizeText(notes, 1000);
  const cleanLossReason = newStage === 'lost' ? sanitizeText(lossReason, 500) : null;

  db.transaction(() => {
    db.run(
      `UPDATE leads SET stage = ?, loss_reason = COALESCE(?, loss_reason), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStage, cleanLossReason, lead.id]
    );

    db.run(
      `INSERT INTO lead_stage_history (id, organization_id, lead_id, previous_stage, new_stage, changed_by, notes, loss_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'lsh-' + crypto.randomUUID().slice(0, 8),
        lead.organization_id,
        lead.id,
        lead.stage,
        newStage,
        user.id,
        cleanNotes || `Stage changed from ${lead.stage} to ${newStage}`,
        cleanLossReason
      ]
    );

    const mappedCustStatus = STAGE_TO_CUSTOMER_STATUS[newStage];
    if (mappedCustStatus) {
      db.run('UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [mappedCustStatus, lead.customer_id]);
    }

    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Stage Updated', ?)`,
      [
        'int-' + crypto.randomUUID().slice(0, 8),
        lead.customer_id,
        user.id,
        `Lead ${lead.enquiry_ref} moved from ${lead.stage} to ${newStage}.${cleanLossReason ? ` Reason: ${cleanLossReason}.` : ''} ${cleanNotes}`
      ]
    );
  });

  if (newStage === 'booked_won' || newStage === 'lost') {
    const eventType = newStage === 'booked_won' ? 'lead_converted' : 'lead_marked_lost';
    const recipients = [lead.assigned_associate_id, lead.assigned_sales_head_id].filter(Boolean);
    notificationService.notifyUsers({
      organizationId: lead.organization_id,
      recipientUserIds: recipients,
      eventType,
      title: newStage === 'booked_won' ? `Lead Booked / Won (${lead.enquiry_ref})` : `Lead Marked Lost (${lead.enquiry_ref})`,
      message: newStage === 'booked_won'
        ? `Lead ${lead.enquiry_ref} has been converted to Booked / Won by ${user.name}.`
        : `Lead ${lead.enquiry_ref} was marked Lost. Reason: ${cleanLossReason}.`,
      entityType: 'leads',
      entityId: lead.id
    }).catch(() => {});
  }

  logActivity(req, 'UPDATE_LEAD_STAGE', 'leads', lead.id, `Stage ${lead.stage} -> ${newStage}`);
  return getLeadById(lead.id);
}

/**
 * Reassign lead ownership while permanently preserving original attribution.
 */
function assignLead({ leadId, associateId = null, salesHeadId = null, reason = '', user, req }) {
  const lead = db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 });

  const cleanReason = sanitizeText(reason, 500);
  if (!cleanReason) {
    throw Object.assign(new Error('Reassignment reason is required for audit compliance.'), { status: 400 });
  }

  const authCheck = canAssignLead(user, lead, associateId, salesHeadId);
  if (!authCheck.allowed) {
    throw Object.assign(new Error(authCheck.reason), { status: 403 });
  }

  const newAssocId = authCheck.targetAssoc ? authCheck.targetAssoc.id : null;
  const newHeadId = authCheck.targetAssoc
    ? (authCheck.targetAssoc.sales_head_id || lead.assigned_sales_head_id || (user.role === 'sales_head' ? user.id : null))
    : authCheck.targetHead.id;

  db.transaction(() => {
    // Only updates working ownership — original_link_owner_id / original_associate_id / original_sales_head_id remain untouched
    db.run(
      `UPDATE leads SET assigned_associate_id = ?, assigned_sales_head_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newAssocId, newHeadId, lead.id]
    );

    db.run(
      `UPDATE customers SET assigned_associate_id = COALESCE(?, assigned_associate_id), assigned_sales_head_id = COALESCE(?, assigned_sales_head_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newAssocId, newHeadId, lead.customer_id]
    );

    db.run(
      `INSERT INTO lead_assignments (
        id, organization_id, lead_id, previous_owner_id, new_owner_id,
        previous_sales_head_id, new_sales_head_id, changed_by, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'la-' + crypto.randomUUID().slice(0, 8),
        lead.organization_id,
        lead.id,
        lead.assigned_associate_id || null,
        newAssocId,
        lead.assigned_sales_head_id || null,
        newHeadId,
        user.id,
        cleanReason
      ]
    );

    const assigneeName = authCheck.targetAssoc?.id
      ? db.get('SELECT name FROM users WHERE id = ?', [authCheck.targetAssoc.id])?.name
      : authCheck.targetHead?.id
        ? db.get('SELECT name FROM users WHERE id = ?', [authCheck.targetHead.id])?.name
        : 'Team Member';

    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Lead Reassigned', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), lead.customer_id, user.id, `Lead ${lead.enquiry_ref} assigned to ${assigneeName}. Reason: ${cleanReason}`]
    );
  });

  const recipients = [newAssocId, newHeadId].filter(Boolean);
  notificationService.notifyUsers({
    organizationId: lead.organization_id,
    recipientUserIds: recipients,
    eventType: lead.assigned_associate_id ? 'lead_reassigned' : 'lead_assigned',
    title: `Lead Assigned: ${lead.enquiry_ref}`,
    message: `Lead ${lead.enquiry_ref} has been assigned to you by ${user.name}. Reason: ${cleanReason}`,
    entityType: 'leads',
    entityId: lead.id
  }).catch(() => {});

  logActivity(req, 'ASSIGN_LEAD', 'leads', lead.id, `Assigned lead ${lead.enquiry_ref} (reason: ${cleanReason})`);
  return getLeadById(lead.id);
}

/**
 * Connect an existing Lead directly to Invitation + Site Visit modules without duplicate records.
 */
async function createInvitationForLead({ leadId, visitDate, visitTime, duration = 60, notes = '', theme = null, user, req }) {
  const lead = getLeadById(leadId);
  if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 });
  if (!canAccessLead(user, lead)) throw Object.assign(new Error('Unauthorized.'), { status: 403 });
  if (!visitDate || !visitTime) throw Object.assign(new Error('Visit date and time are required.'), { status: 400 });
  if (!lead.project_id) throw Object.assign(new Error('Lead must have a selected project before scheduling a site visit.'), { status: 400 });

  // Prevent duplicate active invitation/site visit if already linked
  if (lead.invitation_id) {
    const existingInv = db.get("SELECT id, status FROM invitations WHERE id = ? AND status NOT IN ('cancelled', 'expired')", [lead.invitation_id]);
    if (existingInv) {
      throw Object.assign(new Error('An active invitation is already linked to this lead.'), { status: 409 });
    }
  }

  const proj = db.get('SELECT * FROM projects WHERE id = ?', [lead.project_id]);
  if (!proj) throw Object.assign(new Error('Project not found.'), { status: 404 });

  const associateId = lead.assigned_associate_id || user.id;
  const salesHeadId = lead.assigned_sales_head_id || user.sales_head_id || null;
  const invId = 'inv-' + crypto.randomUUID().slice(0, 8);
  const visitId = 'vis-' + crypto.randomUUID().slice(0, 8);
  const shortCode = crypto.randomBytes(4).toString('base64url').replace(/[-_]/g, 'x').slice(0, 6).toUpperCase();
  const token = 'inv_' + crypto.randomBytes(18).toString('hex');
  const baseUrl = config.getBaseUrl(req);
  const shortUrl = `${baseUrl}/i/${shortCode}`;
  const checkInPayload = JSON.stringify({
    token,
    invitation_id: invId,
    customer_id: lead.customer_id,
    visit_date: visitDate,
    short_code: shortCode,
    short_url: shortUrl
  });
  const qrCodeData = await generateQRCodeDataURL(checkInPayload);

  db.transaction(() => {
    db.run(
      `INSERT INTO invitations (
        id, organization_id, token, short_code, customer_id, project_id, developer_id, associate_id, sales_head_id,
        visit_date, visit_time, duration, location, maps_url, size, price, notes, qr_code_data, theme, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [
        invId, lead.organization_id, token, shortCode, lead.customer_id, lead.project_id, proj.developer_id,
        associateId, salesHeadId, visitDate, visitTime, Number(duration || 60), proj.location,
        proj.google_maps_url || '', lead.apartment_size || proj.super_built_up_area || '',
        lead.budget || proj.starting_price || '', sanitizeText(notes, 1000) || lead.requirements || '',
        qrCodeData, theme || null
      ]
    );

    db.run(
      `INSERT INTO site_visits (
        id, organization_id, invitation_id, customer_id, project_id, associate_id, sales_head_id,
        scheduled_date, scheduled_time, duration, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')`,
      [
        visitId, lead.organization_id, invId, lead.customer_id, lead.project_id,
        associateId, salesHeadId, visitDate, visitTime, Number(duration || 60)
      ]
    );

    const prevStage = lead.stage;
    db.run(
      `UPDATE leads SET invitation_id = ?, site_visit_id = ?, stage = 'site_visit_scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [invId, visitId, lead.id]
    );

    if (prevStage !== 'site_visit_scheduled') {
      db.run(
        `INSERT INTO lead_stage_history (id, organization_id, lead_id, previous_stage, new_stage, changed_by, notes)
         VALUES (?, ?, ?, ?, 'site_visit_scheduled', ?, ?)`,
        [
          'lsh-' + crypto.randomUUID().slice(0, 8),
          lead.organization_id,
          lead.id,
          prevStage,
          user.id,
          `Scheduled site visit (${visitDate} ${visitTime}) & generated VIP invitation`
        ]
      );
    }

    db.run("UPDATE customers SET status = 'visit_scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [lead.customer_id]);
    db.run(
      `INSERT INTO customer_interactions (id, customer_id, user_id, interaction_type, notes)
       VALUES (?, ?, ?, 'Invitation Sent', ?)`,
      ['int-' + crypto.randomUUID().slice(0, 8), lead.customer_id, user.id, `Created invitation for ${proj.name} from Lead ${lead.enquiry_ref} on ${visitDate} at ${visitTime}`]
    );
  });

  const orgSettings = db.get('SELECT agency_name FROM organization_settings WHERE organization_id = ?', [lead.organization_id]);
  whatsappService.notifyInvitationCreated({
    organizationId: lead.organization_id,
    customerName: lead.customer_name,
    customerPhone: lead.customer_mobile,
    projectName: proj.name,
    visitDate,
    visitTime,
    invitationLink: shortUrl,
    agencyName: orgSettings?.agency_name || 'Visit Studio Realty'
  }).catch(() => {});

  notificationService.notifyUsers({
    organizationId: lead.organization_id,
    recipientUserIds: [associateId, salesHeadId].filter(Boolean),
    eventType: 'site_visit_scheduled',
    title: `Site Visit Scheduled (${lead.enquiry_ref})`,
    message: `Site visit scheduled for ${lead.customer_name} at ${proj.name} on ${visitDate} ${visitTime}.`,
    entityType: 'leads',
    entityId: lead.id
  }).catch(() => {});

  logActivity(req, 'LEAD_SCHEDULE_VISIT', 'leads', lead.id, `Created invitation ${invId} and visit ${visitId}`);
  return {
    lead: getLeadById(lead.id),
    invitation: { id: invId, token, short_code: shortCode, shortUrl, qr_code_data: qrCodeData },
    site_visit_id: visitId
  };
}

module.exports = {
  DEFAULT_LEAD_STAGES,
  generateEnquiryRef,
  getLeadById,
  canAccessLead,
  canAssignLead,
  submitPublicEnquiry,
  createStaffLead,
  changeLeadStage,
  assignLead,
  createInvitationForLead
};
