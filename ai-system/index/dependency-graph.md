# Dependency Graph

> **Metadata**
> - last-updated-by: execute-feature (issue 1)
> - last-verified-against-code: 2026-08-20
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
  → src/config
  → src/data
  → src/integrations/supabase (auth session guard)
  → src/lib/audit

API route handlers (src/app/api/*)
  → src/integrations/paystack (init, webhook verify)
  → src/integrations/resend (access email)
  → src/lib/access (password derivation)
  → src/lib/audit
  → src/data (purchases, access_grants, events)

src/config/site
  → src/data (settings table reads)

src/lib/access
  → src/integrations/paystack (txn reference types)
  → env (ACCESS_PASSWORD_SECRET)

src/data/db
  → drizzle-orm
  → postgres (Supabase connection)
```

---

## External Dependencies

| Package             | Purpose                              | Used In                 |
| ------------------- | ------------------------------------ | ----------------------- |
| next, react         | App framework                        | src/app                 |
| tailwindcss         | Styling                              | global CSS, components  |
| drizzle-orm         | Typed SQL                            | src/data                |
| postgres            | Postgres driver (Supabase)           | src/data/db             |
| @supabase/supabase-js | Admin auth + client helpers        | src/integrations/supabase |
| resend              | Transactional email                  | src/integrations/resend |
| zod                 | Runtime validation (webhooks, forms) | src/app/api, forms      |
| vitest              | Unit tests                           | tests/                  |

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