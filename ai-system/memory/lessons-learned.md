# Lessons Learned

> **Metadata**
> - last-updated-by: update-ai-system (post-session 12)
> - last-verified-against-code: 2026-09-02
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Practical knowledge accumulated during development — things that worked well, things that didn't, and patterns worth repeating. Different from `repair-system.md` (tracks errors); this file tracks development process insights and architectural wisdom. Uses supersedes/superseded-by links for evolving practices.

---

## Entry Format

```
## [Lesson Title]

**Context:**
[What situation this came from]

**What We Learned:**
[The insight or pattern discovered]

**Apply When:**
[When future agents/developers should use this knowledge]

**Supersedes:** [link to any prior lesson this replaces, or None]
**Superseded by:** [link to any newer lesson that replaces this, or None]
```

---

## Lessons

### Server-only modules need lazy DB init for static builds

**Context:**
The foundation scaffold's config loader and catalog reads touch the DB. A top-level `getDb()` call during `next build` prerenders would crash the build without `DATABASE_URL`.

**What We Learned:**
Create the Drizzle client lazily (function, not singleton-at-import), and force-dynamic DB-backed pages (`export const dynamic = "force-dynamic"`). Wrap reads so an unavailable DB degrades to fallbacks/ErrorState instead of a build-time or 500 failure.

**Apply When:**
Adding any DB-backed server component or route handler in this project. Never call `getDb()` at module scope.

**Supersedes:** None
**Superseded by:** None

---

### `.mjs` config files cannot hold TypeScript annotations

**Context:**
`next.config.mjs` was written with `import type { NextConfig }` and `const nextConfig: NextConfig` — Next.js failed to load it with `SyntaxError: Unexpected token '{'`.

**What We Learned:**
`.mjs` is plain ESM JavaScript. Use a JSDoc `@type` annotation instead of TS syntax, or rename to `next.config.ts` (Next 15 supports it) if TS annotations are preferred.

**Apply When:**
Editing `next.config.mjs` or any `.mjs` config file.

**Supersedes:** None
**Superseded by:** None

---

### Testing `server-only` modules requires mocking the package

**Context:**
`src/config/site.ts`, `src/lib/access.ts`, and integration wrappers import `server-only`, which throws outside a React Server Component context. Unit tests failed until it was mocked.

**What We Learned:**
Add `vi.mock("server-only", () => ({}))` to a Vitest setup file. Also set stable env values (e.g. `ACCESS_PASSWORD_SECRET`) in setup so deterministic assertions work.

**Apply When:**
Writing any new unit test that imports a server-only module.

**Supersedes:** None
**Superseded by:** None

---

### Resend dual-mode (API + SMTP) requires explicit hook naming

**Context:**
The Resend integration was extended to support both the Resend HTTP API and SMTP (via nodemailer). The config function was initially named `useSmtp()` which triggered a React Hooks ESLint error because it was called from a non-component function.

**What We Learned:**
Avoid prefixing utility functions with `use` unless they are actual React hooks. Renamed to `shouldUseSmtp()` to follow naming conventions and avoid lint errors. The function is a plain utility that checks config, not a hook.

**Apply When:**
Adding configuration check functions that might be called from server-side utility functions. Never use `use` prefix for non-hook functions.

**Supersedes:** None
**Superseded by:** None

---

### Global destructive action pattern replaces ad-hoc confirm dialogs

**Context:**
Multiple admin actions (delete devotional, remove asset, remove day) needed confirmation modals. Previously each would have custom confirm logic. Created a unified `useConfirmAction` hook + `WithConfirmAction` HOC + `ConfirmActionWrapper` that provides consistent UX: confirmation modal → action execution → undo toast with 5s timeout and progress bar.

**What We Learned:**
Invest in a reusable destructive action pattern early. It standardizes the confirmation flow, provides undo capability (UI-level), and eliminates scattered custom implementations. The pattern uses existing `ConfirmDialog` and `Button` components, keeping bundle size minimal.

**Apply When:**
Any new destructive action (delete, remove, replace, archive) in admin or public UI. Wrap the action button with `WithConfirmAction` and implement the actual action + undo logic.

