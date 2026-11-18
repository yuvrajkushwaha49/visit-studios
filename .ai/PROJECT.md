# Project Overview — Visit Studio

## 1. Project Identity

- **Project Name:** Visit Studio (package name: `invi` in `package.json`, application title: `Visit Studio — Real Estate Site Visit & Digital Invitation Management Platform`)
- **Project Purpose:** A specialized Real Estate CRM and invitation management platform designed to orchestrate property site visits, generate luxury digital VIP passes, automate WhatsApp notifications, log customer feedback and attendance, and track team sales pipelines with multi-tier organization controls.
- **Project Type:** Full-stack monolithic web application with a decoupled REST API backend and a zero-build vanilla Single Page Application (SPA) frontend.

---

## 2. Technology Stack

### Languages & Runtime
- **Backend Runtime:** Node.js (v20+ / v24+ compatible)
- **Module System:** CommonJS (`"type": "commonjs"`)
- **Backend Language:** JavaScript (ES6+ / Node.js standard modules)
- **Frontend Language:** Vanilla JavaScript (ES6+ standard), HTML5, CSS3

### Frameworks & Libraries
- **Backend Framework:** Express 5 (`express` `^5.3.0`)
- **Frontend Framework:** Vanilla Modern Single-Page Application (Zero-build, no React/Vue/Angular; modular component pattern attached to `window.Components`)
- **Build Tools:** Not detected / None required (native browser modules and standard script loading without bundlers like Webpack, Vite, or Rollup).

### Databases & Persistence
- **Primary Embedded Database:** SQLite via Node.js native standard library `node:sqlite` (`DatabaseSync`) stored at `server/data/visit_studio.db` configured in Write-Ahead Logging (`WAL`) mode with foreign key constraints enabled.
- **Dual-Sync Enterprise Database:** MySQL 8.x via `mysql2/promise` (`^3.24.6`) with automated dual write-through synchronization (`server/db/mysql.js`) against configured schema `visit_studio_db`.
- **Database Migrations / Schema:** `server/db/schema.js` (SQLite automatic initialization) and `server/db/migrations/mysql_schema.sql` (MySQL reference DDL).

### Key Backend Dependencies (`package.json`)
- `express` (`^5.3.0`): Core web and API routing framework.
- `jsonwebtoken` (`^9.0.3`): JWT issuance and verification for stateless API authentication.
- `bcryptjs` (`^3.0.3`): Secure password hashing (10 salt rounds).
- `qrcode` (`^1.5.4`): Server-side Base64 QR code generation for digital passes and check-ins.
- `multer` (`^2.5.0`): Multipart form handling and file upload parsing.
- `compression` (`^1.8.2`): Gzip/Brotli HTTP response compression.
- `cors` (`^2.8.6`): Cross-Origin Resource Sharing control.
- `dotenv` (`^18.0.10`): Environment variable injection from `.env`.
- `mysql2` (`^3.24.6`): MySQL database client driver for dual-sync capabilities.

---

## 3. Core Features & Functional Modules

1. **Digital VIP Invitation Builder (`public/js/components/invitationBuilder.js`)**:
   - Interactive property visit invitation creator with searchable developer/project selectors.
   - Generates client passes featuring QR codes, Google Maps navigation coordinates, and calendar triggers.
   - Dynamic HTML5 Canvas rendering of branded luxury invitation cards (`1080x1440` PNG) with custom background overlays and text formatting.
   - Dynamic short link generator (`/i/:code`) routing directly to customer invitation portals.
2. **Public Customer Portal (`public/js/components/publicCustomerPortal.js`)**:
   - Token-secured, no-login-required customer landing page (`/api/invitations/public/:token`).
   - One-click visit confirmation, reschedule requests, cancellations, and feedback submission.
   - Interactive Google Maps navigation and `.ics` calendar sync integration.
3. **Site Visit & Pass Management (`public/js/components/visitsList.js`)**:
   - Real-time visit tracker (Scheduled, Confirmed, In Progress, Completed, Cancelled, Rescheduled, No Show).
   - Instant check-in/check-out recording with notes and executive assignment.
4. **Sales Hierarchy & Team Management (`public/js/components/teamManagement.js`)**:
   - Hierarchical team structures linking Sales Associates to designated Sales Heads.
   - User account lifecycle management with role assignments and password provisioning.
5. **Developers & Projects Catalog (`public/js/components/projectsManagement.js`)**:
   - Registry of Real Estate Developers, Projects, and specific unit configurations (pricing, carpet area, brochures).
6. **Customer CRM & Follow-ups (`public/js/components/customersList.js`, `followupsList.js`)**:
   - Customer profile registry with budget, preferred location, source, and interaction history.
   - Scheduled reminder tracker with automated priority flags (High, Medium, Low).
7. **WhatsApp Automation Hub (`public/js/components/whatsappAutomation.js`)**:
   - Template manager with variable interpolation (`{{customer_name}}`, `{{project_name}}`, `{{visit_time}}`, `{{invitation_link}}`).
   - Click-to-Chat URI generator (`wa.me`) and optional Meta Graph API direct dispatching.
8. **Executive Reports & Analytics (`public/js/components/reportsAnalytics.js`)**:
   - Conversion rate dashboards, visit status distribution, top sales performers, and project popularity metrics.
   - CSV and Excel data export service (`server/services/exportService.js`).
9. **Super Admin Multi-Tenant Portal (`public/js/components/superAdminView.js`)**:
   - Multi-organization management, subscription status tracking, user auditing, and global platform oversight.

---

## 4. User Roles & Access Control (RBAC)

The system enforces a 4-tier Role-Based Access Control model:

1. **`super_admin`**: Global system overseer. Access across all organizations, multi-tenant creation, platform-level audit logs, and settings.
2. **`admin`**: Organization executive/owner. Full access within their organization, user and team management, template configuration, developer/project catalogs, and reporting.
3. **`sales_head`**: Team manager. Full visibility over team members' invitations, assigned projects, customers, visits, and team performance metrics.
4. **`sales_associate`**: Frontline representative. Scoped strictly to assigned invitations, assigned customers, and individual performance.

---

## 5. Authentication & Authorization

- **Scheme:** JSON Web Tokens (JWT) transmitted via HTTP header `Authorization: Bearer <token>`.
- **Token Payload:** `{ id, organization_id, email, role, name }`.
- **Expiry:** Configured via `JWT_EXPIRES_IN` in configuration (default `7d`).
- **Password Security:** Salted hashes generated via `bcryptjs` with work factor 10.
- **Public Routes:** Bypass auth using cryptographically random alphanumeric tokens (e.g. `public_token` on invitations) or 6-character short codes (e.g. `/i/:code`).

---

## 6. External Integrations

- **WhatsApp:** Click-to-Chat (`https://wa.me/...`) and optional Meta Cloud API via `WHATSAPP_API_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`.
- **Google Maps:** Direct deep-linking navigation coordinates (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`).
- **Calendar:** Client-side iCalendar (`.ics`) generation and Google Calendar deep-linking (`https://calendar.google.com/calendar/render?action=TEMPLATE...`).
- **Device APIs:** Web Share API (`navigator.share`) and HTML5 Canvas API for dynamic pass image generation.

---

## 7. Storage & Deployment

- **Storage:** Local filesystem storage for SQLite database files (`server/data/`) and static assets (`public/`).
- **Static Assets:** Served via Express static middleware (`public/`).
- **Deployment Configuration:** Node.js process environment driven by environment variables (`PORT`, `NODE_ENV`, `DB_TYPE`, `MYSQL_*`). Docker / CI-CD files: **Not detected**.
