# Dependency Graph

> **Metadata**
> - last-updated-by: update-ai-system (post-session 6)
> - last-verified-against-code: 2026-08-24
> - staleness-policy: auto-regenerable — can be derived from import analysis tools. Manual content only for conventions and rules that cannot be inferred from code.

> **Overview:** Maps how modules depend on each other. Agents use this to understand the impact of changes. This file is **auto-regenerable** — prefer tool-based import analysis for ground truth, and treat manual entries as supplementary.

---

## Module Dependency Map

```
Public pages (src/app, src/app/devotionals, src/app/purchase, src/app/access)
  → src/components/ui (universal catalog)
  → src/config (site settings with fallbacks)
  → src/lib/access (verify), src/lib/utils
  → src/data (read devotionals / days)

Admin pages (src/app/admin/*)
  → src/components/ui
  → src/components/admin (forms, editors, tables, analytics bars, sidebar, settings-editor)
  → src/config
  → src/data
  → src/lib/admin-auth (session + RBAC: requireAdmin, isSuperAdmin, can)
  → src/lib/email-render (preview), src/lib/email-blocks (editor)
  → src/lib/analytics (pure day-series + conversion helpers for the dashboard)
  → src/integrations/supabase (auth session validation, storage upload/delete)
  → src/lib/audit

Analytics dashboard (src/app/admin/(panel)/analytics)
  → src/data (events, purchases, devotionals aggregations)
  → src/lib/analytics (fillDaySeries, conversionRate — pure, client-safe)
  → src/components/admin/analytics-bars (CSS bar chart, server-safe)
  → src/config (formatPrice)

Public reader + unlock (src/app/devotionals/[slug])
  → src/data (devotional + preview days only; NO locked days in SSR payload)
  → src/components/devotionals (access-gate verifier, anti-screenshot)
  → POST /api/devotionals/[slug]/unlock (returns locked days after verification)

Asset management (admin uploads)
  → src/components/ui/file-upload (client upload UI with preview/remove)
  → POST /api/admin/assets (upload to Supabase Storage, audit log)
  → DELETE /api/admin/assets (delete from Supabase Storage, audit log)
  → src/integrations/supabase (uploadAsset, deleteAsset, getAssetPublicUrl)

Destructive actions (global pattern)
  → src/components/ui/confirm-action (useConfirmAction hook, ConfirmActionWrapper, WithConfirmAction)
  → src/components/ui/modal (ConfirmDialog)
  → src/components/ui/button (destructive variant)

API route handlers (src/app/api/*)
  → src/integrations/paystack (init, webhook verify)
  → src/integrations/resend (renders from email template store; SMTP or API)
  → src/integrations/cloudflare (renders from email template store; Cloudflare Worker + MailChannels)
  → src/integrations/supabase (admin login, invite signup, storage)
  → src/lib/access (password derivation)
  → src/lib/audit
  → src/lib/email-templates (store + renderer + seed)
  → src/lib/admin-auth (API guards)
  → src/data (purchases, access_grants, events, templates, invites, admins)

src/lib/email-templates
  → src/config (defaults/fallbacks)
  → src/lib/email-render (render + escape)
  → src/data (email_templates table)

src/lib/email-render → pure functions (client-safe, used by editor preview)
src/lib/email-blocks → pure block builder/serializer (client-safe, used by editor)
src/lib/analytics → pure day-series/conversion helpers (client-safe, used by dashboard)
src/lib/pagination → pure page-range/count helpers (client-safe, used by Pagination + Table)

Universal UI catalog (src/components/ui)
  → lucide-react (icons per §15)
  → src/lib/pagination, src/lib/utils
  → Navbar/BackToTop/ThemeToggle are client components mounted in src/app/layout
  → FileUpload, ConfirmAction are client components for admin forms

src/config/site
  → src/data (settings table reads)

src/lib/access
  → src/integrations/paystack (txn reference types)
  → env (ACCESS_PASSWORD_SECRET)

src/middleware (src/middleware.ts)
  → src/lib/admin-auth (cookie presence check only — cheap redirect; real authz in (panel) layout + API guards)

src/data/db
  → drizzle-orm
  → postgres (Supabase connection)

src/integrations/cloudflare
  → src/lib/email-templates (store + renderer + seed)
  → src/config (defaults/fallbacks)
  → Cloudflare Worker (HTTP) + MailChannels (email delivery)
```

---

## External Dependencies

| Package             | Purpose                              | Used In                 |
| ------------------- | ------------------------------------ | ----------------------- |
| next, react         | App framework                        | src/app                 |
| tailwindcss         | Styling                              | global CSS, components  |
| lucide-react        | Icon library (no emoji / raw SVG)    | src/components/ui, src/components/admin |
| drizzle-orm         | Typed SQL                            | src/data                |
| postgres            | Postgres driver (Supabase)           | src/data/db             |
| @supabase/supabase-js | Admin auth + client helpers + storage | src/integrations/supabase |
| resend              | Transactional email (API)            | src/integrations/resend |
| nodemailer          | SMTP email transport (Resend fallback) | src/integrations/resend |
| zod                 | Runtime validation (webhooks, forms) | src/app/api, forms      |
| vitest              | Unit tests                           | tests/                  |
| server-only         | Server-module marker                 | src/config, src/lib, src/integrations |

---

## Circular Dependency Warnings

None detected.

---

## Dependency Rules

- UI pages may depend on config, components, lib, data — never directly on integration wrappers from client components (SDKs with secrets are server-only).
- Integration wrappers must not import application pages/components.
- `src/config/site.ts` reads settings but must keep working when the DB is down (fallback-first).
- Server-only modules use `import "server-only"` so secrets cannot leak into client bundles.
- Config module must not depend on any application page code.
- Destructive actions must use the `useConfirmAction` pattern (confirmation modal + undo timeout).
- File uploads must go through `/api/admin/assets` with Supabase Storage.
- Resend integration supports both API (apiKey) and SMTP — SMTP takes priority when configured.
- Cloudflare email integration uses a Cloudflare Worker + MailChannels — no SDK, pure HTTP; works with free Vercel domains.