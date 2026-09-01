# Repair System — Error Knowledge Base

> **Metadata**
> - last-updated-by: fix-build
> - last-verified-against-code: 2026-08-24
> - staleness-policy: individual entries may be stale if the code has changed around them — verify fix still applies before reusing

> **Overview:** Living knowledge base of errors encountered during development, their root causes, and how they were fixed. Agents must search this before diagnosing new errors and log every fixed bug to prevent recurrence.

---

## How to Use

- **Before debugging:** Search this file for patterns matching the current error
- **After fixing a bug:** Add an entry using the template below
- **If a fix no longer applies:** Mark the entry as `[SUPERSEDED]` and link to the new entry

---

## Error Log

### [TEMPLATE]

```
## [Error Title]

**Symptom:**
[What the developer or user sees]

**Root Cause:**
[The actual technical reason]

**Fix Applied:**
[What change was made]

**Prevention:**
[How to avoid this in future]

**Files Affected:**
[list of files]

**Date:** [YYYY-MM-DD]
**Status:** [Active / Superseded]
```

---

## Known Error Patterns

### React / Next.js

**Hydration Mismatch**
- Symptom: `Hydration failed because the initial UI does not match what was rendered on the server`
- Cause: Browser-only logic (window, localStorage, Date.now()) running during server render
- Fix: Wrap in `useEffect` or use `dynamic(() => import(...), { ssr: false })`
- Prevention: Never access browser APIs outside useEffect in components

**Missing Key Prop**
- Symptom: `Each child in a list should have a unique "key" prop`
- Cause: `.map()` rendering without a stable unique key
- Fix: Add `key={item.id}` — use a stable unique ID, not the array index

### Node.js / Backend

**Unhandled Promise Rejection**
- Symptom: Server crashes silently or logs `UnhandledPromiseRejectionWarning`
- Cause: async function missing try/catch or `.catch()` not attached to promise
- Fix: Wrap async route handlers in try/catch; use a global async error wrapper
- Prevention: Always release DB connections in finally, not just success path

**Database Connection Pool Exhausted**
- Symptom: Requests hang indefinitely under load
- Cause: Connection pool limit too low or connections not released
- Fix: Increase pool size; ensure `client.release()` in finally blocks
- Prevention: Always release connections in finally

### Configuration / Environment

**Missing Environment Variable**
- Symptom: `undefined` values in production, features silently broken
- Cause: Variable defined in `.env.local` but not in production environment
- Fix: Add to deployment environment variables
- Prevention: Add a startup validation check that throws if required env vars are missing

### Integration / Secrets

**Secret Leaked to Client Bundle**
- Symptom: `process.env.PAYSTACK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` appears in browser JS
- Cause: A server-only module imported from a client component; Next.js inlined the env value
- Fix: Add `import "server-only"` at the top of server-only modules; import them only from route handlers / server components; move secret reads behind `src/integrations/*` wrappers
- Prevention: Grep for `SECRET`/`SERVICE_ROLE` keys in client bundles after builds; §17 wrapper discipline; `NEXT_PUBLIC_` prefix only for truly public values

**Paystack Webhook Signature Rejection**
- Symptom: Webhook returns 403/401 and purchases stay `pending` despite successful payment
- Cause: Secret key mismatch, or payload/headers not verified exactly as received (raw body hashing)
- Fix: Verify `x-paystack-signature` over the raw request body with `PAYSTACK_SECRET_KEY` before parsing JSON
- Prevention: Log verification failures to audit log; test with Paystack test mode before going live

**Duplicate Webhook / Double Grant**
- Symptom: User receives two access emails, or access_grant rows duplicated
- Cause: Paystack retries webhooks on failure; handler not idempotent
- Fix: Upsert purchase by `paystack_reference`; guard access-grant creation with a unique constraint; only send email when grant is newly created
- Prevention: Treat every webhook as retryable; idempotency key = transaction reference

### Database / Drizzle

**RLS-Protected Tables Invisible to Service Role**
- Symptom: Client queries return empty rows that exist in the database
- Cause: Supabase RLS denies the `anon` key; tables enabled for RLS without matching policies
- Fix: Add per-table policies for public reads; service-role bypass only in server wrappers
- Prevention: Write the RLS policy block beside every table in `src/data/db/schema.ts` (raw SQL migration); test with the anon key, not just service role

### React / Next.js — Server-to-Client Function Passing

**Event handlers cannot be passed to Client Component props**
- Symptom: `Error: Event handlers cannot be passed to Client Component props.` when rendering a client component from a server component with an `onClick` or similar handler prop
- Cause: Next.js Server Components cannot pass functions (event handlers) as props to Client Components — functions are not serializable
- Fix: Replace function props with serializable values (e.g., `retryHref` string) and use `useRouter().push()` in the client component; or make the parent a client component
- Prevention: Never pass functions from server to client components; use URLs, IDs, or other serializable data instead; audit component boundaries during code review
- Files Affected: `src/components/ui/error-state.tsx`, `src/app/admin/(panel)/layout.tsx`
- Date: 2026-08-24
- Status: Active

