# Project Plan

> **Metadata**
> - last-updated-by: bootstrap-project (execute-feature, issue 1)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: re-verify if project scope or phase changes

> **Overview:** High-level feature checklist organized by development phase. See `planning/task-queue.md` for granular, sprint-level tasks. The MVP scope comes from `artifacts/genesis-directive.txt`; the beyond-MVP roadmap comes from the client Word brief (`artifacts/Next-Level-Devotional-App.md`) and platform suggestions.

---

## Phase 0 — Bootstrap & Foundation (current)

- [x] ai-system bootstrapped with project-specific content
- [ ] Next.js + Tailwind + TypeScript scaffold with config-driven globals
- [ ] Drizzle schema (settings, devotionals, days, purchases, access grants, audit, events)
- [ ] Integration wrappers (Paystack, Resend, Supabase)
- [ ] Universal component catalog baseline
- [ ] PWA manifest + service worker
- [ ] Config-driven settings store with fallbacks

## Phase 1 — MVP: Public Platform

- [ ] Browse devotionals (metadata-driven listing, paginated)
- [ ] Devotional reader page with configurable free preview days
- [ ] Purchase flow: email capture → Paystack init → popup → webhook verify
- [ ] Access password generation from Paystack reference + email delivery via Resend
- [ ] Access verification page + reader unlock
- [ ] Anti-screenshot / asset-protection behavior (admin-configurable)
- [ ] Audit trails for uploads, payments, access grants
- [ ] Event analytics (visits, devotional opens, page views)

## Phase 2 — MVP: Admin Panel

- [ ] Admin auth (Supabase Auth, admin-only)
- [ ] Devotional upload / edit (content + pricing + preview days + access mode)
- [ ] Records: payments, access grants, audit log viewer
- [ ] Analytics dashboard (platform visits, devotional opens, purchases)
- [ ] Settings editor (platform name, logo, copy, feature toggles, payment config)

## Phase 3 — Beyond MVP: Engagement (client Word brief)

- [ ] Live Q&A — members ask questions, answered by members and pastors in real time
- [ ] Share learnings / summaries with comments and likes
- [ ] Reading buddies pairing
- [ ] Sermon of the day per devotional day (video embed)

## Phase 4 — Beyond MVP: Access & Content Modes

- [ ] Subscription access model (monthly / time-duration) — admin-configurable alongside one-time purchase
- [ ] Bundles / collections of devotionals
- [ ] Bulk email + templated email preview workflow (§18)
- [ ] Stronger DRM: watermarking, streaming-only rendering, device binding
- [ ] Content scheduling / publishing calendar

## Phase 5 — Quality & Polish

- [ ] Unit test coverage for core modules (config, access, pricing)
- [ ] Integration tests for purchase + access flow
- [ ] E2E tests for browse → purchase → unlock
- [ ] Performance audit and optimisation
- [ ] Accessibility audit
- [ ] Error states and loading states complete

## Phase 6 — Launch & Handover

- [ ] Production environment configured (Vercel)
- [ ] Security audit (webhook signature verification, secrets, input validation)
- [ ] Documentation complete (deployment, admin runbook)
- [ ] Integration-ready: extraction guide for merging into the parent project

## Completed

- [x] Repository cloned from template with ai-system v3
- [x] Requirement artifacts ingested (genesis directive, Word brief → MD, vibecoded zip context)