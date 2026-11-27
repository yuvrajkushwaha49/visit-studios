-- Rollback Migration 002: Lead Management System (MySQL 8.0+)
SET FOREIGN_KEY_CHECKS = 0;

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

ALTER TABLE followups
  DROP COLUMN IF EXISTS reminder_sent_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS lead_id;

ALTER TABLE customers
  DROP COLUMN IF EXISTS original_source,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS normalized_mobile;

SET FOREIGN_KEY_CHECKS = 1;
