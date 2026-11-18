# AI Coding Rules & Architectural Guidelines — Visit Studio

This ruleset governs all automated and assisted code modifications within the **Visit Studio** repository.

---

## 1. General Principles

1. **Inspect Before Modifying**: Always read and verify existing functions, component structures, and database column names before editing code.
2. **Reuse Existing Implementations**:
   - For backend formatting, QR generation, or WhatsApp integration, reuse `server/services/`.
   - For frontend notifications, modal dialogues, or currency conversions, reuse `Utils` in `public/js/utils.js`.
   - For HTTP network calls, always use `API.get`, `API.post`, `API.put`, `API.delete` in `public/js/api.js`.
3. **Avoid Duplicate Functionality**: Do not write bespoke fetch wrappers, date parsers, or toast managers when standard utilities already exist.
4. **Follow Existing Conventions**:
   - Match existing indentation (2 spaces), camelCase for JavaScript variables/functions, and snake_case for database columns and SQL parameters.
5. **Avoid Unnecessary Dependencies**: Do not install new npm libraries or frontend scripts unless explicitly directed by the user. Zero-build vanilla architecture is intentional.
6. **Avoid Unnecessary Refactoring**: Keep edits minimal and focused. Do not reformat untouched code or alter function signatures unless required for the task.
7. **Do Not Delete Functionality Without Approval**: Preserve public customer-facing routes, check-in hooks, and backward-compatible invitation schemas.
8. **Never Expose Secrets**: Do not log or commit `.env` contents, database passwords, or JWT secrets.
9. **Do Not Change Architecture Unnecessarily**: Retain the decoupled Express REST + Vanilla SPA architecture. Do not attempt to introduce React, Vite, Webpack, Prisma, or Docker without explicit user instruction.

---

## 2. Project-Specific Rules

### 2.1. Backend & Server Rules (`server/`)
- **Module System:** The backend is written in **CommonJS** (`require` / `module.exports`). Never convert server files to ESM (`import` / `export`) as Node.js runs with `"type": "commonjs"`.
- **Database Query Wrapper:**
  - Always execute database operations through the unified helper in `server/db/index.js` (`db.query`, `db.get`, `db.run`, `db.all`).
  - Do NOT call `node:sqlite` directly inside route files, as doing so bypasses the write-through MySQL synchronization handled in `server/db/mysql.js`.
  - Always use parameterized queries (`?` bindings) to prevent SQL injection vulnerabilities.
- **Tenant & RBAC Scoping:**
  - Every authenticated query that fetches or modifies business data (`customers`, `invitations`, `visits`, `projects`, `users`, `followups`) must enforce `organization_id = req.user.organization_id` unless the requester's role is `super_admin`.
  - When assigning sales leads or invitations, enforce hierarchy constraints (`sales_associate` can only access their assigned items; `sales_head` can access items under their team; `admin` can access the entire organization).
- **Public vs. Protected Routes:**
  - Customer-facing routes (`/i/:code`, `/api/invitations/public/:token`, `/api/invitations/public/:token/*`, `/api/health`) must remain accessible without authentication.
  - All internal administration and operations routes must be shielded by `authenticateToken`.

### 2.2. Frontend & UI Rules (`public/`)
- **Modular Component Pattern:**
  - Every dashboard view lives in `public/js/components/<viewName>.js` and attaches its renderer to `window.Components.<viewName>`.
  - Views must return clean HTML strings and bind DOM events after injection into the DOM via `App.navigate()`.
- **Design System & Aesthetics:**
  - Adhere to the established luxury real estate theme: Executive White & Royal Blue portal styling defined via CSS variables in `public/css/style.css` (primary brand `#29244d`, royal blue accents `#1e40af`, `#3b82f6`, gold accents `#f59e0b`).
  - Use semantic alert classes (`.badge-confirmed`, `.badge-pending`, `.status-chip`).
- **Canvas Image Generation (`Utils.generateInvitationPassImage`):**
  - The client-side canvas engine renders high-resolution (`1080x1440` PNG) VIP passes.
  - When modifying invitation pass layouts, preserve text measurement logic, high-DPI scaling, and fallback styling for missing developer logos.
- **Short URL and Deep Link Safety:**
  - When rendering invitation sharing options (WhatsApp, Web Share, Clipboard), ensure the short link `/i/:code` is used for compact readability.

---

## 3. Safe Change Checklist

Before concluding any code change:
1. Ensure `node server/index.js` starts cleanly without unhandled exceptions or syntax errors.
2. Run `npm test` or automated verification scripts to validate database connection and schema integrity.
3. If endpoints or table schemas changed, update `.ai/API.md`, `.ai/DATABASE.md`, and log the entry in `.ai/CHANGELOG.md`.
4. Run `npm run ai:context` to refresh `.ai/FILE_STRUCTURE.md`.
