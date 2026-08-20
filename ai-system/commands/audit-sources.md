# Audit Sources Command

> **Metadata**
>
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the registry structure or resource policy changes

> **Overview:** Evaluates a batch of external links/resources against the current `ai-system` structure and records the verdict in `tools/registry.md`. The mechanism for every "here are more tools/links" drop — one row per resource, appended, nothing lost. Re-run every time the operator supplies a new batch.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Appends one registry row per resource supplied | Does not modify any application code |
| Produce an honest verdict, including `needs-human-input` for anything it cannot reach | Does not inflate relevance to make a resource look more useful than it is |
| Creates the matching `tools/integrations/<name>.md` for adopted resources | Does not mark something `adopt` unless a file changes this session |
| Records what, if anything, now references the adopted resource | Does not make assumptions about specific AI tools |

**Chains to:** `None` mandatory. Logs a `checkpoints/session-log.md` entry on completion (registry mutation trace).

---

## Required Inputs

A `Directive:` containing one or more links or resource names.

## Optional Directives

```
Execute command: audit-sources.md
Directive: [comma-separated links or resource names]

Directive: https://github.com/example/repo-a, https://example.com/tool-b, "some-name"
Directive: re-audit the free-tier infrastructure list and the MCP-server directory against the current structure
```

---

## Execution

For each resource in the `Directive:`:

1. **Attempt to inspect it.** Clone or fetch if it is a repo; read if it is already known (check `tools/registry.md` first for a prior row).

2. **If unreachable** (blocked domain, dead link, requires auth): record verdict `needs-human-input` with reason "inaccessible." Say so explicitly — do not guess at content.

3. **Summarize what it actually is** in one line, without inflating relevance.

4. **Give a verdict against the current `ai-system` structure:**
   - `adopt` — reserved for things that change a file in this session (a convention, an approach, a style rule, a sourcing pool tied to a specific section).
   - `reference-only` — useful knowledge, nothing adopted.
   - `reject` — evaluated and not useful.
   - `needs-human-input` — inaccessible or missing.
   Most resources should land on `reference-only` or `reject`.

5. **Append the row** to `tools/registry.md` (columns per its header). For adopted resources, create `tools/integrations/<name>.md` and note which skill/command/principle now references it.

6. **Report** what each resource was, the verdict table, and — for anything inaccessible — exactly what is needed to complete the evaluation.

7. **Log** one `checkpoints/session-log.md` entry recording how many rows were added and any adoptions.

---

## Rules

- When a resource is a *list* (curated directories like free-tier infra, public APIs), the honest verdict is usually `reference-only` with a "sourcing pool" note — a list is something to consult, not something to adopt.
- A new row is always appended. Never edit or delete a past row; correctness disputes go in the "Why" column of a new row.