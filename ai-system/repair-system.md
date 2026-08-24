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
