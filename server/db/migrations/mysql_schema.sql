-- Visit Studio - Real Estate Property Visit Management Platform
-- Production MySQL 8.0+ Relational Schema

CREATE DATABASE IF NOT EXISTS visit_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE visit_studio;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NULL,
  role ENUM('super_admin', 'admin', 'sales_head', 'sales_associate') NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  sales_head_id VARCHAR(64) NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_org (organization_id),
  INDEX idx_users_role (role),
  INDEX idx_users_head (sales_head_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  sales_head_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS developers (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_logo LONGTEXT,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  website VARCHAR(500),
  address TEXT,
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  developer_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  project_logo LONGTEXT,
  banner_image LONGTEXT,
  location VARCHAR(500) NOT NULL,
  google_maps_url TEXT,
  description TEXT,
  carpet_area VARCHAR(100),
  built_up_area VARCHAR(100),
  super_built_up_area VARCHAR(100),
  starting_price VARCHAR(100),
  price_range VARCHAR(100),
  amenities TEXT,
  status ENUM('active', 'inactive', 'sold_out') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_configurations (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  carpet_area VARCHAR(100),
  super_built_up_area VARCHAR(100),
  price VARCHAR(100),
  bedrooms INT DEFAULT 3,
  bathrooms INT DEFAULT 3,
  status VARCHAR(50) DEFAULT 'active',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  customer_code VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(50) NOT NULL,
  whatsapp_number VARCHAR(50),
  email VARCHAR(255),
  budget VARCHAR(100),
  preferred_location VARCHAR(255),
  interested_project_id VARCHAR(64),
  configuration VARCHAR(100),
  lead_source VARCHAR(100) DEFAULT 'Direct',
  requirements TEXT,
  assigned_associate_id VARCHAR(64),
  assigned_sales_head_id VARCHAR(64),
  status ENUM('lead', 'interested', 'visit_scheduled', 'visited', 'negotiation', 'booked', 'inactive', 'active') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_org (organization_id),
  INDEX idx_customers_mobile (mobile_number),
  INDEX idx_customers_assoc (assigned_associate_id),
  INDEX idx_customers_head (assigned_sales_head_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (interested_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_associate_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_sales_head_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_interactions (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  interaction_type VARCHAR(100) NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  token VARCHAR(128) UNIQUE NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  developer_id VARCHAR(64),
  associate_id VARCHAR(64) NOT NULL,
  sales_head_id VARCHAR(64),
  visit_date DATE NOT NULL,
  visit_time VARCHAR(20) NOT NULL,
  duration INT DEFAULT 60,
  location VARCHAR(500) NOT NULL,
  maps_url TEXT,
  size VARCHAR(100),
  price VARCHAR(100),
  notes TEXT,
  qr_code_data LONGTEXT,
  status ENUM('draft', 'sent', 'opened', 'confirmed', 'reschedule_requested', 'cancelled', 'expired') DEFAULT 'sent',
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invitations_token (token),
  INDEX idx_invitations_org (organization_id),
  INDEX idx_invitations_customer (customer_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE SET NULL,
  FOREIGN KEY (associate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_visits (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  invitation_id VARCHAR(64),
  customer_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  associate_id VARCHAR(64) NOT NULL,
  sales_head_id VARCHAR(64),
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20) NOT NULL,
  duration INT DEFAULT 60,
  status ENUM('draft', 'invitation_sent', 'pending_confirmation', 'confirmed', 'reschedule_requested', 'rescheduled', 'cancelled', 'upcoming', 'checked_in', 'in_progress', 'completed', 'no_show') DEFAULT 'upcoming',
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  check_in_method ENUM('qr', 'manual') NULL,
  authorized_staff_id VARCHAR(64),
  staff_notes TEXT,
  feedback_submitted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_site_visits_org (organization_id),
  INDEX idx_site_visits_assoc (associate_id),
  INDEX idx_site_visits_head (sales_head_id),
  INDEX idx_site_visits_status (status),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (associate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (authorized_staff_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  associate_id VARCHAR(64) NOT NULL,
  sales_head_id VARCHAR(64),
  follow_up_date DATE NOT NULL,
  follow_up_time VARCHAR(20),
  follow_up_type ENUM('call', 'whatsapp', 'visit', 'email', 'meeting') DEFAULT 'call',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  notes TEXT NOT NULL,
  status ENUM('pending', 'completed', 'overdue', 'rescheduled', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_followups_org (organization_id),
  INDEX idx_followups_assoc (associate_id),
  INDEX idx_followups_status (status),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (associate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(64) PRIMARY KEY,
  site_visit_id VARCHAR(64) UNIQUE NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  rating INT NOT NULL,
  interest_level ENUM('very_high', 'high', 'medium', 'low', 'not_interested'),
  budget_fit ENUM('within_budget', 'flexible', 'over_budget'),
  sales_experience INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_visit_id) REFERENCES site_visits(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  body_text TEXT NOT NULL,
  variables TEXT,
  status VARCHAR(50) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL,
  template_name VARCHAR(100),
  message_body TEXT NOT NULL,
  status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64),
  user_id VARCHAR(64),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(64),
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_org (organization_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organization_settings (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) UNIQUE NOT NULL,
  agency_name VARCHAR(255) DEFAULT 'Visit Studio Realty',
  agency_subtitle VARCHAR(255) DEFAULT 'Luxury Real Estate Advisory',
  logo_url LONGTEXT,
  brand_color VARCHAR(20) DEFAULT '#29244d',
  accent_color VARCHAR(20) DEFAULT '#f59e0b',
  whatsapp_phone_number_id VARCHAR(100),
  whatsapp_access_token TEXT,
  whatsapp_business_account_id VARCHAR(100),
  webhook_verify_token VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
