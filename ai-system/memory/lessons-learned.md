# Lessons Learned

> **Metadata**
> - last-updated-by: update-ai-system (post-session 7)
> - last-verified-against-code: 2026-08-24
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
