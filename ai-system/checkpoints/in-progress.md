# In-Progress Work

> **Metadata**
>
> - last-updated-by: fix-build (pdf-reader polyfill + devotional dedup + gateway labeling + email audit)
> - last-verified-against-code: 2026-09-04
> - staleness-policy: this file is overwritten every session — always current

> **Overview:** Tracks work that is currently in progress but not yet complete. Written _before_ starting risky multi-step work, cleared on clean completion. This is the first file `resume-session.md` reads on interruption — it is the single source of truth for "what was half-done."

---

## Current State

**Status:** Complete — fix-build (pdf-reader + devotional dedup + gateway labeling + email audit)

**What was completed (fix-build 2026-09-04):**
- PDF reader: added `src/lib/polyfills.ts` for `Promise.withResolvers`, imported in `content-reader.tsx` before `pdfjs-dist` (fixes iOS 16 Safari crash → "Unable to load content")
- Devotional slug de-duplication: asset viewer is single protected view, per-day file viewers + LockedCoverOverlay suppressed when `hasSingleAsset`, unified success banner, no second cover-blur block
- Admin payments labeling: `records/payments` page now "payment handlers (Paystack, BudPay, bank transfer)", package description updated
- Email compliance audit: migrated Paystack/BudPay webhooks + admin invites from direct `resend/client` to `email-client` abstraction, verified BudPay mirrors Paystack end-to-end (init → webhook re-verify → idempotent grant → sendAccessEmail + copy-to-clipboard fallback)

**Files affected:**
- New: src/lib/polyfills.ts
- Modified: src/components/devotionals/content-reader.tsx, src/components/devotionals/devotional-page-client.tsx, src/app/admin/(panel)/records/payments/page.tsx, src/app/api/paystack/webhook/route.ts, src/app/api/budpay/webhook/route.ts, src/app/api/admin/invites/route.ts, src/app/api/admin/invites/resend/route.ts, package.json, ai-system docs (repo-map, system-architecture, project-decisions, summaries/dev-history, memory/lessons-learned)

**QA Gate Results:**
- `npm run build` + `npm test` + `npm run typecheck` to be verified before merge (see verification below)

---

## Next up (queued in `planning/task-queue.md`):
1. Browser pass on iOS 16 real device: polyfilled viewer loads multi-page PDF after unlock (zoom/page/expand)
2. Live-key verification with Resend-verified domain: Paystack + BudPay → webhook → grant → email → /devotionals/[slug]/unlock → reader; bank-transfer verify similarly
3. Monitor Vercel logs for `sendAccessEmail` success across providers (EMAIL_PROVIDER=resend|cloudflare)
