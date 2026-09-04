# Repository Map

> **Metadata**
>
> - last-updated-by: fix-build (pdf-reader + devotional dedup + payment gateway labeling)
> - last-verified-against-code: 2026-09-04
> - staleness-policy: auto-regenerable — can be derived from `Get-ChildItem -Recurse` or `tree` command. Manual content only where intent cannot be derived from structure.

> **Overview:** Visual map of the project folder structure with purpose descriptions. Updated when the folder structure changes. This file is **auto-regenerable** — use tool-based discovery (filesystem MCP, git ls-tree) for ground truth, and treat manual entries here as supplementary context, not primary navigation.

---

## Folder Structure

```
project-root/
│
├── src/                        → Application source (Next.js App Router)
│   ├── app/                    → Routes (public + admin + API)
│   │   ├── devotionals/        → /devotionals/[slug] reader (preview-only SSR + unlock + on-platform reader)
│   │   ├── purchase/           → /purchase/[slug] checkout (table + modal via ClientNav)
│   │   ├── access/             → /access password entry (modal via ClientNav + page fallback)
│   │   ├── admin/              → /admin/* panel (login, invite signup, guarded (panel) group; loading.tsx for nav lag)
│   │   └── api/                → Route handlers (paystack, access, unlock, admin/*, assets, bank-transfer)
│   ├── components/             → Universal UI catalog + feature components
│   │   ├── ui/                 → Baseline catalog (Button, Input, Card, Navbar, Pagination, BackToTop, Modal, FileUpload, ConfirmAction, etc.)
│   │   ├── admin/              → Admin feature components (forms, editors, tables, analytics, sidebar, settings-editor)
│   │   ├── devotionals/        → Public devotional components (AccessGate, AntiScreenshot w/ blur overlay, PurchaseCheckout, ContentReader w/ zoom/pagination/expand)
│   │   ├── layout/             → ClientNav (Purchase + Unlock modals, SPA routing)
│   │   └── pwa/                → Service worker registration (admin bypass)
│   ├── config/                 → Admin-configurable settings + defaults with fallbacks
│   ├── data/                   → Drizzle schema + DB client
│   ├── integrations/           → Isolated SDK wrappers (paystack, budpay, resend, supabase, cloudflare)
│   ├── lib/                    → Service logic (access, audit, utils, email templates/render/blocks, admin auth, analytics, pagination, performance, polyfills for pdf.js)
│   ├── types/                  → Global type definitions (injected via tsconfig)
│   └── hooks/                  → Shared React hooks (theme)
│
├── cloudflare-worker/          → Cloudflare Worker for MailChannels email relay
├── drizzle/                    → Generated migration files
├── ai-system/                  → AI development system docs
├── artifacts/                  → Client briefs (genesis directive, Word MD, zip)
├── integrations/               → ai-system integration examples (kit-level)
├── public/                     → PWA manifest, service worker, icons
├── scripts/                    → Bootstrap/seed scripts
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
| `src/components/ui` | Universal component catalog (baseline §13)   | button.tsx, navbar.tsx, table.tsx, pagination.tsx, back-to-top.tsx, theme-toggle.tsx, modal.tsx, file-upload.tsx, confirm-action.tsx |
| `src/components/admin` | Admin feature components (forms, editors, tables, analytics, sidebar) | devotional-form.tsx, email-template-editor.tsx, records-table.tsx, analytics-bars.tsx, sidebar.tsx, settings-editor.tsx |
| `src/components/devotionals` | Public devotional components (reader protection, zoom/pagination, blank-overlay deterrence) | access-gate.tsx, anti-screenshot.tsx (blur overlay, getDisplayMedia hijack), purchase-checkout.tsx, content-reader.tsx (expand/zoom/page-input + Promise.withResolvers polyfill), devotional-page-client.tsx (deduped single protected view, no double cover-blur) |
| `src/components/layout` | ClientNav with modals + SPA routing | client-nav.tsx |
| `src/config`        | Config-driven settings + defaults            | site.ts, defaults.ts              |
| `src/data`          | Drizzle schema and DB client                 | db/schema.ts, db/index.ts         |
| `src/integrations`  | SDK isolation wrappers (§17)                 | paystack/*, budpay/*, resend/*, supabase/*, cloudflare/* |
| `src/lib`           | Business logic (access, audit, email, admin auth, pagination, analytics, performance) | access.ts, audit.ts, email-templates.ts, email-render.ts, email-blocks.ts, admin-auth.ts, analytics.ts, pagination.ts, performance.ts, polyfills.ts |
| `src/types`         | Global TS types (no import needed)           | global.d.ts                       |
| `cloudflare-worker/`| MailChannels email relay via Cloudflare Worker | smtp-relay.ts, wrangler.toml      |
| `drizzle/`          | Generated migrations                         | (generated)                       |
| `artifacts`         | Client requirement briefs                    | genesis-directive.txt, Next-Level-Devotional-App.md, next-level-devotional.zip |
| `tests`             | Vitest suites                                | access, config, utils, email-templates, admin-auth, analytics, pagination |
| `scripts`           | Bootstrap/seed scripts                       | seed-admin.mjs                    |

---

## Entry Points

| Purpose                | File                            |
| ---------------------- | ------------------------------- |
| Frontend dev server    | `src/app/layout.tsx` (withLayoutTimeout for nav) |
| Public browse          | `src/app/page.tsx`              |
| Admin panel            | `src/app/admin/(panel)/layout.tsx` (guarded, loading.tsx) |
| Admin login            | `src/app/admin/login/page.tsx`  |
| Admin sidebar          | `src/components/admin/sidebar.tsx` (Link prefetch) |
| Config loading         | `src/config/site.ts`            |
| Email template store   | `src/lib/email-templates.ts`    |
| Admin RBAC             | `src/lib/admin-auth.ts`         |
| Analytics dashboard    | `src/app/admin/(panel)/analytics/page.tsx` (resilient partial-data) |
| Analytics helpers      | `src/lib/analytics.ts`          |
| Asset upload API       | `src/app/api/admin/assets/route.ts` |
| Destructive action hook | `src/components/ui/confirm-action.tsx` |
| File upload component  | `src/components/ui/file-upload.tsx` |
| On-platform content reader | `src/components/devotionals/content-reader.tsx` (zoom/page/expand/overlay) |
| Content protection     | `src/components/devotionals/anti-screenshot.tsx` + viewer overlay |
| Performance monitoring | `src/lib/performance.ts`        |