# In-Progress Work

> **Metadata**
>
> - last-updated-by: execute-feature (issue 2)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: this file is overwritten every session — always current

> **Overview:** Tracks work that is currently in progress but not yet complete. Written _before_ starting risky multi-step work, cleared on clean completion. This is the first file `resume-session.md` reads on interruption — it is the single source of truth for "what was half-done."

---

## Current State

**Status:** In Progress

**Command Being Executed:**
execute-feature.md

**Directive / Task:**
Close out MVP (Phase 0–2). User directives:
1. Asset protection hardened NOW (flagged concern): locked-day content must NOT ship in the client bundle until verified — server-side fetch of locked days after verification + anti-screenshot client behaviors (admin-configurable).
2. Admin auth: seeded superadmin account; superadmin can invite others as admins via email link; invitees sign up and are auto-added as admins, redirected to admin panel. Admins do NOT have invite privilege (the one superadmin-only power for now).
3. Email templates admin-configurable: visual builder AND raw HTML builder, variable handling, superadmin-only privilege.
4. Close out remaining Sprint 2: settings editor, records views (payments/access grants/audit), devotional upload persistence.

**Steps Completed:**

- (none — session start)

**Current Step:**
Step 1 — planning pass (task-queue, system-architecture, design-system, repair-system read). Writing plan.

**Plan (decomposed tasks):**

1. **Schema + migration** — add `email_templates` (key pk, name, subject, body_html, variables jsonb, updatedBy, updatedAt), `admin_invites` (id, email, token unique, role, invitedBy, status, expiresAt, createdAt). Bind `admins` to Supabase auth users (auth_user_id column). Generate Drizzle migration.
2. **Email template layer** — `src/lib/email-templates.ts`: DB-backed template store with code fallbacks (defaults.ts), variable renderer with HTML escaping, seed defaults. Wire `sendAccessEmail` (Resend) to render from the store instead of inline strings (§18). Template keys: `access_password`, `admin_invite`.
3. **Asset protection** — change `devotionals/[slug]` reader to render ONLY preview days server-side; locked days fetched via `POST /api/devotionals/[slug]/unlock` after server-side verification (password → grant check → returns locked days JSON). AccessGate becomes a verifier + fetcher. Add `AntiScreenshot` client behavior (contextmenu/copy/print/devtools suppression, watermark overlay hint) gated by `settings.antiScreenshotEnabled`.
4. **Admin auth** — `src/lib/admin-auth.ts` (cookie session), `/admin/login` page + `/api/admin/auth/login` + `/api/admin/auth/logout`, guarded `(panel)` route group layout validating Supabase token + `admins` row, middleware for cheap redirect, seed script `scripts/seed-admin.mjs` (env-driven SEED_ADMIN_EMAIL/PASSWORD) creating the superadmin via Supabase service role + `admins` row (role=owner).
5. **Admin invite flow** — `POST /api/admin/invites` (superadmin only) creates invite + sends `admin_invite` email; `/admin/invite/[token]` signup page → `POST /api/admin/invites/accept` creates Supabase auth user + `admins` row (role=admin) + auto-login → redirect `/admin`. Invite nav visible only for superadmin.
6. **Email template admin editor** — `/admin/email-templates` (superadmin only): list templates, block-based visual builder + raw HTML editor toggle + variable chips + live preview, saves via `POST /api/admin/email-templates`.
7. **Sprint 2 close-out** — `/admin/settings` editor (writes `settings` store), `/admin/records/{payments,grants,audit}` views (paginated tables), devotional upload persistence (POST /api/admin/devotionals + days; wire DevotionalForm).
8. **QA + docs** — unit tests (template renderer, admin auth helpers), typecheck, lint, build; update project-plan, task-queue, session-log, dev-history, project-decisions, test-plan/results, system-architecture (config points + flow), repo-map, README; clear in-progress.

**Files to Create:**

- src/lib/email-templates.ts, src/lib/admin-auth.ts, src/components/devotionals/anti-screenshot.tsx, src/app/admin/login/page.tsx, src/app/admin/invite/[token]/page.tsx, src/app/api/admin/auth/login/route.ts, src/app/api/admin/auth/logout/route.ts, src/app/api/admin/invites/route.ts, src/app/api/admin/invites/accept/route.ts, src/app/api/admin/email-templates/route.ts, src/app/api/admin/settings/route.ts, src/app/api/admin/devotionals/route.ts, src/app/api/devotionals/[slug]/unlock/route.ts, src/app/admin/(panel)/{records,settings,email-templates}/pages, src/middleware.ts, scripts/seed-admin.mjs, tests/email-templates.test.ts, tests/admin-auth.test.ts

**Files to Modify:**

- src/data/db/schema.ts, drizzle migration, src/config/defaults.ts, src/types/global.d.ts, src/integrations/resend/client.ts, src/config/site.ts (email templates setting), src/app/devotionals/[slug]/page.tsx, src/components/devotionals/access-gate.tsx, src/app/admin/layout.tsx (route group), src/app/admin/{page,devotionals,analytics} (route group move), src/components/admin/devotional-form.tsx, .env.example, package.json, ai-system docs

**Checkpoint Context:**

- Role model: `owner` = superadmin (seeded + invite-capable), `admin` = invited standard admin (no invite), `editor` reserved (unused).
- Superadmin invites themselves later; seed account is removable via `scripts/seed-admin.mjs` counterpart or direct DB delete — documented.

**Last Tool Output / Error:**
(none)

---

## Drift Check

**Last verified against repo:** 2026-08-20
**Any known drift between ai-system docs and actual code:** none at session start — execute-feature issue 1 closed clean.

---

_This file is overwritten on every new in-progress operation. Clear on clean completion._