const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { sanitizeText } = require('../validators/leadValidators');

function generateSecureToken() {
  return 'enq_' + crypto.randomBytes(24).toString('hex');
}

function generateShortCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

function hashVisitor(req) {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown';
  const ua = req?.headers?.['user-agent'] || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 32);
}

function getOrgLeadSettings(organizationId) {
  let settings = db.get('SELECT * FROM lead_settings WHERE organization_id = ?', [organizationId]);
  if (!settings) {
    const id = 'lset-' + crypto.randomUUID().slice(0, 8);
    db.run(
      `INSERT OR IGNORE INTO lead_settings (id, organization_id, campaigns_enabled, admin_link_assignment_policy, sales_head_link_assignment_policy, duplicate_policy, timezone, strict_stage_transitions)
       VALUES (?, ?, 1, 'unassigned', 'team_pool', 'link_existing_customer_preserve_owner', 'Asia/Kolkata', 1)`,
      [id, organizationId]
    );
    settings = db.get('SELECT * FROM lead_settings WHERE organization_id = ?', [organizationId]);
  }
  return settings;
}

function createTrackingLink({
  user,
  organizationId,
  projectId = null,
  campaignId = null,
  title = '',
  sourceName = 'Enquiry Link',
  linkType = 'advisor',
  advisorDisplayName = null,
  advisorDisplayPhone = null,
  expiresAt = null,
  ownerAssociateId = null
}) {
  const orgId = user.role === 'super_admin' ? (organizationId || user.organization_id) : user.organization_id;
  if (!orgId) {
    throw Object.assign(new Error('Organization context is required to generate an enquiry link.'), { status: 400 });
  }

  if (projectId) {
    const proj = db.get('SELECT id, organization_id, name FROM projects WHERE id = ? AND organization_id = ?', [projectId, orgId]);
    if (!proj) {
      throw Object.assign(new Error('Selected project does not belong to your organization.'), { status: 400 });
    }
  }

  if (campaignId) {
    const camp = db.get('SELECT id, organization_id, name FROM campaigns WHERE id = ? AND organization_id = ?', [campaignId, orgId]);
    if (!camp) {
      throw Object.assign(new Error('Selected campaign does not belong to your organization.'), { status: 400 });
    }
  }

  // Server-side attribution ownership resolution — never trust arbitrary client user IDs
  let resolvedOwnerAssocId = null;
  let resolvedOwnerHeadId = null;

  if (user.role === 'sales_associate') {
    resolvedOwnerAssocId = user.id;
    resolvedOwnerHeadId = user.sales_head_id || null;
  } else if (user.role === 'sales_head') {
    resolvedOwnerHeadId = user.id;
    if (ownerAssociateId) {
      const targetAssoc = db.get(
        "SELECT id, sales_head_id FROM users WHERE id = ? AND organization_id = ? AND role = 'sales_associate' AND status = 'active'",
        [ownerAssociateId, orgId]
      );
      if (!targetAssoc || targetAssoc.sales_head_id !== user.id) {
        throw Object.assign(new Error('Sales Head can only create associate-owned links for associates in their own team.'), { status: 403 });
      }
      resolvedOwnerAssocId = targetAssoc.id;
    }
  } else if (user.role === 'admin' || user.role === 'super_admin') {
    if (ownerAssociateId) {
      const targetAssoc = db.get(
        "SELECT id, sales_head_id FROM users WHERE id = ? AND organization_id = ? AND role = 'sales_associate' AND status = 'active'",
        [ownerAssociateId, orgId]
      );
      if (!targetAssoc) {
        throw Object.assign(new Error('Target associate not found in organization.'), { status: 400 });
      }
      resolvedOwnerAssocId = targetAssoc.id;
      resolvedOwnerHeadId = targetAssoc.sales_head_id || null;
    }
  }

  let parsedExpiresAt = null;
  if (expiresAt) {
    const dt = new Date(expiresAt);
    if (Number.isNaN(dt.getTime())) {
      throw Object.assign(new Error('Invalid expiration date format.'), { status: 400 });
    }
    parsedExpiresAt = dt.toISOString().replace('T', ' ').slice(0, 19);
  }

  const normalizedLinkType = sanitizeText(linkType, 40) === 'bulk_whatsapp' ? 'bulk_whatsapp' : 'advisor';
  if (normalizedLinkType === 'bulk_whatsapp' && !['admin', 'super_admin'].includes(user.role)) {
    throw Object.assign(new Error('Only Admin users can create Bulk WhatsApp Marketing links.'), { status: 403 });
  }
  const resolvedSourceName = normalizedLinkType === 'bulk_whatsapp'
    ? (sanitizeText(sourceName, 100) && sanitizeText(sourceName, 100) !== 'Enquiry Link'
        ? sanitizeText(sourceName, 100)
        : 'Bulk WhatsApp Marketing')
    : (sanitizeText(sourceName, 100) || 'Enquiry Link');
  const resolvedAdvisorDisplayName = normalizedLinkType === 'bulk_whatsapp'
    ? (sanitizeText(advisorDisplayName, 120) || 'Aishwarya')
    : (sanitizeText(advisorDisplayName, 120) || null);
  const resolvedAdvisorDisplayPhone = normalizedLinkType === 'bulk_whatsapp'
    ? (sanitizeText(advisorDisplayPhone, 32) || '9289846060')
    : (sanitizeText(advisorDisplayPhone, 32) || null);

  const linkId = 'lnk-' + crypto.randomUUID().slice(0, 8);
  const token = generateSecureToken();
  const shortCode = generateShortCode();

  db.transaction(() => {
    db.run(
      `INSERT INTO tracking_links (
        id, token, short_code, organization_id, creator_user_id, creator_role,
        owner_associate_id, owner_sales_head_id, project_id, campaign_id,
        title, source_name, link_type, advisor_display_name, advisor_display_phone, is_active, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        linkId,
        token,
        shortCode,
        orgId,
        user.id,
        user.role,
        resolvedOwnerAssocId,
        resolvedOwnerHeadId,
        projectId || null,
        campaignId || null,
        sanitizeText(title, 180) || null,
        resolvedSourceName,
        normalizedLinkType,
        resolvedAdvisorDisplayName,
        resolvedAdvisorDisplayPhone,
        parsedExpiresAt
      ]
    );

    db.run(
      `INSERT INTO campaign_events (id, organization_id, tracking_link_id, campaign_id, event_type, metadata)
       VALUES (?, ?, ?, ?, 'link_created', ?)`,
      [
        'evt-' + crypto.randomUUID().slice(0, 8),
        orgId,
        linkId,
        campaignId || null,
        JSON.stringify({ creator_role: user.role, project_id: projectId || null, link_type: normalizedLinkType })
      ]
    );
  });

  return getTrackingLinkById(linkId);
}

function getTrackingLinkById(linkId) {
  return db.get(
    `SELECT tl.*,
       p.name as project_name,
       p.location as project_location,
       d.name as developer_name,
       c.name as campaign_name,
       uc.name as creator_name,
       ua.name as owner_associate_name,
       uh.name as owner_sales_head_name,
       o.name as organization_name,
       (SELECT COUNT(*) FROM campaign_events ce WHERE ce.tracking_link_id = tl.id AND ce.event_type = 'link_opened') as total_opens,
       (SELECT COUNT(DISTINCT ce.visitor_hash) FROM campaign_events ce WHERE ce.tracking_link_id = tl.id AND ce.event_type = 'link_opened' AND ce.visitor_hash IS NOT NULL) as unique_opens,
       (SELECT COUNT(*) FROM campaign_events ce WHERE ce.tracking_link_id = tl.id AND ce.event_type = 'form_started') as form_starts,
       (SELECT COUNT(*) FROM leads l WHERE l.tracking_link_id = tl.id) as total_submissions,
       (SELECT COUNT(DISTINCT l.customer_id) FROM leads l WHERE l.tracking_link_id = tl.id) as unique_submissions
     FROM tracking_links tl
     LEFT JOIN projects p ON tl.project_id = p.id
     LEFT JOIN developers d ON p.developer_id = d.id
     LEFT JOIN campaigns c ON tl.campaign_id = c.id
     LEFT JOIN users uc ON tl.creator_user_id = uc.id
     LEFT JOIN users ua ON tl.owner_associate_id = ua.id
     LEFT JOIN users uh ON tl.owner_sales_head_id = uh.id
     LEFT JOIN organizations o ON tl.organization_id = o.id
     WHERE tl.id = ?`,
    [linkId]
  );
}

function canAccessTrackingLink(user, link) {
  if (!link) return false;
  if (user.role === 'super_admin') return true;
  if (link.organization_id !== user.organization_id) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'sales_head') {
    if (link.creator_user_id === user.id || link.owner_sales_head_id === user.id) return true;
    if (link.owner_associate_id) {
      const assoc = db.get('SELECT sales_head_id FROM users WHERE id = ?', [link.owner_associate_id]);
      if (assoc && assoc.sales_head_id === user.id) return true;
    }
    return false;
  }
  if (user.role === 'sales_associate') {
    return link.creator_user_id === user.id || link.owner_associate_id === user.id;
  }
  return false;
}

function resolvePublicLinkByToken(tokenOrCode) {
  const clean = sanitizeText(tokenOrCode, 128);
  if (!clean) return { error: 'Tracking token is required.', status: 400 };

  const link = db.get(
    `SELECT tl.*,
       o.name as organization_name,
       o.status as organization_status,
       os.agency_name,
       os.agency_subtitle,
       os.logo_url as agency_logo,
       os.brand_color,
       os.accent_color,
       c.name as campaign_name,
       ua.name as owner_associate_name,
       ua.phone as owner_associate_phone,
       uh.name as owner_sales_head_name,
       uh.phone as owner_sales_head_phone,
       uc.name as creator_name,
       uc.phone as creator_phone
     FROM tracking_links tl
     JOIN organizations o ON tl.organization_id = o.id
     LEFT JOIN organization_settings os ON tl.organization_id = os.organization_id
     LEFT JOIN campaigns c ON tl.campaign_id = c.id
     LEFT JOIN users ua ON tl.owner_associate_id = ua.id
     LEFT JOIN users uh ON tl.owner_sales_head_id = uh.id
     LEFT JOIN users uc ON tl.creator_user_id = uc.id
     WHERE tl.token = ? OR UPPER(tl.short_code) = UPPER(?)
     LIMIT 1`,
    [clean, clean]
  );

  if (!link) {
    return { error: 'This enquiry link is invalid or could not be found.', status: 404 };
  }
  if (link.organization_status !== 'active') {
    return { error: 'This enquiry portal is currently unavailable.', status: 410 };
  }
  if (!link.is_active) {
    return { error: 'This enquiry link has been deactivated.', status: 410 };
  }
  if (link.expires_at) {
    const exp = new Date(String(link.expires_at).replace(' ', 'T') + (String(link.expires_at).includes('Z') ? '' : 'Z'));
    if (!Number.isNaN(exp.getTime()) && exp.getTime() <= Date.now()) {
      return { error: 'This enquiry link has expired.', status: 410 };
    }
  }

  return { link };
}

function buildPublicEnquiryFormPayload(link) {
  let projectsSql = `
    SELECT p.id, p.name, p.location, p.description, p.starting_price, p.price_range,
           p.super_built_up_area, p.carpet_area, p.amenities, p.project_logo,
           d.name as developer_name, d.company_logo as developer_logo
    FROM projects p
    LEFT JOIN developers d ON p.developer_id = d.id
    WHERE p.organization_id = ? AND p.status = 'active'
  `;
  const params = [link.organization_id];
  if (link.project_id) {
    projectsSql += ' AND p.id = ?';
    params.push(link.project_id);
  }
  projectsSql += ' ORDER BY p.name ASC';
  const projects = db.all(projectsSql, params);

  for (const proj of projects) {
    proj.configurations = db.all(
      "SELECT id, name, carpet_area, super_built_up_area, price, bedrooms, bathrooms FROM project_configurations WHERE project_id = ? AND status = 'active' ORDER BY bedrooms ASC, name ASC",
      [proj.id]
    );
  }

  // Never expose internal database IDs of orgs/users in public response
  return {
    token: link.token,
    short_code: link.short_code,
    title: link.title || 'Private Property Enquiry',
    source_name: link.source_name || 'Enquiry Link',
    link_type: link.link_type || 'advisor',
    campaign_name: link.campaign_name || null,
    project_locked: Boolean(link.project_id),
    advisor_display_name: link.link_type === 'bulk_whatsapp'
      ? (link.advisor_display_name || 'Aishwarya')
      : (link.advisor_display_name || link.owner_associate_name || link.owner_sales_head_name || link.creator_name || 'Property Advisory Desk'),
    advisor_display_phone: link.link_type === 'bulk_whatsapp'
      ? (link.advisor_display_phone || '9289846060')
      : (link.advisor_display_phone || link.owner_associate_phone || link.owner_sales_head_phone || link.creator_phone || ''),
    agency_name: link.agency_name || link.organization_name || 'Prestige Property Advisory',
    agency_subtitle: link.agency_subtitle || 'Luxury Real Estate Advisory',
    agency_logo: link.agency_logo || null,
    brand_color: link.brand_color || '#1f1b3b',
    accent_color: link.accent_color || '#f59e0b',
    projects
  };
}

function recordCampaignEvent({ organizationId, trackingLinkId, campaignId = null, leadId = null, eventType, visitorHash = null, sessionId = null, metadata = null }) {
  try {
    db.run(
      `INSERT INTO campaign_events (id, organization_id, tracking_link_id, campaign_id, lead_id, event_type, visitor_hash, session_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'evt-' + crypto.randomUUID().slice(0, 8),
        organizationId,
        trackingLinkId,
        campaignId || null,
        leadId || null,
        eventType,
        visitorHash || null,
        sessionId || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
  } catch (err) {
    console.error('Failed to record campaign event:', err.message);
  }
}

function buildLinkShareUrls(req, link) {
  const baseUrl = config.getBaseUrl(req);
  const shortUrl = `${baseUrl}/e/${link.short_code}`;
  const fullUrl = `${baseUrl}/?enquiry=${link.token}`;
  const projectLabel = link.project_name ? ` for ${link.project_name}` : '';
  const whatsappText = `Hello! Explore exclusive residences${projectLabel} and share your preferences via this private enquiry link: ${shortUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  return { shortUrl, fullUrl, whatsappShareUrl };
}

module.exports = {
  generateSecureToken,
  generateShortCode,
  hashVisitor,
  getOrgLeadSettings,
  createTrackingLink,
  getTrackingLinkById,
  canAccessTrackingLink,
  resolvePublicLinkByToken,
  buildPublicEnquiryFormPayload,
  recordCampaignEvent,
  buildLinkShareUrls
};
