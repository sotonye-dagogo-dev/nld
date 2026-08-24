# Development History

> **Metadata**
>
> - last-updated-by: execute-feature (issue 1)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: historical entries do not go stale

> **Overview:** Chronological log of completed development work. Each sprint ends with a summary entry. Agents add entries after completing tasks. Useful for understanding what has been built, when decisions were made, and what patterns have emerged.

---

## Entry Format

```
## [Date] — [Sprint or Session Title]

**Summary:**
[2-4 sentence overview of what was accomplished]

**Completed:**
- [task 1]
- [task 2]

**Key Changes:**
- [important architectural or behavioural change]

**Next Sprint Focus:**
[What comes next]
```

---

## History

---

## 2026-08-20 — Sprint 0: Bootstrap & Foundation

**Summary:**
Bootstrapped the ai-system docs with real project content for the Next Level Devotional app and commenced development with a config-driven Next.js foundation scaffold. Converted the client's Word brief to Markdown and ingested the vibecoded zip as reference context.

**Completed:**
- Word brief converted to `artifacts/Next-Level-Devotional-App.md`
- ai-system bootstrap: ai-context, project-context, system-architecture, design-system, project-plan (MVP + beyond-MVP roadmap), task-queue, project-decisions, repo-map, dependency-graph
- Config-driven Next.js foundation scaffold (config module, global types, tailwind globals, universal components, drizzle schema, integration wrappers, route skeletons, PWA, tests)
- Root README + .env.example

**Key Changes:**
- Introduced `src/` application layer aligned with `system-architecture.md`
- Locked decisions: access password derived from Paystack reference (HMAC), no member auth in MVP, config-driven settings with fallbacks, integration wrappers for merge-readiness

**Next Sprint Focus:**
Sprint 1 — public platform: browse listing, reader + paywall, purchase flow, access verification, audit/analytics collection.

---

## 2026-08-20 — Sprint 1 & 2: MVP Close-Out (asset protection, admin auth + invites, email template editor)

**Summary:**
Closed out the MVP: hardened asset protection so locked devotional days never ship in the client bundle, added Supabase-backed admin auth with a seeded superadmin + email invite flow, made email templates admin-configurable with a visual block builder and raw HTML editor, and finished the remaining Sprint 2 work (settings editor, records views, devotional upload persistence).

**Completed:**
- Asset protection: preview-only SSR reader; locked days fetched via `/api/devotionals/[slug]/unlock` after server-side verification; `AccessGate` verifier+fetcher; `AntiScreenshot` client behavior (admin-configurable)
- Admin auth: cookie session (`admin_session`), middleware redirect, guarded `(panel)` route group, login/logout, `scripts/seed-admin.mjs` owner bootstrap
- Invite flow: superadmin-only invites API → `/admin/invite/[token]` signup → accept API (auth user + `admins` row + auto-login)
- Email templates: `email_templates` table + DB store with defaults fallback, pure render helpers + block builder (`email-render.ts`, `email-blocks.ts`), superadmin editor with blocks/HTML toggle + live preview; Resend renders from the store
- Sprint 2 remainder: settings editor, records views (payments/grants/audit), devotional create/update/delete + form persistence + edit page
- Migration `drizzle/0001_*.sql`; 17 new unit tests (renderer, blocks, admin auth)

**Key Changes:**
- Reader day-fetch bug fixed (was querying days by `slug` instead of `devotional.id`)
- Block serializer canonicalized (`password-box` divs, bare `<a>` buttons) so editor round-trips are stable; seeded defaults aligned
- RBAC data-driven via `ADMIN_PRIVILEGES` (`owner`/`admin`/`editor`)

**Next Sprint Focus:**
Sprint 3 — analytics dashboard (visits/opens/purchases) + live-key verification pass against real Paystack/Resend/Supabase accounts.

---

## 2026-08-20 — Sprint 3 (part 1): Analytics dashboard

**Summary:**
Completed the analytics dashboard — the first remaining Sprint 3 task. The admin panel now surfaces platform visits, devotional opens, and purchases as stat cards, last-30-days trend bars, top-devotional rankings, and a recent-events feed, with `page.view` collection added to the main public entry points so the visits metric is real.

**Completed:**
- Analytics dashboard: overview stats (visits, opens, completed purchases, revenue, conversion rate), 30-day trend bars (CSS-only, no chart dep), top devotionals by opens and by purchases/revenue, recent-events table
- `page.view` collection on home listing, purchase page, and access page (fire-and-forget, non-blocking)
- Pure analytics helpers (`src/lib/analytics.ts`) with UTC day-key series + conversion math; 8 unit tests
- Analytics nav link for all admin roles; layout nav refactored to explicit arrays

