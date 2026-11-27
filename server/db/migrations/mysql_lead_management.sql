-- Migration 002: Lead Management System (MySQL 8.0+)
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS normalized_mobile VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS city VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS original_source VARCHAR(120) NULL;

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS lead_id VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  source_channel VARCHAR(100) DEFAULT 'Digital',
  description TEXT,
  status VARCHAR(32) DEFAULT 'active',
  start_date VARCHAR(32),
  end_date VARCHAR(32),
  created_by VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaigns_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tracking_links (
  id VARCHAR(64) PRIMARY KEY,
  token VARCHAR(128) UNIQUE NOT NULL,
  short_code VARCHAR(32) UNIQUE NOT NULL,
  organization_id VARCHAR(64) NOT NULL,
  creator_user_id VARCHAR(64) NOT NULL,
  creator_role VARCHAR(40) NOT NULL,
  owner_associate_id VARCHAR(64),
  owner_sales_head_id VARCHAR(64),
  project_id VARCHAR(64),
  campaign_id VARCHAR(64),
  title VARCHAR(255),
  source_name VARCHAR(120) DEFAULT 'Enquiry Link',
  is_active TINYINT DEFAULT 1,
  expires_at DATETIME NULL,
  deactivated_at DATETIME NULL,
  deactivated_by VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tl_org (organization_id),
  INDEX idx_tl_assoc (owner_associate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_settings (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) UNIQUE NOT NULL,
  campaigns_enabled TINYINT DEFAULT 1,
  admin_link_assignment_policy VARCHAR(40) DEFAULT 'unassigned',
  sales_head_link_assignment_policy VARCHAR(40) DEFAULT 'team_pool',
  duplicate_policy VARCHAR(64) DEFAULT 'link_existing_customer_preserve_owner',
  timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
  strict_stage_transitions TINYINT DEFAULT 1,
  stages_json LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) PRIMARY KEY,
  enquiry_ref VARCHAR(64) UNIQUE NOT NULL,
  organization_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64),
  configuration_id VARCHAR(64),
  apartment_size VARCHAR(120),
  budget VARCHAR(120),
  purchase_timeline VARCHAR(120),
  preferred_callback_time VARCHAR(120),
  city VARCHAR(120),
  requirements TEXT,
  contact_consent TINYINT DEFAULT 1,
  consent_timestamp DATETIME NULL,
  tracking_link_id VARCHAR(64),
  campaign_id VARCHAR(64),
  enquiry_source VARCHAR(120) DEFAULT 'Enquiry Link',
  attribution_locked TINYINT DEFAULT 1,
  original_link_owner_id VARCHAR(64),
  original_associate_id VARCHAR(64),
  original_sales_head_id VARCHAR(64),
  assigned_associate_id VARCHAR(64),
  assigned_sales_head_id VARCHAR(64),
  stage VARCHAR(40) DEFAULT 'new_lead',
  loss_reason TEXT,
  duplicate_status VARCHAR(64) DEFAULT 'unique',
  duplicate_of_lead_id VARCHAR(64),
  invitation_id VARCHAR(64),
  site_visit_id VARCHAR(64),
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_org (organization_id),
  INDEX idx_leads_customer (customer_id),
  INDEX idx_leads_stage (organization_id, stage),
  INDEX idx_leads_assoc (assigned_associate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS campaign_events (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  tracking_link_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(64),
  lead_id VARCHAR(64),
  event_type VARCHAR(48) NOT NULL,
  visitor_hash VARCHAR(128),
  session_id VARCHAR(128),
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ce_link (tracking_link_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_stage_history (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  previous_stage VARCHAR(40),
  new_stage VARCHAR(40) NOT NULL,
  changed_by VARCHAR(64),
  notes TEXT,
  loss_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lsh_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_assignments (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(64) NOT NULL,
  previous_owner_id VARCHAR(64),
  new_owner_id VARCHAR(64),
  previous_sales_head_id VARCHAR(64),
  new_sales_head_id VARCHAR(64),
  changed_by VARCHAR(64),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_la_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64),
  user_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  is_read TINYINT DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL,
  in_app_enabled TINYINT DEFAULT 1,
  email_enabled TINYINT DEFAULT 1,
  whatsapp_enabled TINYINT DEFAULT 0,
  events_json LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_logs (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64),
  notification_id VARCHAR(64),
  user_id VARCHAR(64),
  channel VARCHAR(32) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  dedupe_key VARCHAR(191),
  status VARCHAR(32) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_retry_at DATETIME NULL,
  error_message TEXT,
  payload LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
