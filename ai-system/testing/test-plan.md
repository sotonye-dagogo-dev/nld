# Test Plan

> **Metadata**
> - last-updated-by: execute-feature (issue 3)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: re-verify if new features are added

> **Overview:** Defines what needs to be tested and at what level. Referenced by `verify-work.md` during the quality gate. Updated as new features are added. Per engineering principles §19, coverage is expected across **all three tiers proportionally** — many unit tests, fewer integration tests, fewest e2e — not e2e-only or untested-only; this file must show that coverage, not just "tests exist."

---

## Unit Tests

- [x] Access password generation is deterministic from a transaction reference (HMAC)
- [x] Access password verification rejects wrong/tampered inputs
- [x] Config fallbacks return safe defaults when settings/env are missing
- [ ] Config fallbacks handle malformed setting values (non-numeric price, bad boolean)
- [ ] Audit log writer persists actor/action/before/after
- [ ] Pricing helper returns cents + display currency per config
- [x] Email template renderer escapes interpolated values, leaves template markup intact, tolerates unknown/whitespace variables (tests/email-templates.test.ts)
- [x] Email template subject renderer substitutes plain text
- [x] Email block builder serializes blocks to HTML and round-trips (heading/paragraph/password/button/divider), falls back to raw html block for arbitrary markup (tests/email-templates.test.ts)
- [x] Admin auth helpers: `isSuperAdmin` (owner-only), `can`/`ADMIN_PRIVILEGES` role→privilege mapping for owner/admin/editor (tests/admin-auth.test.ts)
- [x] Analytics helpers: UTC day keys, gap-filled 30-day series aggregation, zero-fill, and conversion-rate math (tests/analytics.test.ts)
- [x] Pagination helpers: page-count ceil math with guards, page-item list with ellipsis for wide ranges, input clamping (tests/pagination.test.ts)

---

## Integration Tests

- [ ] Paystack webhook: valid signature flips purchase to success and creates access grant
- [ ] Paystack webhook: invalid signature rejected (403)
- [ ] Paystack webhook: duplicate webhook idempotent (no double grant/email)
- [ ] Database CRUD: devotional + days insert/query
- [ ] Access verify route: valid password unlocks, invalid password denied
- [ ] Supabase admin auth guard blocks non-admin route access
- [ ] Invite flow: create invite → accept → admin row created → auto-login
- [ ] Email template store: DB template overrides defaults; unknown template key falls back

---

## End-to-End Tests

- [ ] Browse listing → open devotional → preview days → purchase → Paystack → webhook → email → /access unlock
- [ ] Admin login → upload devotional → appears on public listing

---

## Performance Tests

- [ ] API response time under normal load
- [ ] Database query performance (paginated listing)
- [ ] Page load times (frontend), PWA offline shell

---

## UI / UX Verification (manual — browser)

- [x] Navbar: hamburger opens/closes the mobile menu; desktop overflow links collapse into a "More" dropdown; toggles do not conflict
- [x] Admin sidebar: mobile hamburger drawer opens/closes; desktop collapse-to-icons toggle works; sign-out reachable in both states
- [x] BackToTop appears after scrolling and smooth-scrolls to top; does not overlap the anti-screenshot badge (badge moved to bottom-left)
- [x] Pagination renders page numbers + prev/next, hides on a single page, works for server links and table buttons
- [x] Theme toggle cycles light/dark/system using lucide icons; no hydration mismatch (storage read post-mount)

---

## Tooling

- Unit: Vitest (`npm test`).
- Type/lint: `npm run typecheck`, `npm run lint`.
- Build gate: `npm run build` (production build must pass before close).