# Visit Studio — Lead Management System Documentation

## 1. Overview & Business Hierarchy

The Lead Management System integrates directly into Visit Studio's multi-tenant architecture:

```
Super Admin (Platform-wide)
  └── Organization / Admin (Organization-scoped)
       └── Sales Heads (Team-scoped)
            └── Sales Associates (Personal-scoped)
```

All business rules—token validation, attribution resolution, duplicate handling, stage transitions, reassignment permissions, and report aggregation—are enforced strictly on the backend.

---

## 2. Database Migrations & Rollback

### Forward Migrations
- **SQLite (automatic on server boot via `server/db/schema.js` + `server/db/index.js`):**
  Reference script: `server/db/migrations/002_lead_management.sql`
- **MySQL 8.0+ (automatic via `ensureMySQLSchema()` in `server/db/mysql.js`):**
  Reference script: `server/db/migrations/mysql_lead_management.sql`

### Rollback Instructions
1. Stop the Visit Studio server (`pm2 stop visit-studio` or stop Node process).
2. Back up `server/data/visit_studio.db` and your MySQL database (`mysqldump`).
3. **SQLite rollback:**
   `sqlite3 server/data/visit_studio.db < server/db/migrations/002_lead_management_rollback.sql`
4. **MySQL rollback:**
   `mysql -u <user> -p <database> < server/db/migrations/mysql_lead_management_rollback.sql`
5. Existing `customers`, `invitations`, `site_visits`, `projects`, `developers`, and `users` records remain intact.

---

## 3. Role-Permission Matrix

| Capability | Super Admin | Admin | Sales Head | Sales Associate | Public Customer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Generate Trackable Enquiry Link | Org-scoped | Own Org | Own Team / Pool | Self-owned only | No |
| View Tracking Link Analytics | Platform | Own Org | Own Team | Own Links | No |
| Deactivate / Reactivate Link | Platform | Own Org | Own Team | Own Links | No |
| Open `/e/:code` & Submit 5-Step Form | — | — | — | — | Yes (Active, Non-expired) |
| View Leads | Platform | Own Org | Own Team | Assigned Only | No |
| Update Lead Stage | Platform | Own Org | Own Team | Assigned Only | No |
| Assign / Reassign Lead | Platform | Own Org | Own Team Only | **Forbidden (403)** | No |
| Duplicate Review Queue | Platform | Own Org | Own Team | No | No |
| Schedule Visit / Create Invitation from Lead | Platform | Own Org | Own Team | Assigned Only | No |
| Customer 360° Profile | Platform | Own Org | Own Team | Assigned Only | No |
| Lead Reports & Excel/CSV/PDF Export | Platform | Own Org | Own Team | Personal Only | No |
| Organization Lead Settings | Platform | Own Org | Read Only | Read Only | No |

---

## 4. API Reference Summary

### Public Enquiry Endpoints (Rate-Limited, No Auth)
- `GET /e/:code` — Resolves 8-char short code and redirects `302` to `/?enquiry=:token` (returns `404`/`410` if invalid, deactivated, or expired).
- `GET /api/public/enquiry/:token` — Validates link, logs `link_opened`, and returns safe project/form metadata (never exposes internal org/user IDs).
- `POST /api/public/enquiry/:token/start` — Records `form_started` telemetry event.
- `POST /api/public/enquiry/:token/submit` — Validates 5-step payload + honeypot spam check, resolves attribution server-side, performs transactional duplicate detection & lead creation, triggers notifications, and returns `enquiry_ref`.

### Tracking Links & Campaigns (`/api/lead-links`)
- `GET /api/lead-links` (paginated, filtered, RBAC-scoped)
- `POST /api/lead-links`
- `GET /api/lead-links/:id`
- `PATCH /api/lead-links/:id`
- `POST /api/lead-links/:id/deactivate`
- `GET /api/lead-links/:id/analytics`
- `GET /api/lead-links/campaigns`, `POST /api/lead-links/campaigns`

### Leads & Pipeline (`/api/leads`)
- `GET /api/leads` (paginated, filtered, RBAC-scoped)
- `POST /api/leads`
- `GET /api/leads/stages`
- `GET /api/leads/duplicates`
- `GET /api/leads/:id`, `PATCH /api/leads/:id`
- `PATCH /api/leads/:id/stage`, `GET /api/leads/:id/history`
- `POST /api/leads/:id/assign`, `GET /api/leads/:id/assignments`
- `POST /api/leads/:id/schedule-visit` (creates linked `invitations` + `site_visits` without duplicates)
- `POST /api/leads/:id/duplicate-resolve`

### Customer 360° & Follow-ups
- `GET /api/customers/:id`, `GET /api/customers/:id/timeline`, `GET /api/customers/:id/enquiries`
- `GET /api/followups`, `GET /api/followups/overdue`, `POST /api/followups`, `PATCH /api/followups/:id`, `PATCH /api/followups/:id/status`

### Lead Reports & Exports (`/api/reports`)
- `GET /api/reports/overview`
- `GET /api/reports/leads`, `/sources`, `/projects`, `/associates`, `/sales-heads`
- `GET /api/reports/lead-export?format=excel|csv|pdf`

### Settings & Notifications
- `GET /api/lead-settings`, `PUT /api/lead-settings`
- `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`
- `GET /api/notifications/preferences`, `PUT /api/notifications/preferences`, `GET /api/notifications/logs`

---

## 5. KPI Definitions

- **Total Leads:** Count of `leads` matching RBAC scope, active filters, and `submitted_at` date range.
- **Conversion Rate (%):** `(bookedLeads / totalLeads) * 100` (0 when `totalLeads = 0`).
- **Overdue Follow-ups:** Follow-ups with `status = 'pending'` where `follow_up_date < today` in the organization's configured timezone (`Asia/Kolkata` by default), or already marked `overdue` by `backgroundJobs.js`.
- **Link Conversion (%):** `(totalSubmissions / totalOpens) * 100` (unique counts use daily salted SHA-256 visitor hashes and distinct `customer_id`).

---

## 6. Deployment & Verification

1. Copy `.env.example` to `.env` and configure `JWT_SECRET`, `BASE_URL`, `PORT`, and optional `MYSQL_*` / `SMTP` settings.
2. Install dependencies: `npm install`
3. Start server: `npm start` (or `npm run pm2:start` for production).
4. Run automated verification:
   - `npm test` (DB & schema check)
   - `node test/integration.test.js` (14 existing E2E tests)
   - `node --experimental-sqlite test/leadManagement.test.js` (10 functional, security & data integrity suites)
   - `node --experimental-sqlite test/leadUnit.test.js` (5 unit & transaction rollback tests)

---

## 7. Known Issues & Pending Integration Details

- **External WhatsApp Meta Cloud API:** Currently `whatsappService.js` operates in standalone Click-to-Chat (`wa.me`) + database logging mode; direct server-side WhatsApp Business template dispatch requires configuring live Meta Cloud API credentials.
- **Email Notifications:** Email delivery in `notificationService.js` requires organization SMTP configuration under **Brand & Settings → Email (SMTP) Configuration**; otherwise in-app notifications are used without failure.
- **Legacy Report Route (`GET /api/reports/analytics`):** Retained for backward compatibility with the existing Visit Studio `Reports & Analytics` screen (`reportsAnalytics.js`); the new Lead Management reports use parameterized queries in `server/services/leadReportService.js`.
