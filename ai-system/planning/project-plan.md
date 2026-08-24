# Project Plan

> **Metadata**
> - last-updated-by: update-ai-system (post-session 6)
> - last-verified-against-code: 2026-08-24
> - staleness-policy: re-verify if project scope or phase changes

> **Overview:** High-level feature checklist organized by development phase. See `planning/task-queue.md` for granular, sprint-level tasks. The MVP scope comes from `artifacts/genesis-directive.txt`; the beyond-MVP roadmap comes from the client Word brief (`artifacts/Next-Level-Devotional-App.md`) and platform suggestions.

---

## Phase 0 — Bootstrap & Foundation (complete)

- [x] ai-system bootstrapped with project-specific content
- [x] Next.js + Tailwind + TypeScript scaffold with config-driven globals
- [x] Drizzle schema (settings, devotionals, days, purchases, access grants, audit, events)
- [x] Integration wrappers (Paystack, Resend, Supabase)
- [x] Universal component catalog baseline
- [x] PWA manifest + service worker
- [x] Config-driven settings store with fallbacks

## Phase 1 — MVP: Public Platform (complete)

- [x] Browse devotionals (metadata-driven listing, paginated)
- [x] Devotional reader page with configurable free preview days
- [x] Purchase flow: email capture → Paystack init → popup → webhook verify
- [x] Access password generation from Paystack reference + email delivery via Resend
- [x] Access verification page + reader unlock
- [x] Anti-screenshot / asset-protection behavior (admin-configurable)
- [x] Audit trails for uploads, payments, access grants
- [x] Event analytics (visits, devotional opens, page views)

## Phase 2 — MVP: Admin Panel (complete)

- [x] Admin auth (Supabase Auth, admin-only routes + seeded superadmin)
- [x] Admin invite flow (superadmin → email link → signup → auto-added admin)
- [x] Devotional upload / edit (content + pricing + preview days + access mode)
- [x] Records: payments, access grants, audit log viewer
- [x] Analytics dashboard (platform visits, devotional opens, purchases)
- [x] Settings editor (platform name, logo, copy, feature toggles, payment config)
- [x] Email templates admin editor (visual blocks + raw HTML, superadmin-only)

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

- [x] Icons everywhere (lucide-react, no emoji/raw SVG — §15), global theme toggle, back-to-top, universal pagination, responsive navbar/sidebar (hamburger + overflow dropdowns + collapse)
- [x] SMTP support for Resend (config-driven, falls back to API)
- [x] Asset upload/management (Supabase Storage, cover images, admin CRUD)
- [x] Global destructive action wrapper (confirmation modal + undo timeout pattern)
- [x] Config-driven footer dev credit (name, URL, enable toggle) + dynamic copyright year
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