### Database / Serverless — Connection Timeouts

**Vercel Runtime Timeout / Database query timeout after 5000ms**
- Symptom: `FUNCTION_INVOCATION_TIMEOUT` after 300s on Vercel; `Database query timeout after 5000ms` in logs; admin login and root page hang indefinitely
- Cause: Aggressive timeouts (5s query, 3s connect) and single-connection pool (`max: 1`) unsuitable for serverless cold starts; Supabase connection latency exceeds limits
- Fix: Increase `QUERY_TIMEOUT_MS` to 15s, `CONNECT_TIMEOUT_MS` to 10s, pool `max` to 3; increase Supabase auth timeouts to 15s/10s; add retries with backoff
- Prevention: Profile cold-start latency in target environment; set timeouts to 3-5x observed p99; use connection pooling (PgBouncer) for serverless; monitor `pg_stat_activity` for connection leaks
- Files Affected: `src/data/db/index.ts`, `src/integrations/supabase/client.ts`
- Date: 2026-08-24
- Status: Active

### Next.js Auth — Redirect Loop / Session Validation

**Admin authentication redirect loop / login not redirecting**
- Symptom: Middleware redirects to `/admin/login` (307); login succeeds but `/admin` still redirects; manual navigation to admin pages fails with 504 timeout
- Cause: Middleware only checks cookie presence; layout renders fallback instead of redirecting on invalid session; invalid cookie persists causing middleware/layout mismatch; `secure: true` cookie in development breaks local auth
- Fix: Layout now redirects via `redirect("/admin/login")` when session invalid; cookie `secure` flag respects `NODE_ENV`; middleware remains cheap presence check only
- Prevention: Validate session in layout with redirect (not fallback); keep middleware minimal; test auth flow in both dev and prod; use `server-only` modules for session logic
- Files Affected: `src/app/admin/(panel)/layout.tsx`, `src/lib/admin-auth.ts`, `src/middleware.ts`
- Date: 2026-08-24
- Status: Active

### PWA — Service Worker Errors

**Service worker "Failed to execute 'addAll' on 'Cache'" / "Connection closed"**
- Symptom: Console errors from SW install; `cache.addAll` failures (not used in code but browser logs); connection closed errors during fetch
- Cause: `Promise.allSettled` with `cache.put` can race; fetch failures during precaching not handled gracefully; missing `.catch()` on cache operations
- Fix: Sequential precaching with try/catch per asset; add `.catch(() => {})` to all cache.put calls; swallow non-fatal SW errors
- Prevention: Test SW in production-like environment; avoid `addAll`; handle all cache promises; log but don't throw on SW failures
- Files Affected: `public/sw.js`, `src/components/pwa/service-worker-registration.tsx`
- Date: 2026-08-24
- Status: Active

### Database / Serverless — Statement Timeout Crash (fix-build 2026-09-01)

**Symptom:**
`[events] write failed (non-fatal): Error: Database query timeout after 8000ms` at `Timeout._onTimeout (.next/server/chunks/3028.js:1:14249)` + `k: canceling statement due to statement timeout` code `57014` severity ERROR at `postgres.c:3405` + `Unhandled Rejection: k: canceling statement...` leads to `Node.js process exited with exit status: 128`. Downstream: `getDevotionalBySlug`, `getPublishedDevotionals`, `adminSignIn` hang and devotional retrieval / login fail.

**Root Cause:**
1. Client `QUERY_TIMEOUT_MS=8000` raced exactly with Postgres `statement_timeout` (Supabase default 8s via pooler) — both rejected at same wall-clock, producing dual promise rejections; the postgres-js socket rejection was not attached to a handler after `Promise.race` settled, surfacing as `Unhandled Rejection` that crashed the lambda.
2. `getPooledDatabaseUrl` appended `?pgbouncer=true` spuriously — transaction-mode artifact not needed when `prepare:false`; contaminated pooler URL.
3. `client` variable never assigned (`createPgClient` created `pgClient` but not stored) so `queryWithTimeout` reset logic (`client=null`) was dead code; pool never recycled on transient `57014`.
4. `max:10` then `max:3` with `Promise.all` in `getPublishedDevotionals` and `getSiteSettings` caused pool deadlock under `max=1-2` contention; `SETTINGS_QUERY_TIMEOUT=1000` too short for cold start.
5. `withTimeout` leaked the loser branch (no `catch`/`clearTimeout` coordination).

**Fix Applied:**
- `src/data/db/index.ts`: bump `QUERY_TIMEOUT_MS` to `15000` and `CONNECT_TIMEOUT_MS` to `15000` (outside server statement_timeout), `MAX_RETRIES=2`/`RETRY_DELAY=750`, `max:2` (concurrency safe), `idle_timeout:20`/`max_lifetime:600`, store `client` on creation, add `resetPool()` that `end({timeout:1})` old pool fire-and-forget, rewrite `withTimeout` to `catch(()=>{})` both branches and `clearTimeout` in `finally`, treat `57014` as timeoutish with one retriable reset, remove `pgbouncer=true` append.
- `src/lib/catalog.ts`: serialize `getPublishedDevotionals` (rows then countRows) to avoid pool deadlock.
- `src/config/site.ts`: raise `SETTINGS_QUERY_TIMEOUT_MS` to `3500` and serialize `getSiteSettings` fetch.
- Verified `src/lib/audit.ts` already swallows DB errors non-fatally; no change needed beyond longer timeout.
- Added prominent purchase CTA on `src/app/devotionals/[slug]/page.tsx` header (price badge + `Purchase access` link to `/purchase/[slug]`, disabled state when `paymentsEnabled=false`, `aria-label`).

