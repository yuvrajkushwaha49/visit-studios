# AI Coding Assistant Directive — Visit Studio

Welcome to **Visit Studio**. This document is the **mandatory entry point** for any AI assistant or automated agent operating within this codebase.

---

## 1. Core Operating Principles

Every AI assistant working on this repository must adhere strictly to these rules:

1. **Read `AI.md` First**: Always consult this file before performing audits, refactors, feature implementations, or bug fixes.
2. **Read Only Relevant `.ai/` Documentation**: Consult specific documentation files in `.ai/` as needed to conserve context window while maintaining domain precision.
3. **Inspect Source Code Before Making Changes**: Never speculate on function signatures, database schema, or endpoint contracts. Inspect actual implementation files first.
4. **Zero Assumptions**: Never assume technology stacks, libraries, frameworks, or database backends. Derive facts solely from code evidence.
5. **Reuse Existing Code**: Always look for established patterns, utility functions (e.g., `public/js/utils.js`, `server/services/`), and shared middleware before writing new code.
6. **Make Minimal, Safe Changes**: Scope edits precisely. Avoid gratuitous modifications or formatting churn in untouched code blocks.
7. **Avoid Unnecessary Dependencies & Refactoring**: Do not introduce new npm packages, build tools, bundlers, or frameworks unless explicitly directed by the user. Respect the lightweight zero-build vanilla JS + Express architecture.
8. **Do Not Break Existing Functionality**: Verify that existing public routes (e.g. `/i/:code`, `/api/invitations/public/:token`), customer portals, and internal workflows remain backward-compatible.
9. **Never Expose Secrets**: Never log, hardcode, commit, or print values from `.env`, private keys, API secrets, or database passwords. Keep example values in `.env.example`.
10. **Keep Documentation Up-to-Date**: When updating APIs, modifying the database schema, or changing project architecture, immediately update the corresponding files in `.ai/` and record the change in `.ai/CHANGELOG.md`.

---

## 2. Directory Navigation Guide (`.ai/`)

Refer to these targeted documentation files depending on the task:

| Documentation File | When to Consult |
| :--- | :--- |
| **[.ai/PROJECT.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/PROJECT.md)** | Getting a comprehensive project overview, tech stack details, user roles, feature catalog, and dependency inventories. |
| **[.ai/ARCHITECTURE.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/ARCHITECTURE.md)** | Understanding system design, client-server data flow, state management, dual-database sync pattern, and UI layout hierarchies. |
| **[.ai/FILE_STRUCTURE.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/FILE_STRUCTURE.md)** | Locating files, understanding project organization, or reviewing directory trees (generated via `npm run ai:context`). |
| **[.ai/API.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/API.md)** | Implementing or calling backend REST endpoints, handling JWT/RBAC authentication, inspect request/response schemas, or managing public links. |
| **[.ai/DATABASE.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/DATABASE.md)** | Inspecting database schemas, table relationships, foreign keys, SQLite WAL configuration, and MySQL dual-write mechanics. |
| **[.ai/RULES.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/RULES.md)** | Reviewing coding conventions, naming standards, UI styling principles, RBAC scoping rules, and error-handling requirements. |
| **[.ai/CHANGELOG.md](file:///c:/Users/WORKIANS/Downloads/invi/.ai/CHANGELOG.md)** | Checking historical architectural changes, migrations, major refactors, or logging newly introduced systemic updates. |

---

## 3. Maintenance Script

To refresh the file structure map after adding, renaming, or deleting repository files:

```bash
npm run ai:context
```

This runs `scripts/generate-ai-context.cjs` using native Node.js built-ins and updates only `.ai/FILE_STRUCTURE.md`.
