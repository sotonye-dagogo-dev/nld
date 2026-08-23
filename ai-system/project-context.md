# Project Context

> **Metadata**
> - last-updated-by: bootstrap-project (execute-feature, issue 1)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: re-verify if >10 sessions old or after major scope changes

> **Overview:** Why this project exists, who it serves, and what constraints govern development. Agents should read this to understand the "why" behind the work.

---

## Project Purpose

The Next Level Devotional app hosts the church's devotional content and sells access to it. The MVP lets visitors browse uploaded devotionals, open a dedicated page for any devotional, and purchase access through Paystack. Access is delivered as a generated password sent by email (via Resend). An admin panel is used to upload devotionals and to see records of everything that happens on the platform. The app is intentionally a standalone tool that will later be merged into a larger project, so it is built to be easily integratable (wrapped integrations, config-driven behavior, no scattered databases).

---

## Target Users

| User Type             | Needs                                                            | Key Interactions                                   |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| Church members        | Read devotionals, pay for access, receive access password        | Browse, view devotional, purchase via Paystack, enter password |
| Admins / platform ops | Upload devotionals, configure platform, see records              | Admin panel: content upload, settings, analytics   |
| Visitors (no account) | Sample the platform before paying                                | Browse listing, view free preview days             |

---

## Business Constraints

- No large-scale authentication in the MVP — auth only guards the admin panel (the larger parent project will own auth later; do not scatter user databases).
- User emails are captured at purchase time for Paystack + Resend delivery.
- Payment, pricing, and access model must be admin-configurable, not hardcoded.
- Anti-screenshot / screen-capture / asset-retrieval protection is a default behavior and admin-configurable.
- Full audit trails required: asset uploads, payments, access grants (with emails), platform interactions (visits, devotional opens, page views).
- Must be a PWA.
- Must degrade gracefully when a config value, env var, or integration is unavailable (§1/§3 fallback discipline).

---

## Current Project Phase

Phase: Active Development

Active sprint focus: Sprint 3 completion — integrations hardening (SMTP, assets), global destructive action pattern, config-driven footer, live-key verification pass preparation.

---

## Tech Decisions Already Made

| Decision | Reason |
|----------|--------|
| Next.js (App Router) + TypeScript | Directive; config-driven approach with globally defined components and wrappers |
| Tailwind CSS | Directive; styling done in a global file with named classes |
| Drizzle ORM + Supabase Postgres | Directive; type-safe queries, no scattered DBs |
| Vercel deployment | Directive |
| Paystack + Resend | Directive; payments and transactional mail |
| PWA | Directive |
| Config-driven over hardcoded (§1), metadata-driven structure (§2), admin-editability with fallbacks (§3) | Engineering standards + directive (even the barest things — platform name, logo, content — must be admin configurable) |
| Access password derived from the Paystack transaction reference | No secret exchange needed; verifiable without extra state |
| Resend dual-mode (API + SMTP) | SMTP for production deliverability; API as fallback; zero call-site changes |
| Supabase Storage for asset uploads | Covers, future assets; integrated with audit trail |
| Global destructive action pattern (`useConfirmAction`) | Consistent confirmation + undo UX across admin actions |

---

## Out of Scope

- User accounts / large-scale auth for members (parent project will own it)
- Reading buddies, live Q&A, shares/testimonies, per-day sermons (in the client Word brief, but beyond the MVP directive — see `planning/project-plan.md` roadmap)
- Native mobile apps
- Migrating or importing the client's vibecoded zip codebase (context only)

---

## External Integrations

| Service    | Purpose                            | Auth Method              |
| ---------- | ---------------------------------- | ------------------------ |
| Supabase   | Postgres database, admin auth, storage | anon + service-role keys |
| Paystack   | Payment collection (init + webhook) | Public + secret keys     |
| Resend     | Transactional email (access password) | API key (primary) / SMTP (fallback) |
| Vercel     | Deployment + env hosting           | Platform secrets         |