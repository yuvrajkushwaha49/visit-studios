# API Reference & Endpoint Catalog — Visit Studio

This document catalogues all actual REST API endpoints detected in the codebase (`server/routes/` and `server/index.js`).

---

## 1. Authentication & Security Conventions

- **Auth Scheme:** JSON Web Token passed via `Authorization: Bearer <jwt_token>` header.
- **Middleware:**
  - `authenticateToken`: Validates JWT; attaches `req.user = { id, organization_id, email, role, name }`.
  - `requireRole(...roles)`: Verifies role hierarchy (`super_admin`, `admin`, `sales_head`, `sales_associate`).
  - `requireOrgAccess`: Ensures non-super admins can only query records matching their `req.user.organization_id`.
  - `auditLog(action, entity)`: Asynchronously writes operational events into `activity_logs`.
- **Public Endpoints:** Require no `Authorization` header. They use cryptographic unguessable tokens (`public_token`) or short URL codes (`short_code`).

---

## 2. Public Endpoints (No Auth Required)

### Short URL Redirection
- **`GET /i/:code`**
  - **Purpose:** Resolves a 6-character short invitation code and redirects the guest to the full portal.
  - **Handler:** `server/index.js`
  - **Response:** `HTTP 302 Found` with `Location: /?invite=<public_token>`. Returns `404` if code not found.

### Public Customer Invitation Portal
- **`GET /api/invitations/public/:token`**
  - **Purpose:** Fetches full invitation details, customer name, project details, developer name, scheduled slot, and location.
  - **Handler:** `server/routes/invitations.js`
  - **Response:** `{ success: true, data: { invitation: {...}, project: {...}, developer: {...} } }`

- **`POST /api/invitations/public/:token/confirm`**
  - **Purpose:** Guest confirms attendance for the scheduled site visit.
  - **Handler:** `server/routes/invitations.js`
  - **Response:** `{ success: true, message: "Invitation confirmed" }`

- **`POST /api/invitations/public/:token/reschedule`**
  - **Purpose:** Guest requests a new date/time slot.
  - **Body:** `{ preferred_date: "YYYY-MM-DD", preferred_time: "HH:MM", reason: string }`
  - **Handler:** `server/routes/invitations.js`
  - **Response:** `{ success: true, message: "Reschedule request submitted" }`

- **`POST /api/invitations/public/:token/cancel`**
  - **Purpose:** Guest cancels the invitation.
  - **Body:** `{ reason: string }`
  - **Handler:** `server/routes/invitations.js`
  - **Response:** `{ success: true, message: "Invitation cancelled" }`

### System Health
- **`GET /api/health`**
  - **Purpose:** Health check returning server timestamp, uptime, and database connectivity status.
  - **Handler:** `server/index.js`

---

## 3. Authenticated API Endpoints

### 3.1. Authentication (`/api/auth`)
| Method | Endpoint | Allowed Roles | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates credentials | `{ email, password }` | `{ success: true, token, user }` |
| `POST` | `/api/auth/register` | `super_admin`, `admin` | Provisions a new user | `{ name, email, password, role, phone, team_id }` | `{ success: true, user }` |
| `GET` | `/api/auth/me` | All authenticated | Returns currently logged-in user profile | None | `{ success: true, user }` |
| `PUT` | `/api/auth/profile` | All authenticated | Updates user name & contact phone | `{ name, phone }` | `{ success: true, user }` |
| `PUT` | `/api/auth/password` | All authenticated | Updates current user password | `{ current_password, new_password }` | `{ success: true, message }` |

---

### 3.2. Invitations (`/api/invitations`)
| Method | Endpoint | Allowed Roles | Description | Request Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/invitations` | All authenticated | Lists invitations (scoped by org/role). Filters are applied in SQL. | Query: `search, status, statuses, project_id, project_ids, team_ids, associate_ids, period, date_from, date_to` | `{ invitations: [...] }` |
| `GET` | `/api/invitations/export/excel` | All authenticated | Downloads the same filtered invitations as an Excel workbook. Sheets: Summary, Member Wise, Team Wise, Only Team Leader, then one sheet per team. | Same query as the list | `.xlsx` file |
| `GET` | `/api/invitations/:id` | All authenticated | Gets specific invitation record | URL param: `id` | `{ success: true, data: {...} }` |
| `POST` | `/api/invitations` | All authenticated | Creates an invitation & auto-generates QR + short link | Body: `{ customer_id (or new customer fields), project_id, scheduled_date, scheduled_time, notes, unit_configuration_id }` | `{ success: true, data: {...}, short_url }` |
| `PUT` | `/api/invitations/:id` | All authenticated | Updates scheduled time, status, notes | Body: `{ scheduled_date, scheduled_time, status, notes }` | `{ success: true, data: {...} }` |
| `DELETE`| `/api/invitations/:id` | `admin`, `super_admin` | Deletes an invitation record | URL param: `id` | `{ success: true, message }` |
| `POST` | `/api/invitations/:id/send` | All authenticated | Triggers WhatsApp message dispatch for invitation | Body: `{ template_id, custom_message }` | `{ success: true, message }` |

---

### 3.3. Site Visits (`/api/visits`)
| Method | Endpoint | Allowed Roles | Description | Request Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/visits` | All authenticated | Lists site visits with filter support | Query: `status, project_id, date, sales_rep_id` | `{ success: true, data: [...] }` |
| `GET` | `/api/visits/:id` | All authenticated | Gets visit details & feedback | URL param: `id` | `{ success: true, data: {...} }` |
| `POST` | `/api/visits/:id/checkin` | All authenticated | Records client arrival at project gallery | Body: `{ checkin_notes }` | `{ success: true, data: {...} }` |
| `POST` | `/api/visits/:id/checkout` | All authenticated | Records visit conclusion & outcomes | Body: `{ checkout_notes, outcome }` | `{ success: true, data: {...} }` |
| `POST` | `/api/visits/:id/feedback` | All authenticated | Records customer rating & notes | Body: `{ rating, feedback_text, interested_in_booking }` | `{ success: true, data: {...} }` |

