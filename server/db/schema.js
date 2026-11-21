const schemaSQL = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'sales_head', 'sales_associate')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  sales_head_id TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  sales_head_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  company_logo TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  address TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  developer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  project_logo TEXT,
  banner_image TEXT,
  location TEXT NOT NULL,
  google_maps_url TEXT,
  description TEXT,
  carpet_area TEXT,
  built_up_area TEXT,
  super_built_up_area TEXT,
  starting_price TEXT,
  price_range TEXT,
  amenities TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_configurations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  carpet_area TEXT,
  super_built_up_area TEXT,
  price TEXT,
  bedrooms INTEGER DEFAULT 3,
  bathrooms INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  customer_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  budget TEXT,
  preferred_location TEXT,
  interested_project_id TEXT,
  configuration TEXT,
  lead_source TEXT DEFAULT 'Direct',
  requirements TEXT,
  assigned_associate_id TEXT,
  assigned_sales_head_id TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('lead', 'interested', 'visit_scheduled', 'visited', 'negotiation', 'booked', 'inactive', 'active')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (interested_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_associate_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_sales_head_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customer_interactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  user_id TEXT,
  interaction_type TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  developer_id TEXT,
  associate_id TEXT NOT NULL,
  sales_head_id TEXT,
  visit_date TEXT NOT NULL,
  visit_time TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  location TEXT NOT NULL,
  maps_url TEXT,
  size TEXT,
  price TEXT,
  notes TEXT,
  qr_code_data TEXT,
  short_code TEXT,
  theme TEXT,
  status TEXT DEFAULT 'sent' CHECK(status IN ('draft', 'sent', 'opened', 'confirmed', 'reschedule_requested', 'cancelled', 'expired')),
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE SET NULL,
  FOREIGN KEY (associate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_visits (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  invitation_id TEXT,
  customer_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  associate_id TEXT NOT NULL,
  sales_head_id TEXT,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('draft', 'invitation_sent', 'pending_confirmation', 'confirmed', 'reschedule_requested', 'rescheduled', 'cancelled', 'upcoming', 'checked_in', 'in_progress', 'completed', 'no_show')),
  check_in_time DATETIME,
  check_out_time DATETIME,
  check_in_method TEXT CHECK(check_in_method IN ('qr', 'manual', NULL)),
  authorized_staff_id TEXT,
  staff_notes TEXT,
  feedback_submitted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (associate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (authorized_staff_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  associate_id TEXT NOT NULL,
  sales_head_id TEXT,
  follow_up_date TEXT NOT NULL,
  follow_up_time TEXT,
  follow_up_type TEXT DEFAULT 'call' CHECK(follow_up_type IN ('call', 'whatsapp', 'visit', 'email', 'meeting')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'overdue', 'rescheduled', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (associate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  site_visit_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  interest_level TEXT CHECK(interest_level IN ('very_high', 'high', 'medium', 'low', 'not_interested')),
  budget_fit TEXT CHECK(budget_fit IN ('within_budget', 'flexible', 'over_budget')),
  sales_experience INTEGER CHECK(sales_experience BETWEEN 1 AND 5),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_visit_id) REFERENCES site_visits(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  category TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables TEXT,
  status TEXT DEFAULT 'approved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  template_name TEXT,
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT UNIQUE NOT NULL,
  agency_name TEXT DEFAULT 'Visit Studio Realty',
  agency_subtitle TEXT DEFAULT 'Luxury Real Estate Advisory',
  logo_url TEXT,
  brand_color TEXT DEFAULT '#29244d',
  accent_color TEXT DEFAULT '#f59e0b',
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token TEXT,
  whatsapp_business_account_id TEXT,
  webhook_verify_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS smtp_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT UNIQUE,
  host TEXT DEFAULT 'smtp.gmail.com',
  port INTEGER DEFAULT 587,
  secure INTEGER DEFAULT 0,
  username TEXT,
  password TEXT,
  from_name TEXT DEFAULT 'Workians Realty',
  from_email TEXT,
  public_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  temp_password TEXT,
  expires_at DATETIME NOT NULL,
  is_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for rapid querying and indexing
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_sales_head ON users(sales_head_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_assoc ON customers(assigned_associate_id);
CREATE INDEX IF NOT EXISTS idx_customers_head ON customers(assigned_sales_head_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_cust ON invitations(customer_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_org ON site_visits(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_assoc ON site_visits(associate_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_head ON site_visits(sales_head_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_status ON site_visits(status);
CREATE INDEX IF NOT EXISTS idx_followups_org ON followups(organization_id);
CREATE INDEX IF NOT EXISTS idx_followups_assoc ON followups(associate_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_logs(organization_id);
`;

module.exports = { schemaSQL };
