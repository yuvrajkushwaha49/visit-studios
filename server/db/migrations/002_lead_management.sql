-- Migration 002: Full-Stack Lead Management System (SQLite)
-- Forward migration (non-destructive, idempotent)

ALTER TABLE customers ADD COLUMN normalized_mobile TEXT;
ALTER TABLE customers ADD COLUMN city TEXT;
ALTER TABLE customers ADD COLUMN original_source TEXT;
ALTER TABLE followups ADD COLUMN lead_id TEXT;
ALTER TABLE followups ADD COLUMN completed_at DATETIME;
ALTER TABLE followups ADD COLUMN reminder_sent_at DATETIME;

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  source_channel TEXT DEFAULT 'Digital',
  description TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
  start_date TEXT,
  end_date TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tracking_links (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  organization_id TEXT NOT NULL,
  creator_user_id TEXT NOT NULL,
  creator_role TEXT NOT NULL,
  owner_associate_id TEXT,
  owner_sales_head_id TEXT,
  project_id TEXT,
  campaign_id TEXT,
  title TEXT,
  source_name TEXT DEFAULT 'Enquiry Link',
  is_active INTEGER DEFAULT 1,
  expires_at DATETIME,
  deactivated_at DATETIME,
  deactivated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_associate_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (deactivated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT UNIQUE NOT NULL,
  campaigns_enabled INTEGER DEFAULT 1,
  admin_link_assignment_policy TEXT DEFAULT 'unassigned' CHECK(admin_link_assignment_policy IN ('unassigned', 'round_robin')),
  sales_head_link_assignment_policy TEXT DEFAULT 'team_pool' CHECK(sales_head_link_assignment_policy IN ('team_pool', 'round_robin')),
  duplicate_policy TEXT DEFAULT 'link_existing_customer_preserve_owner' CHECK(duplicate_policy IN ('link_existing_customer_preserve_owner', 'flag_for_review')),
  timezone TEXT DEFAULT 'Asia/Kolkata',
  strict_stage_transitions INTEGER DEFAULT 1,
  stages_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  enquiry_ref TEXT UNIQUE NOT NULL,
  organization_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  project_id TEXT,
  configuration_id TEXT,
  apartment_size TEXT,
  budget TEXT,
  purchase_timeline TEXT,
  preferred_callback_time TEXT,
  city TEXT,
  requirements TEXT,
  contact_consent INTEGER DEFAULT 1,
  consent_timestamp DATETIME,
  tracking_link_id TEXT,
  campaign_id TEXT,
  enquiry_source TEXT DEFAULT 'Enquiry Link',
  attribution_locked INTEGER DEFAULT 1,
  original_link_owner_id TEXT,
  original_associate_id TEXT,
  original_sales_head_id TEXT,
  assigned_associate_id TEXT,
  assigned_sales_head_id TEXT,
  stage TEXT DEFAULT 'new_lead' CHECK(stage IN ('new_lead', 'contacted', 'interested', 'site_visit_scheduled', 'site_visit_completed', 'negotiation', 'booked_won', 'lost')),
  loss_reason TEXT,
  duplicate_status TEXT DEFAULT 'unique' CHECK(duplicate_status IN ('unique', 'existing_customer_new_project', 'duplicate_flagged', 'reviewed_merged', 'reviewed_kept')),
  duplicate_of_lead_id TEXT,
  invitation_id TEXT,
  site_visit_id TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (configuration_id) REFERENCES project_configurations(id) ON DELETE SET NULL,
  FOREIGN KEY (tracking_link_id) REFERENCES tracking_links(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (original_link_owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (original_associate_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (original_sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_associate_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (duplicate_of_lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL,
  FOREIGN KEY (site_visit_id) REFERENCES site_visits(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  tracking_link_id TEXT NOT NULL,
  campaign_id TEXT,
  lead_id TEXT,
  event_type TEXT NOT NULL CHECK(event_type IN ('link_created', 'link_opened', 'form_started', 'enquiry_submitted', 'submission_successful', 'submission_rejected', 'duplicate_detected')),
  visitor_hash TEXT,
  session_id TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (tracking_link_id) REFERENCES tracking_links(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead_stage_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  changed_by TEXT,
  notes TEXT,
  loss_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  previous_owner_id TEXT,
  new_owner_id TEXT,
  previous_sales_head_id TEXT,
  new_sales_head_id TEXT,
  changed_by TEXT,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (previous_owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (new_owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (previous_sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (new_sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  in_app_enabled INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  whatsapp_enabled INTEGER DEFAULT 0,
  events_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  notification_id TEXT,
  user_id TEXT,
  channel TEXT NOT NULL CHECK(channel IN ('in_app', 'email', 'whatsapp')),
  event_type TEXT NOT NULL,
  dedupe_key TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'retrying')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at DATETIME,
  error_message TEXT,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_norm_mobile ON customers(organization_id, normalized_mobile);
CREATE INDEX IF NOT EXISTS idx_followups_lead ON followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_org ON tracking_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_token ON tracking_links(token);
CREATE INDEX IF NOT EXISTS idx_tracking_links_short_code ON tracking_links(short_code);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(organization_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_assoc ON leads(assigned_associate_id);
CREATE INDEX IF NOT EXISTS idx_leads_head ON leads(assigned_sales_head_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at);