**Supersedes:** None
**Superseded by:** None

---

### File upload to Supabase Storage via API route + client component

**Context:**
Needed admin cover image upload for devotionals. Implemented `FileUpload` client component with drag-drop zone, preview, remove button, and progress indication. Backend `/api/admin/assets` route handles multipart upload to Supabase Storage, returns public URL, and writes audit log.

**What We Learned:**
- Use `next/image` for preview optimization (avoids `@next/next/no-img-element` lint warning)
- Supabase Storage `upsert: true` handles overwrites cleanly
- Keep upload logic in API route (server-only) — client only handles file selection and UI state
- Audit every upload/delete for traceability

**Apply When:**
Adding any file upload feature (covers, assets, documents). Follow the same pattern: client component → API route → Supabase Storage → audit.

**Supersedes:** None
**Superseded by:** None

---

### Config-driven footer credit + dynamic year eliminates hardcoded values

**Context:**
Footer had hardcoded "Built by S.D." link and dynamic year was already using `new Date().getFullYear()` but the dev credit was not config-driven.

**What We Learned:**
Add footer dev credit settings (`footerDevCreditName`, `footerDevCreditUrl`, `footerDevCreditEnabled`) to the settings store with defaults. Admin can now change name, URL, or disable entirely without code changes. The dynamic year was already correct — verify it stays `new Date().getFullYear()` in the root layout.

**Apply When:**
Any "static" footer/header content that stakeholders might want to change. Make it config-driven from the start — the overhead is minimal (one DB column + default + admin form field).

**Supersedes:** None
**Superseded by:** None

---

### Cloudflare Workers + MailChannels: free email for Vercel subdomains

**Context:**
Resend requires domain verification and doesn't allow sending from unverified domains like `nldv.vercel.app`. The project needed a free, production-ready email service that works immediately without domain ownership.

**What We Learned:**
Cloudflare Workers + MailChannels provides a completely free email delivery path with no domain verification required. The architecture:
1. App → HTTP POST to Cloudflare Worker (with Bearer secret)
2. Worker → MailChannels API (free for Cloudflare users)
3. MailChannels → Recipient

The integration follows the existing email abstraction (`EmailClient` interface), so templates, variables, admin editor, and call sites remain unchanged. Only the transport layer is swapped.

**Apply When:**
- Need transactional email on a free Vercel subdomain (or any unverified domain)
- Want zero-cost email with no sending limits
- Want to maintain existing template system and admin workflows

**Supersedes:** None
**Superseded by:** None

---

### Black/white design system with glassmorphism replaces colorful palette

**Context:**
The organization brand is strictly black and white. The previous indigo/sky color palette didn't match the brand guidelines. A modern design system with glassmorphism, bento layouts, and responsive grids was needed.

**What We Learned:**
- CSS custom properties in `globals.css` provide a single source of truth for design tokens (per engineering principles §5)
- Glassmorphism effects work well on both light and dark themes when using proper CSS variables for `--glass-bg`, `--glass-border`, `--glass-shadow`, `--glass-blur`
- Responsive grids using `auto-fit`/`minmax` eliminate the need for multiple media query breakpoints
- Card component variants (default, glass, bento, elevated) provide flexibility while maintaining consistency
- Animation utilities (slide-up, fade-in, scale-in) should be defined once in globals and consumed via utility classes

**Apply When:**
- Rebranding to match organization colors
- Implementing modern design trends (glassmorphism, bento grids)
- Creating responsive layouts that work across all screen sizes

**Supersedes:** None
**Superseded by:** None

---

### On-platform content reader enforces asset protection at UI layer

**Context:**
Uploaded PDF/DOCX files were previously accessible via direct download links, allowing users to share/export content. The requirement was to render content on-platform without download/export capability, with preview truncation for non-authorized users.

**What We Learned:**
- Client-side preview truncation (2000 chars default) provides immediate asset protection while server-side `/unlock` endpoint remains the true security boundary
- `ContentReader` component for PDF uses iframe with `toolbar=0&navpanes=0` to hide browser PDF controls; DOCX shows truncated text with upgrade prompt
- Watermark overlay ("PROTECTED CONTENT") adds visual deterrent without blocking readability
- Fullscreen mode and page navigation improve UX for authorized users
- Next.js Image component for cover images improves LCP vs raw `<img>` tags

