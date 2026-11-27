-- Rollback Migration 002: Lead Management System (SQLite)
-- Warning: Destructive for Lead Management tables only; preserves customers, invitations, site_visits, projects, users.

PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_notifications_user_read;
DROP INDEX IF EXISTS idx_leads_head;
DROP INDEX IF EXISTS idx_leads_assoc;
DROP INDEX IF EXISTS idx_leads_stage;
DROP INDEX IF EXISTS idx_leads_customer;
DROP INDEX IF EXISTS idx_leads_org;
DROP INDEX IF EXISTS idx_tracking_links_short_code;
DROP INDEX IF EXISTS idx_tracking_links_token;
DROP INDEX IF EXISTS idx_tracking_links_org;
DROP INDEX IF EXISTS idx_campaigns_org;
DROP INDEX IF EXISTS idx_followups_lead;
DROP INDEX IF EXISTS idx_customers_norm_mobile;

DROP TABLE IF EXISTS notification_logs;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS lead_assignments;
DROP TABLE IF EXISTS lead_stage_history;
DROP TABLE IF EXISTS campaign_events;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS lead_settings;
DROP TABLE IF EXISTS tracking_links;
DROP TABLE IF EXISTS campaigns;

-- Optional SQLite 3.35+ column drop (ignore errors on older SQLite builds)
ALTER TABLE followups DROP COLUMN reminder_sent_at;
ALTER TABLE followups DROP COLUMN completed_at;
ALTER TABLE followups DROP COLUMN lead_id;
ALTER TABLE customers DROP COLUMN original_source;
ALTER TABLE customers DROP COLUMN city;
ALTER TABLE customers DROP COLUMN normalized_mobile;

PRAGMA foreign_keys = ON;
