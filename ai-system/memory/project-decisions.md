# Project Decisions

> **Metadata**
> - last-updated-by: update-ai-system (post-session 12)
> - last-verified-against-code: 2026-09-02
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Log of significant architectural, technical, and product decisions. Agents consult this before proposing changes to avoid contradicting prior reasoning. Uses supersedes/superseded-by links so contradictory entries are explicitly resolved rather than both appearing equally valid.

---

## Decision Format

```
## [Decision Title]

**Decision:** [What was decided]
**Date:** [YYYY-MM-DD]
**Made by:** [Role / Agent / Developer]
**Supersedes:** [link to any prior decision this replaces, or None]
**Superseded by:** [link to any newer decision that replaces this, or None]

**Reason:**
[Why this choice was made]

**Alternatives Considered:**
[What else was evaluated and why it was rejected]

**Implications:**
[What this decision affects going forward]
```

---

## Decisions

### Icon system: lucide-react (new external dependency)

**Decision:** Add `lucide-react` as the project icon library. All UI icons (theme toggle, nav hamburger/overflow, pagination chevrons, back-to-top, admin sidebar/nav, logout) are imported from lucide-react. No emoji-as-icon and no hand-written inline SVG in component code (engineering principle §15).
**Date:** 2026-08-20
**Made by:** execute-feature (issue 5)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: "ensure icons are used and not emojis or svgs" — principle §15 requires an icon library/component system. ThemeToggle previously rendered emoji (☀/☾/◐), a §15 violation. lucide-react is tree-shakeable, works with React 19 / Next 15, and matches Tailwind tokens.

**Alternatives Considered:**
- Inline hand-written SVG components — rejected: directive forbids raw SVG, and §15 says icons come from the icon system.
- `@heroicons/react` — viable, but lucide-react offers the full glyph set (hamburger, panel collapse, logout, chevrons) with smaller per-icon payload.
- Keeping emoji — rejected: violates §15 and the directive.

**Implications:**
- Any new icon must be a lucide-react import, not emoji or raw SVG.
- lucide-react is tree-shaken; only used icons ship. Bundle impact measured in build output (shared JS ~103 kB, no material increase).

---

### Universal Pagination component (§13/§21 baseline)

**Decision:** One `Pagination` component (`src/components/ui/pagination.tsx`) is the single pagination control for all views — the home listing (server-rendered links via `hrefForPage`) and every `Table` (client buttons via `onPageChange`). Page-range math lives in the pure helper `src/lib/pagination.ts` (`getPageItems`, `getPageCount`). The component renders nothing on a single page.
**Date:** 2026-08-20
**Made by:** execute-feature (issue 5)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: "pagination ... globally handled and non-blocking." Home page previously hand-rolled prev/next links and `Table` had its own inline controls — two bespoke implementations of the same contract (§4/§13/§21).

**Alternatives Considered:**
- Keep the two bespoke implementations — rejected: duplicates the catalog baseline.
- Infinite scroll — rejected: not asked for, and pagination remains the §21 default.

**Implications:**
- New paginated views must use `Pagination`, never bespoke prev/next markup.
- Page-range logic is unit-tested (`tests/pagination.test.ts`, 8 tests).

---

### Global theme + back-to-top mounted once in the root layout

**Decision:** `BackToTop` (`src/components/ui/back-to-top.tsx`) is mounted once in the root layout and is non-blocking — it renders nothing until the user scrolls past 400px, then shows a fixed bottom-right button. `ThemeToggle`/`useTheme` remain global via the Navbar. To avoid overlap, the anti-screenshot "Protected content" badge moved from bottom-right to bottom-left.
**Date:** 2026-08-20
**Made by:** execute-feature (issue 5)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: "theme toggle, to the top, ... globally handled and non-blocking." BackToTop being fixed bottom-right would collide with the reader's bottom-right protection badge, so the badge relocated.

**Alternatives Considered:**
- Per-page back-to-top — rejected: directive asks for global, single-mount.
- Leaving the badge bottom-right — rejected: direct overlap with the button on reader pages.

**Implications:**
- Any future fixed bottom-right control must consider BackToTop; bottom-left is now the badge slot.

---

### Access password derived from the Paystack transaction reference

**Decision:** The access password emailed to a purchaser is deterministically derived from the Paystack transaction reference using HMAC (`HMAC-SHA256(txn_reference, ACCESS_PASSWORD_SECRET)`), truncated to a readable group. Verification recomputes the same value from the stored reference — no password storage, no separate secret exchange.
**Date:** 2026-08-20
**Made by:** Architect (execute-feature, issue 1)
**Supersedes:** None
**Superseded by:** None