**Apply When:**
- Protecting uploaded documents from unauthorized download/distribution
- Implementing tiered content access (preview vs full access)
- Building secure document viewers for sensitive content

**Supersedes:** None
**Superseded by:** None

---

### Performance monitoring utilities ready for load balancer integration

**Context:**
The platform needs to scale to 100k+ users with proper health checks, rate limiting, and performance metrics for ACID compliance and load balancing readiness.

**What We Learned:**
- In-memory metrics buffer with `recordMetric()` and `withTiming()` wrapper provides zero-dependency performance tracking
- Health checks for DB (latency), Resend, Paystack, Supabase Storage enable comprehensive `/health` endpoints for load balancers
- Simple rate limiting using `Map` works for single-instance; Redis-backed version needed for multi-instance clusters
- Request timeout wrapper prevents hanging requests from blocking serverless functions
- ACID compliance verified in existing transaction-heavy operations (devotional creation, access unlock)

**Apply When:**
- Adding performance monitoring to any Next.js/Node.js service
- Preparing for horizontal scaling with load balancers
- Implementing rate limiting for public APIs
- Verifying transaction integrity in critical paths

**Supersedes:** None
**Superseded by:** None
---

### Root layout DB reads must not block TTFB — race with timeout + skeleton

**Context:**
The root `layout.tsx` fetched `getPublishedDevotionals(1,100)` + `getPurchasableDevotionals()` for the ClientNav Purchase/Unlock modals on every request. Both hit Postgres with 15s timeout/retry, so a slow pooler blanked the whole app for seconds and made every route feel laggy; admin analytics page also showed full-page ErrorState when any one of its 7 aggregation queries timed out.

**What We Learned:**
- Wrap non-critical nav data in a `withLayoutTimeout(ms, fallback)` race (2500ms) so slow DB never blocks TTFB. Keep the critical `getSiteSettings()` awaited separately.
- Make dashboards resilient: only hard-fail when ALL queries miss; otherwise render partial zeros. Users can still navigate.
- Add `loading.tsx` skeletons for root and `admin/(panel)` — Next.js streams them instantly, so navigation feels SPA even when the server is slow.

**Apply When:**
Any layout that needs DB data for nav/menus. Never `await` unbounded DB calls directly in `layout.tsx`.

**Supersedes:** None
**Superseded by:** None

---

### Viewer height/expand/zoom/page UX and protection overlays

**Context:**
ContentReader clipped at `max-h-[70vh]` while its iframe content never filled the container; Expand button toggled `showFullContent` (text truncation) so it did nothing for PDFs; no zoom or usable page input; protection was only contextmenu/copy blocking with no blank overlay on focus loss or capture attempts.

**What We Learned:**
- Make the viewer `flex flex-col flex-1 min-h-0 w-full`; control height with a discrete `viewerHeightClass` (`h-[520/600]` ↔ `h-[85vh] + fullscreen fixed`) and `isExpanded` state separate from content truncation. Add `transition-[height]` for smoothness.
- Zoom via `transform: scale(zoom)` on the inner wrapper plus `width: 100/zoom%` compensation so layout does not clip; hash `zoom`/`page` into PDF iframe src (`#page=N&zoom=NN`) for native nav without PDF.js.
- Pagination: number input + prev/next with clamping; DOCX pages = `ceil(text.length / 1800)`; scroll wrapper to top on page change.
- Protection: `visibilitychange`/`blur`/`pagehide`/`beforeprint` + PrintScreen/Ctrl+P/Cmd+Shift+3|4/5 + `getDisplayMedia` monkey-patch → show `backdrop-blur` blank overlay (normal + fullscreen) for 0.5–4s. Duplicate the overlay inside ContentReader (viewer-scoped) and inside AntiScreenshot (page-scoped) so it works in both contexts. Document that this is deterrence, not DRM.

**Apply When:**
Any secure viewer/PDF reader iteration; also check that every Expand/Collapse button actually controls layout, not just logic that can be falsy.

**Supersedes:** None
**Superseded by:** None