---

### 3.4. Customers CRM (`/api/customers`)
| Method | Endpoint | Allowed Roles | Description | Request Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/customers` | All authenticated | Lists customers (with search & pagination) | Query: `search, budget_min, budget_max, status, limit, offset` | `{ success: true, data: [...] }` |
| `GET` | `/api/customers/:id` | All authenticated | Customer profile + interaction history | URL param: `id` | `{ success: true, data: {...} }` |
| `POST` | `/api/customers` | All authenticated | Creates a new customer profile | Body: `{ name, email, phone, budget, preferred_location, notes }` | `{ success: true, data: {...} }` |
| `PUT` | `/api/customers/:id` | All authenticated | Updates customer information | Body: `{ name, email, phone, budget, ... }` | `{ success: true, data: {...} }` |
| `DELETE`| `/api/customers/:id` | `admin`, `super_admin` | Deletes customer profile | URL param: `id` | `{ success: true, message }` |
| `POST` | `/api/customers/:id/interactions` | All authenticated | Logs customer interaction (call, meeting) | Body: `{ interaction_type, notes, follow_up_date }` | `{ success: true, data: {...} }` |

---

### 3.5. Developers & Projects (`/api/developers`, `/api/projects`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/developers` | All authenticated | Lists real estate developer companies |
| `POST` | `/api/developers` | `admin`, `super_admin` | Creates developer profile |
| `PUT` | `/api/developers/:id` | `admin`, `super_admin` | Updates developer details |
| `DELETE`| `/api/developers/:id` | `admin`, `super_admin` | Deactivates/deletes developer |
| `GET` | `/api/projects` | All authenticated | Lists projects with developer & configuration data |
| `POST` | `/api/projects` | `admin`, `super_admin` | Adds property project with location coordinates |
| `PUT` | `/api/projects/:id` | `admin`, `super_admin` | Updates project details & gallery address |
| `DELETE`| `/api/projects/:id` | `admin`, `super_admin` | Deactivates/deletes project |
| `GET` | `/api/projects/:id/configurations` | All authenticated | Retrieves unit configurations (BHK, sqft, price) |
| `POST` | `/api/projects/:id/configurations` | `admin`, `super_admin` | Adds unit configuration |

---

### 3.6. User & Team Management (`/api/users`, `/api/organizations`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | All authenticated | Lists users within caller's organization |
| `GET` | `/api/users/export/excel` | All authenticated | Downloads the scoped sales team as Excel. Query: `search, team_ids, associate_ids, statuses` |
| `POST` | `/api/users` | `admin`, `super_admin` | Creates team member / sales executive |
| `PUT` | `/api/users/:id` | `admin`, `super_admin` | Updates role, status, team assignment |
| `DELETE`| `/api/users/:id` | `admin`, `super_admin` | Deactivates/deletes user |
| `GET` | `/api/users/teams` | All authenticated | Lists sales teams and hierarchies |
| `POST` | `/api/users/teams` | `admin`, `super_admin` | Creates new sales team |
| `GET` | `/api/organizations` | `super_admin` | Lists all organizations (multi-tenant) |
| `POST` | `/api/organizations` | `super_admin` | Creates new organization |

---

### 3.7. Follow-ups, WhatsApp Automation, Reports & Settings
- **`/api/followups`**: Full CRUD for scheduled call reminders and priorities (`High`, `Medium`, `Low`).
- **`/api/whatsapp`**: Template CRUD, manual trigger endpoints, and transmission logs.
- **`/api/reports`**: Dashboard analytics summary, visit status distribution, sales rep leaderboards, and CSV/Excel exports.
- **`/api/settings`**: Organization settings, brand colors, pass disclaimer text, and WhatsApp API configuration.
