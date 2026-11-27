# Database Schema & Data Persistence — Visit Studio

## 1. Database Architecture & Technologies

The persistence tier utilizes a dual-database pattern:

1. **Primary Store — Embedded SQLite 3 (`node:sqlite`)**:
   - Engine: Native Node.js `node:sqlite` via `DatabaseSync`.
   - File Path: `server/data/visit_studio.db`.
   - Concurrency & Reliability Mode: `PRAGMA journal_mode = WAL;` (Write-Ahead Logging) and `PRAGMA foreign_keys = ON;`.
   - Initialization: Automated on server startup via `server/db/schema.js`.
2. **Enterprise Secondary Store — MySQL 8 (`mysql2/promise`)**:
   - Driver: `mysql2` connection pool.
   - Dual-Sync Engine: `server/db/mysql.js`. Every mutation (`INSERT`, `UPDATE`, `DELETE`) executed on SQLite is mapped and asynchronously synced to MySQL table structures.
   - Reference DDL Migration: `server/db/migrations/mysql_schema.sql`.

*Safety Note: Credentials, database passwords, and connection strings are externalized into environment variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) and never committed.*

---

## 2. Table Catalog & Schema Definitions

### 2.1. `organizations`
Multi-tenant organizational accounts.
- `id` (TEXT, PK): Unique organization UUID.
- `name` (TEXT, NOT NULL): Legal / business name.
- `slug` (TEXT, UNIQUE NOT NULL): Subdomain / URL slug.
- `phone` (TEXT), `email` (TEXT), `address` (TEXT): Business contact details.
- `status` (TEXT, DEFAULT 'active'): Tenant lifecycle state.
- `created_at`, `updated_at` (DATETIME).

