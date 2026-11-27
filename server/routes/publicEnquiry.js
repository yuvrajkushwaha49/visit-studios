const express = require('express');
const router = express.Router();
const { createRateLimiter } = require('../middleware/rateLimiter');
const {
  resolvePublicLinkByToken,
  buildPublicEnquiryFormPayload,
  recordCampaignEvent,
  hashVisitor
} = require('../services/trackingLinkService');
const { submitPublicEnquiry } = require('../services/leadService');
const { sanitizeText } = require('../validators/leadValidators');

// Strict rate limiters for public enquiry endpoints
const publicEnquiryViewLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please wait a moment and try again.' }
});

const publicEnquirySubmitLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: { error: 'Too many enquiry submissions from this network. Please try again in a few minutes.' }
});

// GET /api/public/enquiry/:token - Validate link and return safe form metadata
router.get('/:token', publicEnquiryViewLimiter, (req, res) => {
  try {
    const resolved = resolvePublicLinkByToken(req.params.token);
    if (resolved.error) {
      return res.status(resolved.status || 404).json({ error: resolved.error });
    }

    const link = resolved.link;
    const visitorHash = hashVisitor(req);
    const sessionId = sanitizeText(req.query.session_id, 128) || null;

    recordCampaignEvent({
      organizationId: link.organization_id,
      trackingLinkId: link.id,
      campaignId: link.campaign_id,
      eventType: 'link_opened',
      visitorHash,
      sessionId
    });

    return res.json({
      success: true,
      enquiryForm: buildPublicEnquiryFormPayload(link)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load enquiry form.' });
  }
});

// POST /api/public/enquiry/:token/start - Optional telemetry when user starts interacting with form
router.post('/:token/start', publicEnquiryViewLimiter, (req, res) => {
  try {
    const resolved = resolvePublicLinkByToken(req.params.token);
    if (resolved.error) {
      return res.status(resolved.status || 404).json({ error: resolved.error });
    }
    const link = resolved.link;
    recordCampaignEvent({
      organizationId: link.organization_id,
      trackingLinkId: link.id,
      campaignId: link.campaign_id,
      eventType: 'form_started',
      visitorHash: hashVisitor(req),
      sessionId: sanitizeText(req.body?.session_id, 128) || null
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record form start.' });
  }
});

// POST /api/public/enquiry/:token/submit - Validate and persist enquiry transactionally
router.post('/:token/submit', publicEnquirySubmitLimiter, (req, res) => {
  try {
    const confirmation = submitPublicEnquiry({
      token: req.params.token,
      body: req.body || {},
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your property enquiry has been registered.',
      confirmation
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || 'Unable to submit your enquiry.',
      ...(err.errors ? { errors: err.errors } : {})
    });
  }
});

module.exports = router;
