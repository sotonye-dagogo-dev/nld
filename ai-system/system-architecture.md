# System Architecture

> **Metadata**
> - last-updated-by: bootstrap-project (execute-feature, issue 1)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: re-verify before trusting if any architecture-affecting commits have been made since last-verified-against-code

> **Overview:** How the system is structured — layers, modules, data flow, and configuration. Agents designing or changing structure must read this first.

---

## Architecture Diagram

```
Browser (PWA)
     ↓
Next.js App Router (Vercel)
├── Public surface        /        browse devotionals (metadata-driven)
├── Public surface        /devotionals/[slug]   devotional reader + paywall
├── Public surface        /purchase/[slug]      checkout (email + Paystack)
├── Public surface        /access               enter access password
├── Admin surface         /admin/*              upload, records, settings
└── API Route Handlers    /api/*                paystack init/webhook, access verify
     ↓
Service / Business Logic  src/lib, src/services
     ↓
Data Access (Drizzle ORM)  src/data
     ↓
Supabase Postgres (single database)
Integration wrappers (isolated SDKs): Supabase, Paystack, Resend
```

---

## Module Breakdown

| Module             | Responsibility                                    | Key Files                       | Dependencies           |
| ------------------ | ------------------------------------------------- | ------------------------------- | ---------------------- |
| Config layer       | Admin-configurable settings with code fallbacks   | `src/config/site.ts`            | drizzle settings table |
| Public UI          | Browse + read + purchase + access pages           | `src/app`, `src/components/ui`  | config, data, lib      |
| Admin UI           | Content upload, records, analytics, settings      | `src/app/admin`                 | config, data, lib      |
| API layer          | Paystack init/webhook, access verification        | `src/app/api`                   | integrations, data     |
| Service logic      | Access password gen/verify, audit, pricing        | `src/lib/access.ts`, `src/lib/audit.ts` | config, data, integrations |
| Data layer         | Drizzle schema + DB client                        | `src/data/db/schema.ts`         | drizzle-orm, postgres  |
| Integration layer  | SDK isolation per §17                             | `src/integrations/{paystack,resend,supabase}` | vendor SDKs |

---

## Data Flow

### Standard Request Flow
```
Request → Next.js route (server component / route handler)
        → config layer (settings with fallbacks)
        → service logic (lib/)
        → Drizzle query against Supabase Postgres
        → render response (public pages render client/server; admin guarded by auth)
```

### Payment Flow
```
/purchase/[slug] collects email
  → /api/paystack/init: creates pending purchase row, returns Paystack transaction ref
  → client opens Paystack popup
  → Paystack redirects/calls /api/paystack/webhook on success
  → webhook verifies signature, flips purchase to success, derives access password from
    transaction reference, writes access_grant, sends email via Resend, writes audit + event
  → user enters access password at /access → verified → reader unlocks
```

### Data Persistence Flow
```
All writes via Drizzle against Supabase Postgres.
Multi-step writes (payment confirm + access grant + email + audit) run as one transaction
with the email sent after commit; partial failure leaves compensation trace in audit_logs.
```

---

## Configuration Points

| Config Key              | Purpose                                  | Location           | Default |
| ----------------------- | ---------------------------------------- | ------------------ | ------- |
| `NEXT_PUBLIC_APP_URL`   | Canonical origin for emails/PWA          | .env               | `http://localhost:3000` |
| `DATABASE_URL`          | Supabase Postgres connection string      | .env (server only) | none — startup-required |
| `SUPABASE_URL`          | Supabase project URL                     | .env               | none    |
| `SUPABASE_ANON_KEY`     | Public client key                        | .env (public)      | none    |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only elevated key            | .env (server only) | none    |
| `PAYSTACK_SECRET_KEY`   | Server-side verification key             | .env (server only) | none    |
| `PAYSTACK_PUBLIC_KEY`   | Client-side popup key                    | .env (public)      | none    |
| `RESEND_API_KEY`        | Transactional mail key                   | .env (server only) | none    |
| `ACCESS_PASSWORD_SECRET`| HMAC key for access-password derivation  | .env (server only) | dev fallback in config |
| Site settings (DB)      | Platform name, logo, pricing, access mode, toggles | `settings` table | code fallbacks in `src/config/site.ts` |
| `ENABLE_DESIGN_VIEWER`  | Dev-only design-asset viewer mount        | .env               | false   |

All config points follow the fallback discipline from `standards/engineering-principles.md` §1 and §3 — every config-driven value has a documented, safe fallback so the system degrades gracefully if the value is missing or malformed.

---

## Verification CLI (agent-verifiable behavior)

No project CLI exists yet. Verification is via `npm run typecheck`, `npm run lint`, `npm test` (vitest), and a production build (`npm run build`). When a persistent verification CLI is warranted (engineering principle §24), it will be documented here.

---

## Rollback & Undo (deployment level)

- **Previous-build promotion** — Vercel instant rollback to the previous deployment is the primary undo path.
- **DB migration reversibility** — Drizzle migrations are generated with both up and down; roll back with `drizzle-kit` down where the migration is reversible. Destructive migrations require explicit flagging.
- **Feature-flag kill switch** — purchase gating and reader protection are config-driven (DB settings) so they can be toggled without a deploy.

---

## Tech Stack

| Layer      | Technology              | Version      |
| ---------- | ----------------------- | ------------ |
| Frontend   | Next.js (App Router)    | 15.x         |
| Language   | TypeScript              | 5.x          |
| Styling    | Tailwind CSS            | 3.x          |
| Database   | Supabase Postgres       | 15           |
| ORM        | Drizzle ORM             | 0.36+        |
| Payments   | Paystack                | API v3       |
| Email      | Resend                  | SDK          |
| Auth (admin only) | Supabase Auth    | —            |

---

## Known Constraints & Technical Debt

- No runtime secrets in client bundles — Paystack/Resend/Supabase service-role keys are server-only; server-only code must not leak into client bundles (`server-only` package discipline).
- Supabase `anon` key is public by design; RLS/policies must be enforced at the DB level for anything a client could touch directly.
- Access password derivation depends on `ACCESS_PASSWORD_SECRET`; changing it invalidates existing grants (documented migration path in `memory/project-decisions.md`).
- Anti-screenshot protection is a best-effort client behavior (DRM-level protection is a future consideration; the parent project may own this).

---

## Architecture History

See `memory/architecture-history.md` for full chronology.