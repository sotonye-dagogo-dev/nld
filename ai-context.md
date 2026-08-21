# Project AI Context

> **Metadata**
>
> - last-updated-by: bootstrap-project (execute-feature, issue 1)
> - last-verified-against-code: 2026-08-20
> - installed-ai-system-version: 3
> - staleness-policy: re-verify before trusting if project structure has changed

> **Overview:** Project overview — the very first file any AI agent should read. Provides a 30-second orientation to what this project is, what stack it uses, and where to find everything.

---

## Quick Reference

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Project Name     | Next Level Devotional                                              |
| Type             | Web App (public devotional reader + admin panel)                   |
| Primary Language | TypeScript                                                         |
| Frontend         | Next.js 15 (App Router) + React                                    |
| Backend          | Next.js Route Handlers / Server Components                         |
| Database         | PostgreSQL (Supabase) via Drizzle ORM                              |
| Styling          | Tailwind CSS (config-driven, named global classes)                 |
| Deployment       | Vercel                                                             |
| Payments         | Paystack (transactional email via Resend)                          |

---

## Key Modules

| Module                 | Location              | Purpose                                              |
| ---------------------- | --------------------- | ---------------------------------------------------- |
| Public devotional app  | `src/app`             | Browse, read, and purchase devotionals               |
| Admin panel            | `src/app/admin`       | Upload devotionals, view records, configure platform |
| Global config          | `src/config`          | Admin-configurable settings with code fallbacks      |
| Data layer             | `src/data`            | Drizzle schema + DB client                           |
| Integration wrappers   | `src/integrations`    | Paystack, Resend, Supabase isolated wrappers         |
| Universal components   | `src/components/ui`   | Config-driven reusable UI catalog                    |
| AI system docs         | `ai-system/`          | Development workflow, plans, and quality gates       |
| Requirement artifacts  | `artifacts/`          | Client briefs (genesis directive, Word doc, zip)     |

---

## Entry Point

The AI system documentation lives in `ai-system/`.

Start with: `ai-system/protocols/entry-protocol.md`

Two catalogs worth knowing exist (read on demand, not up front):
- Skills catalog: `ai-system/skills/README.md` (Tier 3 — load a skill's `SKILL.md` when its trigger matches)
- Tool/resource registry: `ai-system/tools/registry.md` (Tier 3 — check before doing by hand what a registered tool does)

---

## Active Development Focus

Bootstrapping the ai-system docs and scaffolding the config-driven Next.js foundation for the MVP: devotional hosting, paid access via Paystack + Resend, and an admin panel — built to be absorbed into a larger project later.