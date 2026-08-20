# Lessons Learned

> **Metadata**
> - last-updated-by: (set on first entry)
> - last-verified-against-code: (set after lesson review)
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
