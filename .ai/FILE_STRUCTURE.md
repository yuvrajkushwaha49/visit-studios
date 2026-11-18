# Project File Structure

Generated automatically by `scripts/generate-ai-context.cjs`.
*Last scanned: 2026-11-18T09:54:06.574Z*

```
invi/
├── .ai/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   ├── DATABASE.md
│   ├── FILE_STRUCTURE.md
│   ├── PROJECT.md
│   └── RULES.md
├── public/
│   ├── cards/
│   │   ├── inv-5cd342c3.png
│   │   ├── inv-686c4b3e.png
│   │   ├── inv-712851d4.png
│   │   ├── inv-b6d3a974.png
│   │   └── inv-e2d15506.png
│   ├── css/
│   │   └── style.css
│   ├── images/
│   │   └── card-template.jpg
│   ├── js/
│   │   ├── components/
│   │   │   ├── customersList.js
│   │   │   ├── dashboard.js
│   │   │   ├── followupsList.js
│   │   │   ├── invitationBuilder.js
│   │   │   ├── invitationsList.js
│   │   │   ├── projectsManagement.js
│   │   │   ├── publicCustomerPortal.js
│   │   │   ├── reportsAnalytics.js
│   │   │   ├── settingsView.js
│   │   │   ├── superAdminView.js
│   │   │   ├── teamManagement.js
│   │   │   ├── visitsList.js
│   │   │   └── whatsappAutomation.js
│   │   ├── api.js
│   │   ├── app.js
│   │   └── utils.js
│   └── index.html
├── scratch/
│   └── update_builder.js
├── scripts/
│   └── generate-ai-context.cjs
├── server/
│   ├── data/
│   │   └── visit_studio.db
│   ├── db/
│   │   ├── migrations/
│   │   │   └── mysql_schema.sql
│   │   ├── index.js
│   │   ├── mysql.js
│   │   ├── schema.js
│   │   └── seed.js
│   ├── middleware/
│   │   ├── audit.js
│   │   ├── auth.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── developers.js
│   │   ├── followups.js
│   │   ├── invitations.js
│   │   ├── organizations.js
│   │   ├── projects.js
│   │   ├── reports.js
│   │   ├── settings.js
│   │   ├── upload.js
│   │   ├── users.js
│   │   ├── visits.js
│   │   └── whatsapp.js
│   ├── services/
│   │   ├── exportService.js
│   │   ├── qrService.js
│   │   └── whatsappService.js
│   ├── config.js
│   └── index.js
├── test/
│   └── integration.test.js
├── .dockerignore
├── .env
├── .env.example
├── AI.md
├── Dockerfile
├── ecosystem.config.cjs
├── package-lock.json
├── package.json
└── README.md
```

## Key Directory Guide

- `server/`: Backend application code (Node.js & Express)
  - `server/config.js`: Central configuration and environment loader
  - `server/index.js`: Express application initialization, middleware & routes registration
  - `server/db/`: Database connections, schema definitions, dual-sync handlers, and seeds
  - `server/middleware/`: Authentication (JWT & RBAC) and audit logging middleware
  - `server/routes/`: Express REST API endpoints organized by domain
  - `server/services/`: Business logic services (QR generator, WhatsApp, CSV/Excel export)
- `public/`: Frontend Single Page Application assets
  - `public/index.html`: Core HTML frame, dialogs, modals & layout templates
  - `public/css/style.css`: Unified responsive stylesheet & theme variables
  - `public/js/app.js`: Frontend controller, navigation, modal manager, and event router
  - `public/js/api.js`: Centralized HTTP fetch client with token handling
  - `public/js/utils.js`: UI utilities, notification system, date formatters, and client-side canvas generators
  - `public/js/components/`: Modular view controllers for each functional portal screen
- `test/`: Integration test suites
- `.ai/`: Architectural and operational documentation for AI assistants
