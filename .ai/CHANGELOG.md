# System Changelog

All notable architecture, database, API, and infrastructural changes to **Visit Studio** are documented in this file.

---

### 2026-11-24
- **Change:** Admin sidebar now has Invitations Report under MANAGEMENT, with the team, member, period, and Excel filters. The Invitations page used by admin and sales is the original guest list again: search, status, and the invitation actions. Sales Team uses the same filter bar for search, team, member, and status, and loads the matching people when Search is clicked. Each person has one Actions button that switches them between Active and Deactivate. Developers & Projects uses the same filter bar for search, developer, project, and status, and loads the matching cards when Search is clicked. Reports & Analytics is removed from the admin navbar because that page has no data. Sales Team can export the current search, team, member, and status filters to Excel. Sales Head and Sales Associate names open a detail page with profile, team, invitations, and visits. The team list actions are View, Edit, and Deactivate. Send Login, Assign Head, and Delete stay on the detail page. Customers open a detail page with profile, notes, invitations, visits, and follow-ups. The customer list keeps View and Edit.
- **Reason:** Sales staff need the normal invitation list, while the management report stays in the Management section.
- **Affected areas:** `public/js/app.js`, `public/js/components/invitationsList.js`
- **Migration/API impact:** None. Existing invitation APIs are unchanged.

### 2026-11-24
- **Change:** Digital Invitations can be exported to Excel. The workbook has Summary, Member Wise, Team Wise, and Only Team Leader sheets, followed by one sheet per team. Each team sheet starts with a large team-name title and a "Report For (date) Today" line, then that team's member-wise counts, then the invitation list below. Visit Time is shown in 12-hour form with AM or PM. Header and data cells use colored row and column backgrounds. Active members, teams, and team leaders with 0 invitations are included, and a team with 0 still gets its own sheet.
- **Reason:** Admins need the same team and member breakdown they use in spreadsheets, using the filters already applied on the invitations page.
- **Affected areas:** `server/routes/invitations.js`, `server/services/exportService.js`, `public/js/components/invitationsList.js`
- **Migration/API impact:** New endpoint `GET /api/invitations/export/excel`. It accepts the same filters as `GET /api/invitations` and does not change stored data.

### 2026-11-24
- **Change:** Digital Invitations filters now support multiple teams, members, projects, and statuses. The Search button loads the filtered list from `GET /api/invitations`.
- **Reason:** Admins need to query the database for a chosen set of teams and members instead of filtering only the rows already on screen.
- **Affected areas:** `server/routes/invitations.js`, `public/js/components/invitationsList.js`, `public/css/style.css`
- **Migration/API impact:** Backward-compatible. Existing `status`, `project_id`, and `search` query parameters still work. New optional parameters: `statuses`, `project_ids`, `team_ids`, `associate_ids`, `period`, `date_from`, `date_to`.

### 2026-11-18
- **Change:** Hardened platform for production deployment:
  - Added zero-dependency rate limiting middleware (`server/middleware/rateLimiter.js`) with sliding memory window to protect `/api/auth/login` and public invitation endpoints.
  - Added HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy`, `Strict-Transport-Security`).
  - Added reverse-proxy trust configuration (`app.set('trust proxy', 1)`) for Cloudflare, Nginx, and cloud load balancers.
  - Implemented dynamic base URL detection in `server/config.js` (`getBaseUrl(req)`) so invitation passes and QR codes automatically adapt to any live domain/tunnel without hardcoded ports.
  - Implemented dual query (`?invite=...`) and hash (`#invite=...`) token resolution in `public/js/app.js` to ensure resilient loading across all mobile browsers.
  - Added graceful shutdown lifecycle (`SIGTERM`/`SIGINT`) with SQLite WAL checkpointing (`wal_checkpoint(TRUNCATE)`).
  - Configured PM2 process ecosystem (`ecosystem.config.cjs`) with automatic crash restarts and memory management.
  - Added production `Dockerfile` with multi-stage non-root containerization and `.dockerignore`.
  - Added comprehensive production environment documentation in `.env.example`.
- **Reason:** Prepare the platform for enterprise hosting, containerization, and public distribution with enterprise-grade security and reliability.
- **Affected areas:**
  - `server/index.js`, `server/config.js`, `server/middleware/rateLimiter.js`
  - `server/routes/invitations.js`, `server/routes/visits.js`
  - `public/js/app.js`
  - `ecosystem.config.cjs`, `Dockerfile`, `.dockerignore`, `.env.example`, `package.json`
- **Migration/API impact:** Fully backward-compatible; provides enhanced security headers, error suppression in production, and dynamic link generation.

---

### 2026-11-17
- **Change:** Initialized the AI Context & Architecture Documentation System.
  - Added root `AI.md` as the unified master entry point for automated coding agents.
  - Added `.ai/PROJECT.md` specifying discovered technologies, project purpose, runtime, user roles, and feature catalog.
  - Added `.ai/ARCHITECTURE.md` documenting client-server layers, data flow diagrams, state handling, and dual-sync SQLite/MySQL persistence.
  - Added `.ai/API.md` providing a comprehensive catalog of all 12 REST API modules, public guest endpoints, and auth constraints.
  - Added `.ai/DATABASE.md` detailing the 14 database tables, column specifications, foreign key cascades, WAL SQLite setup, and MySQL write-through syncing.
  - Added `.ai/RULES.md` formulating project-specific AI coding guidelines, security conventions, and zero-build vanilla JS practices.
  - Added `scripts/generate-ai-context.cjs` cross-platform CommonJS script using only Node.js built-ins to scan and build `.ai/FILE_STRUCTURE.md`.
  - Added `"ai:context": "node scripts/generate-ai-context.cjs"` command to `package.json`.
- **Reason:** Provide future AI assistants with an accurate, zero-assumption, persistent knowledge base of the codebase architecture, preventing breaking changes and hallucinations.
- **Affected areas:**
  - Root directory (`AI.md`, `package.json`)
  - `.ai/` directory
  - `scripts/` directory
- **Migration/API impact:** None. Zero impact on runtime behavior, existing APIs, or database records.

---

### 2026-11-17 (Pre-Audit Enhancements)
- **Change:** Added Short URL Redirection (`/i/:code`) and dynamic Canvas-based VIP pass card image generation.
- **Reason:** Enhanced customer invitation sharing workflow across WhatsApp and mobile channels with compact URLs and visual passes.
- **Affected areas:**
  - `server/index.js` (short URL redirection route)
  - `server/db/schema.js` (added `short_code` column to `invitations` table)
  - `server/routes/invitations.js` (short code generation logic)
  - `public/js/utils.js` (Canvas pass generator & WhatsApp share link generator)
- **Migration/API impact:** Backward-compatible; existing full URLs (`/?invite=<token>`) remain completely functional.