**Reason:**
The directive requires an access password "generated somehow from the paystack transaction." Deterministic derivation is verifiable with zero extra state, survives webhook retries idempotently, and lets /access verification work from the transaction reference alone.

**Alternatives Considered:**
- Random password stored in a table — rejected: extra secret storage and a harder email-retry path.
- Paystack `receipt` link as the only access key — rejected: the platform must control access independent of Paystack UI.

**Implications:**
- `ACCESS_PASSWORD_SECRET` must be stable; rotating it invalidates existing grants (mitigation: keep a small list of past secrets for verification, or regenerate grants on rotation).
- The secret must never leak into the client bundle.

---

### No member auth in MVP; admin-only Supabase Auth

**Decision:** Members do not create accounts. Emails are captured at purchase. Supabase Auth guards only `/admin/*`. The parent project will own full auth later.
**Date:** 2026-08-20
**Made by:** Architect (execute-feature, issue 1)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: "authentication isn't used for the mvp unless to access the admin panel" and "I don't want scattered databases."

**Alternatives Considered:**
- Member accounts via Supabase Auth — rejected for MVP: adds signup/friction and duplicates the parent project's future auth.

**Implications:**
- Purchase/access records keyed by email, not user id.
- Admin identity comes from Supabase Auth `auth.users`; a minimal `admins` table maps emails to roles with RLS.

---

### Config-driven everything with code fallbacks

**Decision:** Platform name, logo, copy, pricing, access mode, feature toggles, and anti-screenshot protection are stored in a DB `settings` store and read through `src/config/site.ts`, which always returns a hardcoded fallback when a setting is unset or the DB is unavailable (§1/§3).
**Date:** 2026-08-20
**Made by:** Architect (execute-feature, issue 1)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: "even the barest things admin configurable like the platform name, logo, content"; engineering principles §1/§3.

**Alternatives Considered:**
- Pure `.env` config — rejected: non-engineers must edit values without deploys.
- Hardcoded constants only — rejected: violates the directive.

**Implications:**
- Every config read must have a documented fallback; UI must not break when a setting is missing.
- Admin settings editor (Sprint 2) writes to the `settings` store.

---

### Integration wrappers isolate vendor SDKs (§17)

**Decision:** Paystack, Resend, and Supabase are accessed only through `src/integrations/<service>/` wrappers (client + config + types). Call sites never import vendor SDKs directly. Replacing a provider touches only its wrapper folder.
**Date:** 2026-08-20
**Made by:** Architect (execute-feature, issue 1)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: the app "will be merged into a larger project that will deprecate this standalone tool (needs to be easily integratable)"; engineering principle §17.

**Alternatives Considered:**
- Direct vendor calls scattered across pages — rejected: hard to swap, hard to extract later.

**Implications:**
- `grep` for vendor SDK imports must only hit wrapper files.
- Access password verification and purchase verification live behind the Paystack wrapper.

---

### Vibecoded zip is context, not a merge source

**Decision:** The client's `artifacts/next-level-devotional.zip` (static HTML/JS site) is treated as reference context only. No code is imported from it. The Word brief is a requirements source; `genesis-directive.txt` is the authoritative engineering brief.
**Date:** 2026-08-20
**Made by:** Architect (execute-feature, issue 1)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: "I don't care much for it, still adding in case you get some context." The zip is a different stack (vanilla HTML + Netlify) with no config-driven architecture.

**Alternatives Considered:**
- Porting the zip's schema/UX patterns — the schema (profiles/purchases/QA/shares/buddies) informed the data model for beyond-MVP features only.

**Implications:**
- The `purchases` concept and beyond-MVP tables are re-designed for the config-driven Next.js stack rather than copied.

---

### Admin session = signed Supabase token in an HttpOnly cookie; middleware stays cheap

**Decision:** Store the signed Supabase access token in an `admin_session` HttpOnly cookie. `src/middleware.ts` only redirects `/admin/*` to `/admin/login` when the cookie is absent. Real authorization (token validation against Supabase + `admins` row lookup by `auth_user_id`/email) happens in the guarded `(panel)` layout and per-API guards via `requireAdmin`.
**Date:** 2026-08-20
**Made by:** execute-feature (issue 2)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Keeps the middleware hot-path cheap (no DB/Supabase round-trip on every request) while making it impossible to reach admin data without a valid session. Layouts/route handlers are the actual gate.

