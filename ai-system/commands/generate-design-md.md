# Generate Design Doc Command

> **Metadata**
>
> - last-updated-by: v3 upgrade (generate-design-md)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the DESIGN.md convention or extraction skill changes

> **Overview:** Extracts colors, typography, spacing, and component patterns from a reference URL (via the registered browsing tool, if available) or existing markup into a new `design-references/<name>/DESIGN.md`. Uses the `design-token-extraction` skill. Never writes `design-system.md` directly.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Produces a self-contained `design-references/<name>/DESIGN.md` tagged with source + date | Does not overwrite `design-system.md` — promotion is a human decision |
| Extracts honestly, labeling whether tokens come from rendered output or markup | Does not invent tokens the source does not show |
| Uses the registered browsing tool when available; degrades otherwise | Does not make assumptions about specific AI tools |
| Keep the file Tier 4 (reference only) | Does not add the reference to Tier 1/2 context |

**Chains to:** `None` mandatory. Logs a `checkpoints/session-log.md` entry on completion. (If the reference is a new external resource never audited, run `audit-sources.md` first.)

---

## Required Inputs

A `Directive:` with a reference URL or path to markup/HTML.

## Optional Directives

```
Execute command: generate-design-md.md
Directive: URL https://example.com/design-reference — capture tokens under the name "competitor-x"
Directive: Existing markup at assets/reference.html — capture as "inspiration-y"
```

---

## Execution

1. **Carry the token extraction skill.** Load `skills/design-token-extraction/SKILL.md` — this command is its invocation shell.

2. **Discover the browsing tool.** Check `tools/registry.md`. If available, fetch the rendered page. If not, work from supplied markup (state which basis you used — rendered output or markup).

3. **Extract** palette (with usage), typography scale, spacing scale, and component patterns per the skill.

4. **Write** `design-references/<name>/DESIGN.md` using the template (`design-references/TEMPLATE/DESIGN.md`), tagged with the source URL and the date pulled.

5. **Never edit `design-system.md`.** Note any promotion candidates inside the DESIGN.md file itself, for a human to decide later. References are inputs to be reconciled — the token tables in `design-system.md` remain the project's actual source of truth.

6. **Log** a `checkpoints/session-log.md` entry: what was pulled, from where, and any promotion candidates flagged.