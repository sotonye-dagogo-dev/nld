# In-Progress Work

> **Metadata**
>
> - last-updated-by: execute-feature (issue 2)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: this file is overwritten every session — always current

> **Overview:** Tracks work that is currently in progress but not yet complete. Written _before_ starting risky multi-step work, cleared on clean completion. This is the first file `resume-session.md` reads on interruption — it is the single source of truth for "what was half-done."

---

## Current State

**Status:** Complete — cleared on clean completion (execute-feature issue 2).

**What was completed (this session):**

- Asset protection hardened: locked devotional days no longer ship in the client bundle; unlocked via `POST /api/devotionals/[slug]/unlock` after server-side verification; `AccessGate` verifier+fetcher; `AntiScreenshot` client behavior (admin-configurable).
- Admin auth: cookie session + middleware redirect + guarded `(panel)` route group + login/logout + `scripts/seed-admin.mjs` owner bootstrap.
- Admin invite flow: superadmin-only invites → `/admin/invite/[token]` signup → accept API (auth user + `admins` row + auto-login).
- Email template editor: DB store with defaults fallback (`email-templates.ts`), pure render helpers (`email-render.ts`), block builder (`email-blocks.ts`), superadmin-only editor page (blocks/HTML toggle, variable chips, live preview); Resend renders from the store.
- Sprint 2 close-out: settings editor, records views (payments/grants/audit), devotional create/update/delete + form persistence + edit page.
- QA: typecheck clean, lint clean, 38/38 unit tests, production build green (30 routes), HTTP smoke tests (200/307/401/400, no RSC errors). Docs synced (repo-map, dependency-graph, project-plan, task-queue, test-plan, test-results, session-log, dev-history, project-decisions).

**Next up (queued in `planning/task-queue.md`, Sprint 3):**

1. Analytics dashboard (platform visits, devotional opens, purchases).
2. Live-key verification pass against real Paystack/Resend/Supabase accounts (payment → email → unlock e2e).
3. Bootstrap the owner: `npm run db:seed-admin` with real env, self-promote a real account, delete the seed account.