# Project Decisions

> **Metadata**
> - last-updated-by: execute-feature (issue 1)
> - last-verified-against-code: 2026-08-20
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