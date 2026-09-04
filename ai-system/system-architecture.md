# System Architecture

> **Metadata**
> - last-updated-by: fix-build (pdf-reader + devotional dedup + payment gateway labeling + email-client audit)
> - last-verified-against-code: 2026-09-04
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
├── Public surface        /purchase/[slug]      checkout (email + payment handlers: Paystack/BudPay/bank transfer, modal via ClientNav)
├── Public surface        /access               enter access password (auto-detect slug, copy-to-clipboard fallback)
├── Admin surface         /admin/*              upload, records (payments across handlers, grants via modal), settings, assets
└── API Route Handlers    /api/*                paystack/budpay init/webhook, access verify, unlock, bank-transfer, assets upload/delete
     ↓
Service / Business Logic  src/lib, src/services
     ↓
Data Access (Drizzle ORM)  src/data
     ↓
Supabase Postgres (single database)
Supabase Storage (devotional assets: covers, etc.)
Integration wrappers (isolated SDKs): Supabase, Paystack, BudPay (mirrored Paystack flow), Resend, Cloudflare (Worker + MailChannels)
```

---

## Module Breakdown

| Module             | Responsibility                                    | Key Files                       | Dependencies           |
| ------------------ | ------------------------------------------------- | ------------------------------- | ---------------------- |
| Config layer       | Admin-configurable settings with code fallbacks   | `src/config/site.ts`            | drizzle settings table |
| Public UI          | Browse + read + purchase + access pages           | `src/app`, `src/components/ui`  | config, data, lib      |
| Admin UI           | Content upload, records, analytics, settings, assets | `src/app/admin`                 | config, data, lib      |
| API layer          | Paystack/BudPay init/webhook, access verification/unlock, assets, bank-transfer | `src/app/api`                   | integrations, data     |
| Service logic      | Access password gen/verify, audit, pricing, analytics, performance, polyfills | `src/lib/access.ts`, `src/lib/audit.ts`, `src/lib/analytics.ts`, `src/lib/performance.ts`, `src/lib/polyfills.ts` | config, data, integrations |
| Data layer         | Drizzle schema + DB client                        | `src/data/db/schema.ts`         | drizzle-orm, postgres  |
| Integration layer  | SDK isolation per §17                             | `src/integrations/{paystack,budpay,resend,supabase,cloudflare}` | vendor SDKs / HTTP     |
| Destructive actions | Global confirmation + undo pattern               | `src/components/ui/confirm-action.tsx` | modal, button, hooks |
| File uploads       | Asset management via Supabase Storage            | `src/components/ui/file-upload.tsx`, `src/app/api/admin/assets/route.ts` | supabase storage |
| Content reader     | On-platform PDF/DOCX viewer with asset protection | `src/components/devotionals/content-reader.tsx` | lucide-react, lib/utils |

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
Purchase/[slug] collects email + gateway choice (Paystack / BudPay / bank transfer via PurchaseCheckout modal)
  → /api/paystack/init or /api/budpay/init: creates pending purchase row, returns gateway auth URL
     (BudPay amount is sent in major units (Naira) not kobo — see budpay/client.ts)
  → client opens gateway popup; or bank-transfer uploads proof → /api/bank-transfer/upload → pending
  → Paystack webhook verifies HMAC-SHA512, BudPay webhook re-verifies via /transaction/verify API,
    bank-transfer verified via /api/admin/bank-transfers (manual). All flip purchase/transfer to success,
    derive access password from reference (HMAC), write access_grant(s) (bundle fans out), send email via
    email-client abstraction (Resend or Cloudflare per EMAIL_PROVIDER), copy-to-clipboard fallback in UI, audit + event
  → user enters access password at /access (slug auto-detected if empty) or on devotional page AccessGate → verified via /api/access/verify or /api/devotionals/[slug]/unlock → reader unlocks (ContentReader polyfills Promise.withResolvers)
```

### Asset Upload Flow (Admin)
```
Admin/devotionals (create/edit) → FileUpload component
  → POST /api/admin/assets (multipart/form-data)
  → uploadAsset → Supabase Storage (devotional-assets bucket)
  → returns publicUrl → saved as devotional.coverUrl
  → recordAudit (asset.upload)
```

### On-Platform Content Reader Flow (Asset Protection)
```
Devotional reader page / access gate → ContentReader component (full width/height, flex-1, zoom + pagination) + src/lib/polyfills.ts
  → Polyfill: Promise.withResolvers (ES2024) injected before pdfjs-dist import so older Safari/WebView (iOS 16) does not crash with "Promise.withResolvers is not a function"
  → PDF: pdfjs-dist 4.10.38 canvas rendering (true page count, canvas per page, DPR-aware), worker from cdn.jsdelivr.net (CSP allow-listed); DOCX: paginated text (1800 chars/page)
  → Toolbar: page input + prev/next, zoom out/in (0.6x–2.2x), Expand/Collapse height toggle, Fullscreen via requestFullscreen
  → Preview limited to 2000 chars for non-authorized users; hasFullAccess uses blank overlay protection (see below)
  → Protection overlay inside ContentReader + page-level AntiScreenshot: visibilitychange/blur/pagehide/beforeprint/PrintScreen/getDisplayMedia hijack → blank blurred overlay (normal + fullscreen); pointer-events shield; select-none; contextmenu/copy/cut/drag blocked
  → Watermark + cover overlay when locked (single protected view — no duplicate cover-blur block; see DevotionalPageClient dedup: per-day file viewers suppressed when hasSingleAsset)
  → No download/export capability — content stays in-platform
  → Upgrade prompt when preview truncated; unlock via AccessGate (onUnlock → parent state, modal closes + toast)
```

### Destructive Action Pattern (Global)
```
Button click → WithConfirmAction / useConfirmAction
  → ConfirmDialog modal (title, description, confirm/cancel)
  → onConfirm → execute(async action)
  → action() runs (e.g., delete devotional, remove asset)
  → Undo toast appears (5s timeout with progress bar)
  → onUndo → reverts action (consumer implements undo logic)
  → timeout expires → toast auto-dismisses
```

### Data Persistence Flow
```
All writes via Drizzle against Supabase Postgres.
Multi-step writes (payment confirm + access grant + email + audit) run as one transaction
with the email sent after commit; partial failure leaves compensation trace in audit_logs.
Asset uploads go to Supabase Storage; DB stores only the path + public URL.
```

---

## Configuration Points

| Config Key                    | Purpose                                  | Location           | Default |
| ----------------------------- | ---------------------------------------- | ------------------ | ------- |
| `NEXT_PUBLIC_APP_URL`         | Canonical origin for emails/PWA          | .env               | `http://localhost:3000` |
| `DATABASE_URL`                | Supabase Postgres connection string      | .env (server only) | none — startup-required |
| `SUPABASE_URL`                | Supabase project URL                     | .env               | none    |
| `SUPABASE_ANON_KEY`           | Public client key                        | .env (public)      | none    |
| `SUPABASE_SERVICE_ROLE_KEY`   | Server-only elevated key            | .env (server only) | none    |
| `PAYSTACK_SECRET_KEY`         | Server-side verification key             | .env (server only) | none    |
| `PAYSTACK_PUBLIC_KEY`         | Client-side popup key                    | .env (public)      | none    |
| `RESEND_API_KEY`              | Transactional mail key (API mode)        | .env (server only) | none    |
| `EMAIL_SERVER_HOST`           | SMTP host (Resend SMTP mode)             | .env               | none    |
| `EMAIL_SERVER_PORT`           | SMTP port (465 default)                  | .env               | 465     |
| `EMAIL_SERVER_USER`           | SMTP username (Resend)                   | .env               | resend  |
| `EMAIL_SERVER_PASSWORD`       | SMTP password (Resend API key)           | .env (server only) | none    |
| `EMAIL_PROVIDER`              | Email provider: "resend" or "cloudflare" | .env               | "resend" |
| `CLOUDFLARE_EMAIL_WORKER_URL` | Cloudflare Worker URL for MailChannels   | .env (server only) | none    |
| `CLOUDFLARE_EMAIL_WORKER_SECRET` | Worker secret for auth                 | .env (server only) | none    |
| `ACCESS_PASSWORD_SECRET`      | HMAC key for access-password derivation  | .env (server only) | dev fallback in config |
| Site settings (DB)            | Platform name, logo, pricing, access mode, toggles, footer dev credit | `settings` table | code fallbacks in `src/config/site.ts` |
| `ENABLE_DESIGN_VIEWER`        | Dev-only design-asset viewer mount        | .env               | false   |

All config points follow the fallback discipline from `standards/engineering-principles.md` §1 and §3 — every config-driven value has a documented, safe fallback so the system degrades gracefully if the value is missing or malformed.

---

## Verification CLI (agent-verifiable behavior)

No project CLI exists yet. Verification is via `npm run typecheck`, `npm run lint`, `npm test` (vitest), and a production build (`npm run build`). When a persistent verification CLI is warranted (engineering principle §24), it will be documented here.

---

## Rollback & Undo (deployment level)

- **Previous-build promotion** — Vercel instant rollback to the previous deployment is the primary undo path.
- **DB migration reversibility** — Drizzle migrations are generated with both up and down; roll back with `drizzle-kit` down where the migration is reversible. Destructive migrations require explicit flagging.
- **Feature-flag kill switch** — purchase gating and reader protection are config-driven (DB settings) so they can be toggled without a deploy.
- **Destructive action undo** — 5-second undo window on delete/replace actions via `useConfirmAction` pattern (UI-level, not DB transaction rollback).

---

## Tech Stack

| Layer      | Technology                      | Version      |
| ---------- | ------------------------------- | ------------ |
| Frontend   | Next.js (App Router)            | 15.x         |
| Language   | TypeScript                      | 5.x          |
| Styling    | Tailwind CSS                    | 3.x          |
| Database   | Supabase Postgres               | 15           |
| ORM        | Drizzle ORM                     | 0.36+        |
| Storage    | Supabase Storage                | —            |
| Payments   | Paystack, BudPay (mirrored), bank transfer (proof+manual verify) | API v3 / BudPay API |
| Email      | Resend (API + SMTP) / Cloudflare Workers + MailChannels via email-client abstraction (EMAIL_PROVIDER) | SDK + nodemailer / HTTP |
| Auth (admin only) | Supabase Auth            | —            |
| Icons      | lucide-react                    | latest       |

---

## Known Constraints & Technical Debt

- No runtime secrets in client bundles — Paystack/Resend/Supabase service-role keys are server-only; server-only code must not leak into client bundles (`server-only` package discipline).
- Supabase `anon` key is public by design; RLS/policies must be enforced at the DB level for anything a client could touch directly.
- Access password derivation depends on `ACCESS_PASSWORD_SECRET`; changing it invalidates existing grants (documented migration path in `memory/project-decisions.md`).
- Anti-screenshot protection is a best-effort client behavior (DRM-level protection is a future consideration; the parent project may own this). Now includes blank overlay on visibilitychange/blur/PrintScreen/getDisplayMedia hijack (normal + fullscreen).
- Analytics dashboard degrades to partial data on single-query timeout (not full-page ErrorState); requires DB but falls back gracefully.
- Root layout nav uses withLayoutTimeout (2500ms) so slow DB does not block route transitions; admin panel has loading.tsx skeleton for perceived performance; middleware cheap redirect stays boundary-free.
- Supabase Storage bucket `devotional-assets` must exist and be public (or use signed URLs for private assets).
- Destructive action undo is UI-level only; actual data rollback must be implemented by the consumer (e.g., soft-delete, re-create from audit log).
- Cloudflare email worker secret must be set in Cloudflare Worker environment (not in Vercel) — separate secret management.
- On-platform content reader: preview truncation is enforced client-side for non-authorized users; server-side enforcement via `/api/devotionals/[slug]/unlock` is the true boundary. Zoom (0.5–3x) and expand/collapse control viewer height (480px ↔ 85vh + fullscreen).
- Content reader does not support full DOCX rendering client-side (requires server-side conversion or mammoth.js); currently shows paginated placeholder with upgrade prompt.

---

## Architecture History

See `memory/architecture-history.md` for full chronology.