**Alternatives Considered:**
- JWT in a separate signed cookie — equivalent security, more moving parts.
- Middleware performing full validation — rejected: would hit Supabase + DB on every page navigation.

**Implications:**
- Middleware must NOT be the security boundary for admin data; any new `/admin/*` page must rely on the guarded layout, and any API must call `requireAdmin`.

---

### Admin role model: `owner` (superadmin) vs `admin` (invited) vs `editor` (reserved)

**Decision:** Roles map to privileges via `ADMIN_PRIVILEGES` in `src/lib/admin-auth.ts`. `owner` = superadmin (can invite + edit email templates + everything). `admin` = invited standard admin (no invite power, no template editing). `editor` reserved for future content-only access. Seed script creates an `owner` bootstrap account (`scripts/seed-admin.mjs`, `npm run db:seed-admin`); invitees are created as `admin`.
**Date:** 2026-08-20
**Made by:** execute-feature (issue 2)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Directive: superadmin is the only one who can invite; all other admin powers are broadly shared. Keeps RBAC data-driven and easy to extend.

**Alternatives Considered:**
- Boolean `isSuperAdmin` flag on admins — equivalent but less extensible than a role + privilege map.

**Implications:**
- The seeded `owner` is temporary: self-promote a real account, then delete the seed account (`scripts/seed-admin.mjs --delete` or direct DB delete). Documented in `.env.example` and the QA report.

---

### Email template variables: escape interpolated values only; template markup is trusted

**Decision:** `renderTemplate` replaces `{{var}}` placeholders and HTML-escapes the substituted values (`escapeHtml`). Static template markup is authored by admins (superadmin-only editor) and is left as-is. Unknown variables stay untouched.
**Date:** 2026-08-20
**Made by:** execute-feature (issue 2)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Email content is admin-authored (not end-user input), so template markup is trusted; only interpolated runtime values (email addresses, URLs, passwords) are untrusted and must be escaped to prevent injection into the rendered email.

**Alternatives Considered:**
- Escaping the whole template — would double-escape legitimate admin markup.
- Treating templates as fully untrusted — contradicts the superadmin-only editor design.

**Implications:**
- Any future template source outside the superadmin editor must be treated as untrusted.

---

### Email template block serializer must be self-consistent with seeded defaults

**Decision:** The visual builder's block→HTML serializer (`email-block-to-html` in `src/lib/email-blocks.ts`) is the canonical form: password boxes render as `<div style="...password-box">`, buttons as bare `<a>` (no `<p>` wrapper), so `emailHtmlToBlocks` can round-trip them unambiguously. `src/config/defaults.ts` and `scripts/seed-admin.mjs` seed templates using the same forms.
**Date:** 2026-08-20
**Made by:** execute-feature (issue 2)
**Supersedes:** None
**Superseded by:** None

**Reason:**
The initial password/button forms (`<p>` wrappers, no parser marker) could not be recovered as blocks after an edit — the paragraph branch swallowed anchors. Canonicalizing the forms keeps "edit → save → reopen" stable.

**Alternatives Considered:**
- Special-casing the parser for the old `<p style="...">` forms — rejected as fragile and permissive.

**Implications:**
- Do not change block serialization without updating the parser + seeded defaults together.

---

### PDF extraction backend for the design-asset viewer

**Decision:** Use the single multi-format converter (`markitdown`) if the project is Python-heavy; use the PDF classify-then-extract library (`pdf-inspector`) if the project is Rust/WASM-friendly. Reaffirm at implementation time of the design-asset viewer.
**Date:** [YYYY-MM-DD]
**Made by:** bootstrap-project (seeds the v3 decision)
**Supersedes:** None
**Superseded by:** None

**Reason:**
The viewer needs PDF text/structure extraction in one thin wrapper. This is a stack-fit decision, not a fixed default.

**Alternatives Considered:**
- PDF-only Rust extractor as hard dependency — rejected as over-coupling.
- No extraction at all — rejected because agents must read PDF specs as Markdown.

**Implications:**
- Deferred until the design-asset viewer is built (not in MVP scope).

---

### Email provider: Cloudflare Workers + MailChannels (free, no domain verification)

