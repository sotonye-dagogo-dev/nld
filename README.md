# Next Level Devotional

The **Next Level Devotional** webapp hosts devotionals and sells access to them.

**MVP scope:** visitors browse uploaded devotionals, open a dedicated devotional page, and purchase access through **Paystack**. A generated access password is emailed to the purchaser via **Resend**. An **admin panel** is used to upload devotionals and to view records of everything happening on the platform (uploads, payments, access grants, visits, devotional opens).

The app is intentionally a **standalone tool built to be merged into a larger project later** — integrations are isolated behind wrappers, behavior is config-driven, and it uses a single database (no scattered user stores).

## Tech Stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Frontend   | Next.js (App Router) + React  |
| Language   | TypeScript                    |
| Styling    | Tailwind CSS (config-driven)  |
| Database   | Supabase Postgres (Drizzle ORM) |
| Payments   | Paystack                      |
| Email      | Resend                        |
| Deploy     | Vercel                        |
| PWA        | Manifest + service worker     |

## Key Directives

- **Config-driven over hardcoded** — platform name, logo, content, pricing, access mode, and feature toggles are admin-configurable with safe code fallbacks.
- **Universal components & wrappers** — a small catalog of reusable UI components; vendor SDKs (Paystack, Resend, Supabase) are isolated in `src/integrations/*`.
- **Audit trails** — every state-changing action (uploads, payments, access grants) is logged with actor, timestamp, and before/after.
- **MVP-lean** — no member accounts; auth guards only the admin panel. The parent project will own full auth.

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in keys (see .env.example)
npm run dev                  # http://localhost:3000
```

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:generate` / `db:migrate`.

## Repository Layout

```
src/              → Next.js app (public pages, admin panel, API route handlers)
  components/ui/  → universal component catalog
  config/         → admin-configurable settings with fallbacks
  data/           → Drizzle schema + DB client
  integrations/   → Paystack / Resend / Supabase wrappers
  lib/            → service logic (access passwords, audit, utils)
  types/          → global TS types (injected, no imports needed)
ai-system/        → AI-assisted development system docs (plans, workflows, quality gates)
artifacts/        → client briefs (genesis directive, Word requirements MD, vibecoded zip)
tests/            → Vitest suites
```

## Documentation

- **Engineering brief:** `artifacts/genesis-directive.txt`
- **Client requirements (Word brief → MD):** `artifacts/Next-Level-Devotional-App.md`
- **Project plan (MVP + beyond-MVP roadmap):** `ai-system/planning/project-plan.md`
- **Architecture:** `ai-system/system-architecture.md`
- **AI system entry:** `ai-system/protocols/entry-protocol.md`

## AI-Assisted Development

This repository includes the **`ai-system` v3** framework. Sessions start at `ai-context.md`. The framework governs planning, quality gates, and documentation — see `ai-system/README`-level docs (`ai-system/protocols/entry-protocol.md`) for how to work within it.

## License

See [LICENSE](./LICENSE).