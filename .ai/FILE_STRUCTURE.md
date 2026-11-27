# Project File Structure

Generated automatically by `scripts/generate-ai-context.cjs`.
*Last scanned: 2026-11-27T06:44:38.655Z*

```
visit-studios/
├── .ai/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   ├── DATABASE.md
│   ├── FILE_STRUCTURE.md
│   ├── PROJECT.md
│   └── RULES.md
├── docs/
│   └── LEAD_MANAGEMENT.md
├── public/
│   ├── cards/
│   │   ├── inv-3b763317.png
│   │   ├── inv-5cd342c3.png
│   │   ├── inv-686c4b3e.png
│   │   ├── inv-9986b686.png
│   │   ├── inv-712851d4.png
│   │   ├── inv-933873cd.png
│   │   ├── inv-b1e20738.png
│   │   ├── inv-b6d3a974.png
│   │   ├── inv-ca84329e.png
│   │   ├── inv-ce63bc8f.png
│   │   ├── inv-e2d15506.png
│   │   └── inv-f6806fd1.png
│   ├── css/
│   │   └── style.css
│   ├── images/
│   │   ├── templates/
│   │   │   ├── theme_black_ekanam.jpg
│   │   │   ├── theme_blue_hummingbird.jpg
│   │   │   ├── theme_bronze_rajnagar.jpg
│   │   │   ├── theme_green_monarch.jpg
│   │   │   ├── theme_ivory_trump.jpg
│   │   │   └── theme_purple_elie_saab.jpg
│   │   ├── card-template.jpg
│   │   └── luxury-card-bg.jpg
│   ├── js/
│   │   ├── components/
│   │   │   ├── customer360.js
│   │   │   ├── customersList.js
│   │   │   ├── dashboard.js
│   │   │   ├── followupsList.js
│   │   │   ├── invitationBuilder.js
│   │   │   ├── invitationsList.js
│   │   │   ├── leadDashboard.js
│   │   │   ├── leadGeneration.js
│   │   │   ├── leadPipeline.js
│   │   │   ├── leadReports.js
│   │   │   ├── leadSettings.js
│   │   │   ├── leadsList.js
│   │   │   ├── notificationsCenter.js
│   │   │   ├── projectsManagement.js
│   │   │   ├── publicCustomerPortal.js
│   │   │   ├── publicEnquiryForm.js
│   │   │   ├── reportsAnalytics.js
│   │   │   ├── settingsView.js
│   │   │   ├── superAdminView.js
│   │   │   ├── teamManagement.js
│   │   │   ├── visitsList.js
│   │   │   └── whatsappAutomation.js
│   │   ├── api.js
│   │   ├── app.js
│   │   └── utils.js
│   ├── uploads/
│   │   └── logos/
│   │       ├── logo-1c753d69.png
│   │       ├── logo-2c6de208.png
│   │       ├── logo-4bb771f4.png
│   │       ├── logo-7c5a38b1.png
│   │       ├── logo-8f320726.png
│   │       ├── logo-9ce4ae85.png
│   │       ├── logo-9f7fe60c.jpg
│   │       ├── logo-11f5307a.jpg
│   │       ├── logo-39f99d0e.png
│   │       ├── logo-89943740.jpg
│   │       ├── logo-a46a11c8.png
│   │       ├── logo-cabc6c9d.png
│   │       ├── logo-d32401ff.png
│   │       ├── logo-dev-godrej.png
│   │       ├── logo-dev-greatvalue.png
│   │       ├── logo-dev-gulshan.png
│   │       ├── logo-dev-ncr.png
│   │       ├── logo-dev-saya.webp
│   │       ├── logo-ncr-group.png
│   │       ├── logo-proj-ekanam.png
│   │       ├── logo-proj-elie-saab.png
│   │       ├── logo-proj-godrej-gbc.png
│   │       ├── logo-proj-gulshan-hummingbird.png
│   │       ├── logo-proj-hummingbird.png
│   │       ├── logo-proj-ncr-monarch.png
│   │       ├── logo-proj-ncr-studios.png
│   │       ├── logo-proj-saya-rajnagar.webp
│   │       ├── logo-proj-the-line.jpg
│   │       └── logo-proj-trump-tower.svg
│   └── index.html
├── scripts/
│   ├── add_rxiehg.js
│   ├── check_mysql.js
│   ├── create_test_invite.js
│   ├── generate-ai-context.cjs
│   ├── import_sales_team.js
│   ├── import_user_pasted_team.js
│   ├── seed_sajanpatel_projects.js
│   ├── send_credentials_batch.js
│   ├── sync_from_mysql.js
│   ├── sync_genspark_projects.js
│   ├── test_reports_api.js
│   └── update_card_design.js
├── server/
│   ├── data/
│   │   └── visit_studio.db
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 002_lead_management_rollback.sql
│   │   │   ├── 002_lead_management.sql
│   │   │   ├── mysql_lead_management_rollback.sql
│   │   │   ├── mysql_lead_management.sql
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
│   │   ├── leadLinks.js
│   │   ├── leads.js
│   │   ├── leadSettings.js
│   │   ├── notifications.js
│   │   ├── organizations.js
│   │   ├── projects.js
│   │   ├── publicEnquiry.js
│   │   ├── reports.js
│   │   ├── settings.js
│   │   ├── upload.js
│   │   ├── users.js
│   │   ├── visits.js
│   │   └── whatsapp.js
│   ├── services/
│   │   ├── attributionService.js
│   │   ├── backgroundJobs.js
│   │   ├── emailService.js
│   │   ├── exportService.js
│   │   ├── leadReportService.js
│   │   ├── leadService.js
│   │   ├── notificationService.js
│   │   ├── qrService.js
│   │   ├── trackingLinkService.js
│   │   └── whatsappService.js
│   ├── validators/
│   │   └── leadValidators.js
│   ├── config.js
│   └── index.js
├── test/
│   ├── integration.test.js
│   ├── leadManagement.test.js
│   └── leadUnit.test.js
├── .dockerignore
├── .env
├── .env.example
├── AI.md
├── deploy_from_zero.sh
├── Dockerfile
├── ecosystem.config.cjs
├── package-lock.json
├── package.json
├── push_to_git.bat
├── push_to_git.sh
├── README.md
├── setup_ec2.sh
├── update_server.sh
└── visit_studio_db.sql
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