**Decision:** Use Cloudflare Workers + MailChannels as the primary email provider for the free `nldv.vercel.app` domain. Resend remains as a fallback option. The email abstraction (`EmailClient` interface) supports both via `EMAIL_PROVIDER` env var.
**Date:** 2026-08-24
**Made by:** update-ai-system (post-session 7)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Resend requires domain verification and blocks sending from `nldv.vercel.app`. Cloudflare Workers + MailChannels is completely free (no limits), requires no domain verification, works with any subdomain, and integrates via a simple HTTP relay. The existing DB-backed template system, admin editor, variable handling, and call sites remain unchanged — only the transport layer is swapped.

**Alternatives Considered:**
- Brevo (Sendinblue): 300 emails/day free, but still requires sender verification for production
- SendGrid: 100 emails/day free, domain auth required for production volumes
- Postmark: 100 emails/month free, strict domain verification
- Self-hosted SMTP: requires server management, IP reputation, deliverability work
- AWS SES: requires AWS account, domain verification, sandbox limits

Cloudflare + MailChannels is the only option that is completely free, unlimited, works immediately with `nldv.vercel.app`, and requires no domain ownership.

**Implications:**
- `EMAIL_PROVIDER` env var selects provider (`resend` | `cloudflare`)
- Cloudflare Worker secret stored in Cloudflare Worker environment (not Vercel)
- Worker URL (`CLOUDFLARE_EMAIL_WORKER_URL`) and secret (`CLOUDFLARE_EMAIL_WORKER_SECRET`) in Vercel env vars
- Templates, variables, admin editor, preview — all unchanged
- Resend SMTP/API remains as a tested fallback
---

### Analytics resilience + layout timeout for perceived performance

**Decision:** Analytics page renders partial data (only hard-fails when all 7 queries miss) and the root layout races nav DB calls with a 2500ms fallback; `loading.tsx` skeletons exist for root and `admin/(panel)` so route transitions feel instant.
**Date:** 2026-09-02
**Made by:** execute-feature (post-session 12)
**Supersedes:** None
**Superseded by:** None

**Reason:**
One flaky pooler query was blanking the whole analytics page with "Check DATABASE_URL" even when 6/7 queries succeeded; the root layout awaiting devotionals on every request made every navigation feel laggy.

**Alternatives Considered:**
- Keep full ErrorState on any null — rejected: over-fragile.
- Await layout DB without timeout — rejected: blocked TTFB.

**Implications:**
- New aggregation pages must follow partial-data pattern.
- Any new layout nav data must go through withLayoutTimeout or equivalent.

---

### Blank-overlay content protection for screenshots/capture/window loss

**Decision:** Best-effort deterrence with blank overlay on `visibilitychange`/`blur`/`pagehide`/`beforeprint`/`PrintScreen`/`Ctrl+P`/`Cmd+Shift+3|4|5`/`F12` and a `navigator.mediaDevices.getDisplayMedia` monkey-patch that throws; overlay appears in both the viewer (ContentReader `useProtectionBlur`) and page wrapper (AntiScreenshot) and covers normal and fullscreen via `fixed inset-0 z-[60..70]`.
**Date:** 2026-09-02
**Made by:** execute-feature (post-session 12)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Cannot truly block OS screenshots; blanking the reader when the window loses focus or capture keys are pressed is the strongest practical deterrent.

**Alternatives Considered:**
- npm packages for screenshot detection — rejected: no reliable cross-OS library; pure DOM events cover majority cases with zero deps.
- Only viewer-scoped overlay — rejected: user could still screenshot surrounding page; page-level overlay adds second layer.

**Implications:**
- getDisplayMedia override throws — if legitimate capture is ever needed, guard behind `hasFullAccess`.
- Document as deterrence, not DRM.

---

### Viewer UX: expand/zoom/pagination are first-class controls

**Decision:** ContentReader controls are: `isExpanded` ↔ height `h-[520/600]`/`h-[85vh]` plus `requestFullscreen`, zoom 0.5–3× via scale transform, page input (number + prev/next, clamped) with DOCX `ceil(len/1800)` and PDF hash params. Expand no longer means "show more text chars" — that stays `showFullContent` for truncated previews.
**Date:** 2026-09-02
**Made by:** execute-feature (post-session 12)
**Supersedes:** None
**Superseded by:** None

**Reason:**
Expand button did nothing because it toggled truncation truthiness that was falsy for PDFs; height fix plus discrete controls makes viewer usable.

**Alternatives Considered:**
- CSS `zoom` property — rejected: non-standard, breaks Firefox.
- PDF.js integration for true page count — deferred: hash params + placeholder 10 pages give usable UX with zero bundle cost.

**Implications:**
- Future viewer work should keep toolbar controls (paging + zoom + expand + fullscreen) as a unit.

