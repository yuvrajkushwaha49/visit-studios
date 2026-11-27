// Validators & Business Rules for Visit Studio Lead Management System

const DEFAULT_LEAD_STAGES = [
  { key: 'new_lead', label: 'New Lead', order: 1, color: '#2563eb', terminal: false },
  { key: 'contacted', label: 'Contacted', order: 2, color: '#7c3aed', terminal: false },
  { key: 'interested', label: 'Interested', order: 3, color: '#0891b2', terminal: false },
  { key: 'site_visit_scheduled', label: 'Site Visit Scheduled', order: 4, color: '#d97706', terminal: false },
  { key: 'site_visit_completed', label: 'Site Visit Completed', order: 5, color: '#059669', terminal: false },
  { key: 'negotiation', label: 'Negotiation', order: 6, color: '#db2777', terminal: false },
  { key: 'booked_won', label: 'Booked / Won', order: 7, color: '#15803d', terminal: true },
  { key: 'lost', label: 'Lost', order: 8, color: '#b91c1c', terminal: true }
];

const ALLOWED_STAGE_TRANSITIONS = {
  new_lead: ['contacted', 'interested', 'site_visit_scheduled', 'lost'],
  contacted: ['interested', 'site_visit_scheduled', 'negotiation', 'lost'],
  interested: ['site_visit_scheduled', 'site_visit_completed', 'negotiation', 'lost'],
  site_visit_scheduled: ['site_visit_completed', 'negotiation', 'lost'],
  site_visit_completed: ['negotiation', 'booked_won', 'site_visit_scheduled', 'lost'],
  negotiation: ['booked_won', 'site_visit_scheduled', 'lost'],
  booked_won: [],
  lost: ['contacted', 'interested']
};

const STAGE_TO_CUSTOMER_STATUS = {
  new_lead: 'lead',
  contacted: 'lead',
  interested: 'interested',
  site_visit_scheduled: 'visit_scheduled',
  site_visit_completed: 'visited',
  negotiation: 'negotiation',
  booked_won: 'booked',
  lost: 'inactive'
};

function sanitizeText(value, maxLength = 500) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function normalizeMobile(rawMobile) {
  const rawStr = String(rawMobile || '').trim();
  const hasPlus = rawStr.startsWith('+');
  const digits = rawStr.replace(/\D/g, '');
  const normalized10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const cleanInternational = hasPlus ? `+${digits}` : (digits.length === 10 ? `+91${digits}` : digits);
  const isValid = digits.length >= 10 && digits.length <= 15 && !/^0+$/.test(normalized10);
  return {
    rawClean: cleanInternational,
    digits,
    normalized10,
    isValid
  };
}

function isValidEmail(email) {
  if (!email) return true; // optional unless required by caller
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

function validatePublicEnquiryPayload(body = {}) {
  const errors = [];

  // Bot/spam honeypot check
  if (body.website_url || body.hp_field || body.company_fax) {
    return { valid: false, isSpam: true, errors: ['Submission rejected by spam protection.'] };
  }

  const full_name = sanitizeText(body.full_name, 120);
  if (!full_name || full_name.length < 2) {
    errors.push('Full name is required (minimum 2 characters).');
  }

  const mobile = normalizeMobile(body.mobile_number);
  if (!mobile.isValid) {
    errors.push('Please enter a valid 10 to 15 digit mobile number.');
  }

  const email = sanitizeText(body.email, 160).toLowerCase();
  if (email && !isValidEmail(email)) {
    errors.push('Please enter a valid email address.');
  }

  const city = sanitizeText(body.city || body.current_city, 100);
  if (!city || city.length < 2) {
    errors.push('Current city is required.');
  }

  const project_id = sanitizeText(body.project_id, 64) || null;
  const configuration_id = sanitizeText(body.configuration_id, 64) || null;
  const apartment_size = sanitizeText(body.apartment_size || body.configuration, 120);
  if (!apartment_size && !configuration_id) {
    errors.push('Please select an apartment size or configuration.');
  }

  const purchase_timeline = sanitizeText(body.purchase_timeline, 120);
  if (!purchase_timeline) {
    errors.push('Please select your purchase timeline.');
  }

  const preferred_callback_time = sanitizeText(body.preferred_callback_time, 120);
  if (!preferred_callback_time) {
    errors.push('Please select a preferred callback time.');
  }

  const budget = sanitizeText(body.budget, 120);
  const requirements = sanitizeText(body.requirements || body.additional_requirements, 1000);
  const contact_consent = body.contact_consent === true || body.contact_consent === 1 || body.contact_consent === 'true' || body.contact_consent === '1';
  if (!contact_consent) {
    errors.push('Contact consent is required to submit your enquiry.');
  }

  return {
    valid: errors.length === 0,
    isSpam: false,
    errors,
    data: {
      full_name,
      mobile_number: mobile.rawClean,
      normalized_mobile: mobile.normalized10,
      email,
      city,
      project_id,
      configuration_id,
      apartment_size,
      budget,
      purchase_timeline,
      preferred_callback_time,
      requirements,
      contact_consent: contact_consent ? 1 : 0,
      session_id: sanitizeText(body.session_id, 128) || null
    }
  };
}

function validateStageTransition(currentStage, nextStage, { strict = true, lossReason = '' } = {}) {
  const validStageKeys = new Set(DEFAULT_LEAD_STAGES.map(s => s.key));
  if (!validStageKeys.has(nextStage)) {
    return { valid: false, error: `Invalid lead stage '${nextStage}'.` };
  }
  if (currentStage === nextStage) {
    return { valid: false, error: 'Lead is already in this stage.' };
  }
  if (nextStage === 'lost' && !sanitizeText(lossReason, 500)) {
    return { valid: false, error: 'A loss reason is required when marking a lead as Lost.' };
  }
  if (strict) {
    const allowedNext = ALLOWED_STAGE_TRANSITIONS[currentStage] || [];
    if (!allowedNext.includes(nextStage)) {
      return {
        valid: false,
        error: `Invalid stage transition from '${currentStage}' to '${nextStage}'. Allowed: ${allowedNext.length ? allowedNext.join(', ') : 'none (terminal stage)'}.`
      };
    }
  }
  return { valid: true };
}

function sanitizeIdList(value, maxItems = 50) {
  return [...new Set(
    String(value || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => /^[A-Za-z0-9_-]{1,80}$/.test(s))
  )].slice(0, maxItems);
}

module.exports = {
  DEFAULT_LEAD_STAGES,
  ALLOWED_STAGE_TRANSITIONS,
  STAGE_TO_CUSTOMER_STATUS,
  sanitizeText,
  normalizeMobile,
  isValidEmail,
  validatePublicEnquiryPayload,
  validateStageTransition,
  sanitizeIdList
};
