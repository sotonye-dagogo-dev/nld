# Repository Map

> **Metadata**
>
> - last-updated-by: execute-feature (issue 5)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: auto-regenerable — can be derived from `Get-ChildItem -Recurse` or `tree` command. Manual content only where intent cannot be derived from structure.

> **Overview:** Visual map of the project folder structure with purpose descriptions. Updated when the folder structure changes. This file is **auto-regenerable** — use tool-based discovery (filesystem MCP, git ls-tree) for ground truth, and treat manual entries here as supplementary context, not primary navigation.

---

## Folder Structure

```
project-root/
│
├── src/                        → Application source (Next.js App Router)
│   ├── app/                    → Routes (public + admin + API)
│   │   ├── devotionals/        → /devotionals/[slug] reader (preview-only SSR + unlock)
│   │   ├── purchase/           → /purchase/[slug] checkout
│   │   ├── access/             → /access password entry
│   │   ├── admin/              → /admin/* panel (login, invite signup, guarded (panel) group)
│   │   └── api/                → Route handlers (paystack, access, unlock, admin/*)
│   ├── components/             → Universal UI catalog + feature components
│   ├── config/                 → Admin-configurable settings + defaults with fallbacks
│   ├── data/                   → Drizzle schema + DB client
│   ├── integrations/           → Isolated SDK wrappers (paystack, resend, supabase)
│   ├── lib/                    → Service logic (access, audit, utils, email templates/render/blocks, admin auth)
│   ├── types/                  → Global type definitions (injected via tsconfig)
│   └── hooks/                  → Shared React hooks (theme)
│
├── drizzle/                    → Generated migration files
├── ai-system/                  → AI development system docs
├── artifacts/                  → Client briefs (genesis directive, Word MD, zip)
├── integrations/               → ai-system integration examples (kit-level)
├── public/                     → PWA manifest, service worker, icons
├── tests/                      → Unit/integration test suites
├── .env.example                → Required env vars (never commit real keys)
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Directory Descriptions

| Directory           | Purpose                                     | Key Files                         |
| ------------------- | ------------------------------------------- | --------------------------------- |
| `src/app`           | Next.js App Router routes                    | layout.tsx, page.tsx, admin/*, api/* |
| `src/components/ui` | Universal component catalog (baseline §13)   | button.tsx, navbar.tsx, table.tsx, pagination.tsx, back-to-top.tsx, theme-toggle.tsx |
| `src/components/admin` | Admin feature components (forms, editors, tables, analytics, sidebar) | devotional-form.tsx, email-template-editor.tsx, records-table.tsx, analytics-bars.tsx, sidebar.tsx |
| `src/config`        | Config-driven settings + defaults            | site.ts, defaults.ts              |
| `src/data`          | Drizzle schema and DB client                 | db/schema.ts, db/index.ts         |
| `src/integrations`  | SDK isolation wrappers (§17)                 | paystack/*, resend/*, supabase/*  |
| `src/lib`           | Business logic (access, audit, email, admin auth, pagination) | access.ts, audit.ts, email-templates.ts, email-render.ts, email-blocks.ts, admin-auth.ts, analytics.ts, pagination.ts |
| `src/types`         | Global TS types (no import needed)           | global.d.ts                       |
| `drizzle/`          | Generated migrations                         | (generated)                       |
| `artifacts`         | Client requirement briefs                    | genesis-directive.txt, Next-Level-Devotional-App.md, next-level-devotional.zip |
| `tests`             | Vitest suites                                | access, config, utils, email-templates, admin-auth, analytics, pagination |
| `scripts`           | Bootstrap/seed scripts                       | seed-admin.mjs                    |

---

## Entry Points

| Purpose                | File                            |
| ---------------------- | ------------------------------- |
| Frontend dev server    | `src/app/layout.tsx`            |
| Public browse          | `src/app/page.tsx`              |
| Admin panel            | `src/app/admin/(panel)/layout.tsx` |
| Admin login            | `src/app/admin/login/page.tsx`  |
| Admin sidebar          | `src/components/admin/sidebar.tsx` |
| Config loading         | `src/config/site.ts`            |
| Email template store   | `src/lib/email-templates.ts`    |
| Admin RBAC             | `src/lib/admin-auth.ts`         |
| Analytics dashboard    | `src/app/admin/(panel)/analytics/page.tsx` |
| Analytics helpers      | `src/lib/analytics.ts`          |