**Prevention:**
- Keep client timeout > server `statement_timeout` + cold-start p99 (3-5s); monitor `pg_stat_activity` and Vercel `FUNCTION_INVOCATION_TIMEOUT`; never `Promise.race` without attaching `catch` to loser; use `max=2` for serverless and serialize concurrent queries; test pooler URL without extra params; add startup check that logs effective `DATABASE_URL` host/port.

**Files Affected:**
`src/data/db/index.ts`, `src/lib/catalog.ts`, `src/config/site.ts`, `src/app/devotionals/[slug]/page.tsx`
**Date:** 2026-09-01
**Status:** Active

### UI — Missing Purchase CTA on Devotional Page (fix-build 2026-09-01)

**Symptom:**
No simple accessible purchase link on dedicated devotional page (`/devotionals/[slug]`); price shown as static `<span>`, purchase only via bottom `AccessGate` after scrolling past preview days — users couldn't discover `Purchase` flow.

**Root Cause:**
Header section rendered price as non-interactive badge; `AccessGate` purchase link buried below content; no top-of-page CTA.

**Fix Applied:**
- `src/app/devotionals/[slug]/page.tsx`: import `Link`, replace price-only badge with `flex` group: price `<span>` + `<Link href="/purchase/${slug}">Purchase access</Link>` (primary button, `aria-label`, `focus-visible:ring`), with disabled `<span>` fallback when `!paymentsEnabled`. Respects existing `AccessGate` at bottom.

**Prevention:**
- Every paid devotional view must expose a primary CTA above the fold; audit devotional routes for header CTA during UI review; keep `AccessGate` secondary.

**Files Affected:**
`src/app/devotionals/[slug]/page.tsx`
**Date:** 2026-09-01
**Status:** Active

### Next.js — CSP Blocks External Cover Images + RSC Digest 3220325878 (fix-build 2026-09-01)

**Symptom:**
Production: `Loading the image 'https://encrypted-tbn0.gstatic.com/...' violates CSP directive: "img-src 'self' data: https://*.supabase.co https://*.supabase.in"` — blocked, repeated. Concurrent `An error occurred in the Server Components render. ... digest: '3220325878'` (production-omitted message) causes page to 500. Root is devotional `coverUrl` pasted as external `gstatic.com` URL, not Supabase storage.

**Root Cause:**
1. `next.config.mjs:images.remotePatterns` allowed only `*.supabase.co`/`*.supabase.in` `/storage/v1/object/public/**` — any external `coverUrl` (gstatic, cloudinary, etc.) rejected by `next/image` optimizer, throwing in Server Component.
2. `next.config.mjs:headers()` CSP `img-src` similarly restricted to `self data: supabase` — browser blocked external image even if optimizer bypassed.
3. `src/components/devotionals/devotional-card.tsx` used `<Image>` without `unoptimized` fallback, so every external host required optimizer allowlist.
4. `src/app/devotionals/[slug]/page.tsx:generateMetadata` had no try/catch — DB throw during metadata bubbled as RSC error, also surfacing as digest.

**Fix Applied:**
- `next.config.mjs`: expand `images.remotePatterns` with `**.gstatic.com`, `**.googleusercontent.com`, `**.cloudinary.com`, `**.amazonaws.com`, plus wildcard `**.supabase.*`; expand CSP to `img-src 'self' data: blob: https: https://*.supabase.co https://*.supabase.in https://*.gstatic.com https://*.googleusercontent.com` and relax `connect-src`/`frame-src` to allow `https:` for external assets; keep dangerousAllowSVG.
- `src/components/devotionals/devotional-card.tsx`: add `isOptimizedImageHost()` helper (supabase-only), set `unoptimized={coverIsExternal}` so external `coverUrl` bypasses optimizer and never throws, eliminating RSC digest.
- `src/app/devotionals/[slug]/page.tsx:generateMetadata`: wrap in try/catch returning fallback `{title:"Devotional"}` on DB error.

**Prevention:**
- Treat `coverUrl` as user-controlled `https:` URL, not supabase-only; keep `images.remotePatterns` wide or use `unoptimized` for non-supabase hosts; keep CSP `img-src https:` permissive and audit after seeding external URLs; wrap all `generateMetadata` DB calls in try/catch.

**Files Affected:**
`next.config.mjs`, `src/components/devotionals/devotional-card.tsx`, `src/app/devotionals/[slug]/page.tsx`
**Date:** 2026-09-01
**Status:** Active