### 2.2. `organization_settings`
Organization branding, white-label configs, and WhatsApp Gateway parameters.
- `id` (TEXT, PK): Unique record identifier.
- `organization_id` (TEXT, UNIQUE NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `agency_name` (TEXT, DEFAULT 'Visit Studio Realty').
- `agency_subtitle` (TEXT, DEFAULT 'Luxury Real Estate Advisory').
- `logo_url` (TEXT): Agency brand logo asset path or URL.
- `brand_color` (TEXT, DEFAULT '#29244d'), `accent_color` (TEXT, DEFAULT '#f59e0b').
- `whatsapp_phone_number_id` (TEXT), `whatsapp_access_token` (TEXT), `whatsapp_business_account_id` (TEXT), `webhook_verify_token` (TEXT): Config keys.
- `created_at`, `updated_at` (DATETIME).

### 2.3. `users`
Application operators, sales managers, and administrators.
- `id` (TEXT, PK): User UUID.
- `organization_id` (TEXT, FK -> `organizations(id)` ON DELETE CASCADE).
- `role` (TEXT, NOT NULL, CHECK in `super_admin`, `admin`, `sales_head`, `sales_associate`).
- `name` (TEXT, NOT NULL).
- `email` (TEXT, UNIQUE NOT NULL).
- `phone` (TEXT).
- `password_hash` (TEXT, NOT NULL): Salted bcrypt password hash.
- `sales_head_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL): Hierarchical manager.
- `status` (TEXT, DEFAULT 'active', CHECK in `active`, `inactive`, `suspended`).
- `created_at`, `updated_at` (DATETIME).

### 2.4. `teams`
Sales team groupings managed by Sales Heads.
- `id` (TEXT, PK): Team UUID.
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `sales_head_id` (TEXT, NOT NULL, FK -> `users(id)` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Team title.
- `description` (TEXT).
- `created_at` (DATETIME).

### 2.5. `developers`
Real estate builders and developer companies.
- `id` (TEXT, PK): Developer UUID.
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Developer corporate name (e.g., DLF Luxury, Godrej).
- `company_logo` (TEXT), `website` (TEXT), `address` (TEXT), `description` (TEXT).
- `contact_name` (TEXT), `contact_phone` (TEXT), `contact_email` (TEXT).
- `status` (TEXT, DEFAULT 'active').
- `created_at` (DATETIME).

### 2.6. `projects`
Property developments, residences, and townships.
- `id` (TEXT, PK): Project UUID.
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `developer_id` (TEXT, NOT NULL, FK -> `developers(id)` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Project name (e.g., The Arbour, Camellias).
- `project_logo` (TEXT), `banner_image` (TEXT).
- `location` (TEXT, NOT NULL): Physical address or Sector/City.
- `google_maps_url` (TEXT): Deep navigation coordinates or URL.
- `description` (TEXT), `amenities` (TEXT).
- `carpet_area` (TEXT), `built_up_area` (TEXT), `super_built_up_area` (TEXT).
- `starting_price` (TEXT), `price_range` (TEXT).
- `status` (TEXT, DEFAULT 'active').
- `created_at` (DATETIME).

### 2.7. `project_configurations`
Specific unit configurations within projects (BHK variants, sizes, unit pricing).
- `id` (TEXT, PK): Configuration UUID.
- `project_id` (TEXT, NOT NULL, FK -> `projects(id)` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Unit label (e.g., "4 BHK Presidential Suite").
- `carpet_area` (TEXT), `super_built_up_area` (TEXT), `price` (TEXT).
- `bedrooms` (INTEGER, DEFAULT 3), `bathrooms` (INTEGER, DEFAULT 3).
- `status` (TEXT, DEFAULT 'active').

### 2.8. `customers`
Client profiles and CRM registry.
- `id` (TEXT, PK): Customer UUID.
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `customer_code` (TEXT, NOT NULL): Auto-generated human reference code (e.g. `CUST-1001`).
- `full_name` (TEXT, NOT NULL), `mobile_number` (TEXT, NOT NULL), `whatsapp_number` (TEXT), `email` (TEXT).
- `budget` (TEXT), `preferred_location` (TEXT), `configuration` (TEXT).
- `interested_project_id` (TEXT, FK -> `projects(id)` ON DELETE SET NULL).
- `lead_source` (TEXT, DEFAULT 'Direct'), `requirements` (TEXT).
- `assigned_associate_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `assigned_sales_head_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `status` (TEXT, DEFAULT 'active', CHECK in `lead`, `interested`, `visit_scheduled`, `visited`, `negotiation`, `booked`, `inactive`, `active`).
- `created_at`, `updated_at` (DATETIME).

### 2.9. `customer_interactions`
Call logs, meeting notes, and CRM timeline records.
- `id` (TEXT, PK).
- `customer_id` (TEXT, NOT NULL, FK -> `customers(id)` ON DELETE CASCADE).
- `user_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `interaction_type` (TEXT, NOT NULL).
- `notes` (TEXT, NOT NULL).
- `created_at` (DATETIME).

### 2.10. `invitations`
Digital VIP site visit passes issued to customers.
- `id` (TEXT, PK): Invitation UUID.
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `token` (TEXT, UNIQUE NOT NULL): Unguessable 64-char public token.
- `short_code` (TEXT): 6-character short code for direct redirection via `/i/:code`.
- `customer_id` (TEXT, NOT NULL, FK -> `customers(id)` ON DELETE CASCADE).
- `project_id` (TEXT, NOT NULL, FK -> `projects(id)` ON DELETE CASCADE).
- `developer_id` (TEXT, FK -> `developers(id)` ON DELETE SET NULL).
- `associate_id` (TEXT, NOT NULL, FK -> `users(id)` ON DELETE CASCADE).
- `sales_head_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `visit_date` (TEXT, NOT NULL), `visit_time` (TEXT, NOT NULL), `duration` (INTEGER, DEFAULT 60).
- `location` (TEXT, NOT NULL), `maps_url` (TEXT), `size` (TEXT), `price` (TEXT), `notes` (TEXT).
- `qr_code_data` (TEXT): Base64 data URL string of generated QR pass.
- `status` (TEXT, DEFAULT 'sent', CHECK in `draft`, `sent`, `opened`, `confirmed`, `reschedule_requested`, `cancelled`, `expired`).
- `expires_at` (DATETIME), `created_at` (DATETIME), `updated_at` (DATETIME).

### 2.11. `site_visits`
Operational visit execution and attendance records.
- `id` (TEXT, PK): Visit UUID.
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `invitation_id` (TEXT, FK -> `invitations(id)` ON DELETE SET NULL).
- `customer_id` (TEXT, NOT NULL, FK -> `customers(id)` ON DELETE CASCADE).
- `project_id` (TEXT, NOT NULL, FK -> `projects(id)` ON DELETE CASCADE).
- `associate_id` (TEXT, NOT NULL, FK -> `users(id)` ON DELETE CASCADE).
- `sales_head_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `scheduled_date` (TEXT, NOT NULL), `scheduled_time` (TEXT, NOT NULL), `duration` (INTEGER, DEFAULT 60).
- `status` (TEXT, DEFAULT 'upcoming', CHECK in `draft`, `invitation_sent`, `pending_confirmation`, `confirmed`, `reschedule_requested`, `rescheduled`, `cancelled`, `upcoming`, `checked_in`, `in_progress`, `completed`, `no_show`).
- `check_in_time`, `check_out_time` (DATETIME).
- `check_in_method` (TEXT, CHECK in `qr`, `manual`, NULL).
- `authorized_staff_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `staff_notes` (TEXT), `feedback_submitted` (INTEGER, DEFAULT 0).
- `created_at`, `updated_at` (DATETIME).

### 2.12. `followups`
Scheduled follow-up reminders for sales executives.
- `id` (TEXT, PK).
- `organization_id` (TEXT, NOT NULL, FK -> `organizations(id)` ON DELETE CASCADE).
- `customer_id` (TEXT, NOT NULL, FK -> `customers(id)` ON DELETE CASCADE).
- `associate_id` (TEXT, NOT NULL, FK -> `users(id)` ON DELETE CASCADE).
- `sales_head_id` (TEXT, FK -> `users(id)` ON DELETE SET NULL).
- `follow_up_date` (TEXT, NOT NULL), `follow_up_time` (TEXT).
- `follow_up_type` (TEXT, DEFAULT 'call', CHECK in `call`, `whatsapp`, `visit`, `email`, `meeting`).
- `priority` (TEXT, DEFAULT 'medium', CHECK in `low`, `medium`, `high`, `urgent`).
- `notes` (TEXT, NOT NULL).
- `status` (TEXT, DEFAULT 'pending', CHECK in `pending`, `completed`, `overdue`, `rescheduled`, `cancelled`).
- `created_at`, `updated_at` (DATETIME).

### 2.13. `feedback`
Customer visit ratings and post-visit impression surveys.
- `id` (TEXT, PK).
- `site_visit_id` (TEXT, UNIQUE NOT NULL, FK -> `site_visits(id)` ON DELETE CASCADE).
- `customer_id` (TEXT, NOT NULL, FK -> `customers(id)` ON DELETE CASCADE).
- `rating` (INTEGER, NOT NULL, CHECK between 1 and 5).
- `interest_level` (TEXT, CHECK in `very_high`, `high`, `medium`, `low`, `not_interested`).
- `budget_fit` (TEXT, CHECK in `within_budget`, `flexible`, `over_budget`).
- `sales_experience` (INTEGER, CHECK between 1 and 5).
- `notes` (TEXT).
- `created_at` (DATETIME).

### 2.14. `whatsapp_templates`, `whatsapp_logs`, and `activity_logs`
- `whatsapp_templates`: Predefined outreach formats with parameter interpolation.
- `whatsapp_logs`: Delivery audit records per phone number and status (`sent`, `delivered`, `read`, `failed`).
- `activity_logs`: Comprehensive audit trail logging `{ user_id, action, entity_type, entity_id, details, ip_address }`.

### 2.15. Lead Management Tables (Migration 002)
- `campaigns`: Organization-scoped marketing campaigns (`status`, `source_channel`, `start_date`, `end_date`).
- `tracking_links`: Cryptographically random `token` & `short_code`, creator/owner attribution (`owner_associate_id`, `owner_sales_head_id`), optional `project_id`/`campaign_id`, `is_active`, `expires_at`.
- `leads`: Project-level customer enquiries (`enquiry_ref`, `customer_id`, `project_id`, `configuration_id`, `apartment_size`, `budget`, `purchase_timeline`, `preferred_callback_time`, `city`, `contact_consent`, immutable `original_*` attribution, mutable `assigned_*` ownership, `stage`, `loss_reason`, `duplicate_status`, `invitation_id`, `site_visit_id`).
- `campaign_events`: Tracking funnel telemetry (`link_created`, `link_opened`, `form_started`, `enquiry_submitted`, `submission_successful`, `submission_rejected`, `duplicate_detected`).
- `lead_stage_history`: Audit trail of stage transitions with `previous_stage`, `new_stage`, `changed_by`, `notes`, `loss_reason`.
- `lead_assignments`: Audit trail of ownership changes preserving original attribution.
- `lead_settings`: Organization policies (`campaigns_enabled`, `admin_link_assignment_policy`, `sales_head_link_assignment_policy`, `duplicate_policy`, `timezone`, `strict_stage_transitions`).
- `notifications`, `notification_preferences`, `notification_logs`: In-app alerts, user channel/event preferences, deduplication (`dedupe_key`), and email retry queue.
- Additive columns: `customers.normalized_mobile`, `customers.city`, `customers.original_source`; `followups.lead_id`, `followups.completed_at`, `followups.reminder_sent_at`.

---

## 3. Database Indexes

To maintain instant query responsiveness across high data volumes, the following indices are maintained:
- `idx_users_org` (`users.organization_id`)
- `idx_users_role` (`users.role`)
- `idx_users_sales_head` (`users.sales_head_id`)
- `idx_customers_org` (`customers.organization_id`)
- `idx_customers_mobile` (`customers.mobile_number`)
- `idx_customers_assoc` (`customers.assigned_associate_id`)
- `idx_customers_head` (`customers.assigned_sales_head_id`)
- `idx_invitations_token` (`invitations.token`)
- `idx_invitations_org` (`invitations.organization_id`)
- `idx_invitations_cust` (`invitations.customer_id`)
- `idx_site_visits_org` (`site_visits.organization_id`)
- `idx_site_visits_assoc` (`site_visits.associate_id`)
- `idx_site_visits_head` (`site_visits.sales_head_id`)
- `idx_site_visits_status` (`site_visits.status`)
- `idx_followups_org` (`followups.organization_id`)
- `idx_followups_assoc` (`followups.associate_id`)
- `idx_followups_status` (`followups.status`)
- `idx_activity_org` (`activity_logs.organization_id`)
