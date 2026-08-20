# Development Task Queue

> **Metadata**
> - last-updated-by: execute-feature (issue 1)
> - last-verified-against-code: 2026-08-20
> - last-synced: 2026-08-20 (execute-feature issue 1)
> - staleness-policy: re-verify before each session

> **Overview:** Sprint-level task queue with complexity tagging. Agents execute tasks top to bottom within the current sprint. Each task is sized so it can be completed in a single session.

---

## Complexity Tags

Tags help agents self-select whether a task needs the full `execute-feature.md` pipeline or a lighter `dev-cycle.md`:

| Tag | Meaning | Recommended Command |
|-----|---------|-------------------|
| `[XS]` | Trivial — single file, known pattern | dev-cycle.md |
| `[S]` | Small — 1-3 files, well-understood | dev-cycle.md |
| `[M]` | Medium — 3-8 files, some planning needed | dev-cycle.md with plan-feature pre-read |
| `[L]` | Large — feature spanning modules | execute-feature.md |
| `[XL]` | Very large — architecture-affecting | execute-feature.md, requires architect role |
| `[BUG]` | Bug fix | fix-build.md |

---

## Completed — Sprint 0: Foundation

| Size | Task | Status |
|------|------|--------|
| [XL] | Bootstrap ai-system docs for this project + scaffold config-driven Next.js foundation (this session) | [x] |
| [M] | Config-driven settings store (DB-backed with fallbacks) | [x] |
| [M] | Drizzle schema + migrations for all core tables | [x] |
| [M] | Integration wrappers: Paystack, Resend, Supabase | [x] |
| [M] | Universal component catalog baseline (Button, Input, Card, Navbar, Logo, ThemeToggle, Toast, Empty/Error, Modal, Table) | [x] |
| [S] | PWA manifest + service worker + theme | [x] |
| [S] | Root README + deployment/env documentation | [x] |

---

## Completed — Sprint 1: Public Platform (MVP)

| Size | Task |
|------|------|
| [L] | Devotional browse listing (metadata-driven, paginated) |
| [L] | Devotional reader page + configurable free preview + paywall |
| [XL] | Purchase flow: email → Paystack init → webhook verify → access grant + email |
| [M] | Access verification page + reader unlock |
| [M] | Anti-screenshot / asset-protection (admin-configurable) |
| [M] | Event analytics collection (visits, opens, page views) |
| [M] | Audit trail writer + payment/access records |

## Completed — Sprint 2: Admin Panel (MVP)

| Size | Task |
|------|------|
| [L] | Admin auth (Supabase Auth, admin-only routes) + seeded superadmin |
| [L] | Admin invite flow (superadmin-only, email link signup, auto-added admin) |
| [XL] | Devotional upload/edit admin module |
| [L] | Records views: payments, access grants, audit log |
| [L] | Analytics dashboard (remaining — see Up Next) |
| [M] | Settings editor (name, logo, copy, toggles, payment config) |
| [L] | Email templates admin editor (visual blocks + raw HTML, superadmin-only) |

---

## Up Next — Sprint 3: Analytics + Live verification

| Size | Task |
|------|------|
| [L] | Analytics dashboard (platform visits, devotional opens, purchases) |
| [M] | Live verification pass with real Paystack/Resend/Supabase keys (payment → email → unlock e2e) |

---

## Backlog

| Size | Task |
|------|------|
| [XL] | Live Q&A with real-time answers (Word brief) |
| [L] | Share learnings/summaries with comments + likes (Word brief) |
| [L] | Reading buddies pairing (Word brief) |
| [M] | Sermon of the day per devotional day (Word brief) |
| [XL] | Subscription / time-duration access modes (admin-configurable) |
| [L] | Devotional bundles / collections |
| [L] | Templated email preview workflow (§18) |
| [L] | Stronger DRM: watermarking, streaming rendering, device binding |
| [M] | Content publishing calendar / scheduling |
| [XL] | Package the `ai-system` kit for versioned install (npm / GitHub Releases) — deferred stretch goal from template v3 |
| [XL] | Optional `integrations/opencode/` adapter mapping `ai-system` commands to opencode slash-commands — deferred stretch goal from template v3 |

---

## Completed This Sprint

| Task | Completed |
|------|-----------|
| Ingest requirement artifacts (genesis directive, Word brief → MD, zip context) | [x] |
| Bootstrap ai-system project docs + foundation scaffold | [x] |
| Sprint 1 public platform (browse, reader+paywall, purchase, access, anti-screenshot, analytics, audit) | [x] |
| Sprint 2 admin panel (auth + invite flow, devotional upload/edit, records views, settings editor, email template editor) | [x] |

---

## Notes

- Work is tracked in the ai-system flow; the app lives under `src/`.
- Paystack/Resend/Supabase keys are never committed — use `.env` / Vercel env vars; `.env.example` lists all required vars.
- The client's vibecoded zip is reference context only, not a codebase to merge.