**Key Changes:**
- Day buckets standardized on UTC day keys (`to_char(... AT TIME ZONE 'UTC', 'YYYY-MM-DD')`) so dashboard math is timezone-deterministic
- Dashboard is read-only aggregation over existing `events`/`purchases`/`devotionals` tables — no schema change, follows records-view patterns

**Next Sprint Focus:**
Sprint 3 (part 2) — live-key verification pass against real Paystack/Resend/Supabase accounts (payment → email → unlock e2e), then owner bootstrap (seed-admin → self-promote → delete seed).

---

## 2026-08-20 — Compliance run + global UI/UX pass (icons, theme, back-to-top, pagination, responsiveness)

**Summary:**
Ran the QA gate and delivered the global UI/UX pass: icons now come from lucide-react (§15, no emoji/raw SVG), the theme toggle is hydration-safe, a universal Pagination component powers every list/table, a global back-to-top is mounted once in the root layout, and the navbar + admin sidebar are fully responsive with hamburger menus, overflow dropdowns, and non-conflicting collapsibility.

**Completed:**
- Added `lucide-react` icon library (flagged in project-decisions); replaced the ThemeToggle emoji (☀/☾/◐) with Sun/Moon/Monitor; grep confirms no emoji or `<svg>` remains in UI code
- `useTheme` hardened — reads localStorage post-mount, eliminating the hydration-mismatch trap
- Universal `Pagination` (`src/components/ui/pagination.tsx`) + pure helpers (`src/lib/pagination.ts`) used by the home listing (href links) and every `Table` (buttons); hidden on single page; 8 unit tests
- Global `BackToTop` mounted in the root layout; anti-screenshot "Protected content" badge moved bottom-left to avoid overlap
- Navbar: client component with mobile hamburger menu and a desktop overflow→"More" dropdown (ResizeObserver-measured)
- Admin sidebar: extracted to `AdminSidebar` client component — mobile hamburger drawer + desktop collapse-to-icons + sign-out; old `logout-button.tsx` removed
- Fixed a compliance-run finding: `/purchase/[slug]` 500'd without a DB → now degrades to `ErrorState` like sibling pages

**Key Changes:**
- Engineering principle §15 now actually enforced (icon library over emoji/SVG)
- Pagination is a single catalog baseline component (§13/§21) instead of two bespoke implementations
- Navbar/sidebar toggles are independent — opening one never conflicts with another

**Next Sprint Focus:**
Sprint 3 (part 2) — live-key verification pass with real Paystack/Resend/Supabase keys, including a browser pass over the new interactive UI (hamburger, drawer/collapse, back-to-top).

---

## 2026-08-24 — Sprint 3 Completion: Integrations hardening, assets, destructive actions, footer config

**Summary:**
Completed the remaining Sprint 3 work and additional hardening: ran DB migrations and seeded the admin user, added SMTP support for Resend (config-driven with API fallback), implemented asset upload/management via Supabase Storage (covers, admin CRUD), created a global destructive action wrapper with confirmation modal and undo timeout (5s), and made the footer developer credit fully config-driven (name, URL, enabled toggle) with a dynamic copyright year.

**Completed:**
- Database: `npm run db:migrate` applied all migrations; `npm run db:seed-admin` created superadmin (superadmin@nldv.vercel.app) and seeded email templates
- Resend SMTP: added `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD` to env; Resend client now uses SMTP when configured, falls back to API; added `nodemailer` dependency
- Asset management: Supabase Storage integration (`uploadAsset`, `deleteAsset`, `getAssetPublicUrl`), `/api/admin/assets` route (POST/DELETE with audit), `FileUpload` component with preview/remove, integrated into `DevotionalForm` for cover images
- Destructive action pattern: `useConfirmAction` hook + `ConfirmActionWrapper` + `WithConfirmAction` HOC; confirmation modal via `ConfirmDialog`; undo toast with 5s progress bar; reusable for delete/replace actions
- Footer dev credit: added `footerDevCreditName`, `footerDevCreditUrl`, `footerDevCreditEnabled` to `SiteSettings` with defaults (S.D., https://sotonye-dagogo.is-a.dev, true); rendered in root layout with dynamic year (`new Date().getFullYear()`); admin settings editor updated with footer section
- Updated admin settings editor with footer dev credit configuration section

**Key Changes:**
- Resend now dual-mode (API + SMTP) — SMTP takes priority when configured, zero code changes at call sites
- Asset uploads go to Supabase Storage `devotional-assets` bucket; DB stores path + public URL
- Global destructive action pattern established — replaces ad-hoc confirm dialogs, provides consistent UX with undo
- Footer credit is fully admin-configurable via settings editor; no hardcoded values
- Copyright year is dynamically rendered, not hardcoded

**Next Sprint Focus:**
Sprint 3 (part 2) — live-key verification pass with real Paystack/Resend/Supabase keys (payment → email → unlock e2e) + browser pass over interactive UI. Operational: bootstrap owner account, self-promote, delete seed.