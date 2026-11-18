# System Architecture — Visit Studio

## 1. High-Level Architectural Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  [ Modern Web Browser / Mobile Device ]                                           |
|    |                                                                              |
|    +---> Public Customer Portal (Vanilla JS + Responsive CSS)                    |
|    |     Access via: /i/:code (Short URL) -> /?invite=:token                     |
|    |                                                                              |
|    +---> Admin & Sales Team Portal (SPA Dashboard)                                |
|          - app.js (Router, View Switcher, State)                                  |
|          - api.js (HTTP Fetch Client with JWT)                                    |
|          - utils.js (Canvas VIP Pass Generator, Toast, Modals)                    |
|          - components/*.js (View Renderers & Event Handlers)                      |
+-----------------------------------------|-----------------------------------------+
                                          |
                                HTTP / HTTPS (REST API)
                                          |
+-----------------------------------------v-----------------------------------------+
|                               SERVER / BACKEND LAYER                              |
|                                                                                   |
|  [ Node.js + Express 5 Server (server/index.js) ]                                 |
|    |                                                                              |
|    +---> Middleware Pipeline:                                                     |
|    |     - compression() & cors()                                                 |
|    |     - express.json() & express.urlencoded()                                  |
|    |     - static asset server (public/)                                          |
|    |     - authenticateToken (JWT verification, req.user payload)                 |
|    |     - requireRole (RBAC authorization: super_admin, admin, sales_head, etc.) |
|    |     - auditLog (Action tracking & activity history)                          |
|    |                                                                              |
|    +---> Routing Subsystems (server/routes/*.js):                                 |
|          - /api/auth          - /api/invitations     - /api/reports               |
|          - /api/users         - /api/visits          - /api/whatsapp              |
|          - /api/customers     - /api/followups       - /api/settings              |
|          - /api/developers    - /api/projects        - /api/organizations         |
|          - /i/:code (Public short URL redirect to /?invite=:token)                |
|                                                                                   |
|    +---> Backend Services (server/services/*.js):                                 |
|          - qrService (Base64 QR Generation via qrcode library)                    |
|          - whatsappService (Meta Cloud API dispatcher)                            |
|          - exportService (CSV / Excel formatters)                                 |
+-----------------------------------------|-----------------------------------------+
                                          |
                                   Data Access Layer
                                          |
+-----------------------------------------v-----------------------------------------+
|                                  PERSISTENCE LAYER                                |
|                                                                                   |
|  [ server/db/index.js (Dual-Sync Database Adapter) ]                              |
|    |                                                                              |
|    +---> Primary Store: SQLite 3 (node:sqlite DatabaseSync)                       |
|    |     - File: server/data/visit_studio.db                                      |
|    |     - Mode: PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;             |
|    |     - Direct synchronous queries with prepared statements                    |
|    |                                                                              |
|    +---> Secondary Store: MySQL 8 (mysql2/promise pool)                           |
|          - Connection: server/db/mysql.js                                         |
|          - Write-through dual-sync executed on every INSERT/UPDATE/DELETE         |
|          - Non-blocking asynchronous sync error isolation                         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Application Layers

### 2.1. Presentation & Client Layer (`public/`)
- **Structure:** Single HTML template (`index.html`) acting as the application shell with lazy section rendering.
- **Client Router & Controller (`app.js`):**
  - Manages active views via `App.navigate(viewName)`.
  - Dispatches to modular component handlers: `Components.dashboard()`, `Components.invitations()`, `Components.visits()`, `Components.customers()`, `Components.team()`, `Components.projects()`, `Components.whatsapp()`, `Components.reports()`, `Components.settings()`, and `Components.superAdmin()`.
  - Handles login authentication modal, user session persistence in `localStorage`, and logout lifecycle.
  - Automatically detects public invitation parameters (`?invite=<token>`) and mounts `Components.publicPortal(token)`.
- **API Client (`api.js`):**
  - Thin abstraction over browser `fetch()`.
  - Injects `Authorization: Bearer <token>` into all outgoing requests.
  - Intercepts `401 Unauthorized` responses to clear invalid sessions and redirect to login.
- **Client Utilities (`utils.js`):**
  - Visual notification toast system (`Utils.showToast`).
  - Formatting helpers (Currency, Indian Lakhs/Crores, Dates, Times).
  - Client-side Canvas rendering engine (`Utils.generateInvitationPassImage`) that draws luxury branded invitation images (`1080x1440` PNG) with QR codes, dates, venue, and project branding.
  - Device integration (`Utils.sharePassCard`, `Utils.downloadICS`).

### 2.2. Backend Controller & Routing Layer (`server/routes/`)
- Express 5 REST routers partitioned by domain:
  - `auth.js`: Authentication (login, registration, profile retrieval, password updates).
  - `invitations.js`: Invitation lifecycle, QR token generation, status transitions, public guest portal endpoints.
  - `visits.js`: Site visit check-in, check-out, status logging, and feedback capture.
  - `customers.js`: Customer CRM, contact data, search, and interaction logs.
  - `developers.js` & `projects.js`: Real estate property and inventory catalog.
  - `users.js` & `organizations.js`: Multi-tenant user directory, hierarchy management, and RBAC administration.
  - `followups.js`: Scheduled reminders and lead follow-up tracking.
  - `whatsapp.js`: Automated message template management and trigger logging.
  - `reports.js`: Aggregated analytics queries and export utilities.
  - `settings.js`: Organization configuration and custom branding.
- Root short link redirection: `GET /i/:code` in `server/index.js` resolves the 6-character code and responds with HTTP 302 redirecting the browser to `/?invite=:token`.

### 2.3. Middleware & Security Pipeline (`server/middleware/`)
- **`auth.js`**:
  - `authenticateToken`: Validates incoming JWT bearer tokens, decodes user credentials, and attaches `req.user` to the request lifecycle.
  - `requireRole(...roles)`: Verifies if `req.user.role` matches permissible levels.
  - `requireOrgAccess`: Ensures users can only query and mutate records belonging to their `organization_id` (unless role is `super_admin`).
- **`audit.js`**:
  - `auditLog`: Asynchronously records user actions to the `activity_logs` table (user ID, action, entity, entity ID, and metadata).

### 2.4. Persistence & Database Synchronization Layer (`server/db/`)
- **Unified Interface:** `server/db/index.js` exports standard database querying helper methods (`query`, `get`, `run`, `transaction`).
- **SQLite Engine:** Uses Node.js native `node:sqlite` `DatabaseSync` for synchronous in-process operations.
- **MySQL Write-Through Synchronization:**
  - Whenever `db.run(sql, params)` modifies state, `syncToMySQL(sql, params)` in `server/db/mysql.js` adapts the SQLite statement into MySQL syntax (e.g. converting `last_insert_rowid()` equivalents and parameter bindings) and executes it against the MySQL connection pool.
  - Fault Tolerance: MySQL connection errors or synchronization failures are logged to stderr without crashing or blocking the primary SQLite operation.

---

## 3. Data Flow Patterns

### 3.1. Invitation Creation & VIP Pass Distribution
```
[ Sales Associate / Admin ]
          │
          ▼ Submits invitation form (Customer, Project, Slot, Location)
[ POST /api/invitations ]
          │
          ├── Authenticated via JWT & RBAC
          ├── Inserts record into SQLite `invitations` table
          ├── Asynchronously syncs write to MySQL
          ├── Generates unique 64-char `public_token` + 6-char `short_code`
          ├── Generates Base64 QR code via qrService
          ▼
[ Response with Invitation JSON & Public Short Link ]
          │
          ▼ Frontend generates Canvas VIP Pass Image (PNG)
[ Client shares via WhatsApp or Web Share API ]
          │
          ▼ Customer clicks https://<host>/i/:code
[ GET /i/:code ]
          │
          ▼ Server queries SQLite for code -> gets public_token
[ HTTP 302 Redirect to /?invite=:token ]
          │
          ▼ Browser loads SPA shell
[ Public Customer Portal mounts ]
          │
          ▼ Fetches /api/invitations/public/:token (No Auth required)
[ Displays Interactive VIP Pass, Directions & RSVP buttons ]
```

### 3.2. Customer RSVP & Check-in Flow
```
[ Customer clicks "Confirm Visit" or "Reschedule" ]
          │
          ▼ POST /api/invitations/public/:token/confirm
[ Server updates invitation status to 'confirmed' ]
          │
          ▼ When Customer arrives at site gallery
[ Sales Executive scans customer's QR pass ]
          │
          ▼ POST /api/visits/:id/checkin
[ Server logs arrival timestamp, updates visit status to 'in_progress' ]
```

---

## 4. State Management
- **Server:** Completely stateless. All session data is conveyed via signed JWTs. State resides strictly in the database.
- **Client:**
  - `App.state`: Central in-memory state object on the `App` singleton containing `{ user, token, activeView, notifications, theme }`.
  - `localStorage`: Persists `visit_studio_token` and `visit_studio_user` across page refreshes.
  - View-level state: Encapsulated within each component's local scope in `public/js/components/*.js`.
