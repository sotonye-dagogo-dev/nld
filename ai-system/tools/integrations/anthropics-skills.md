# Integration: anthropics/skills — canonical Agent Skills spec reference

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the spec contract changes upstream

> **Overview:** The authoritative reference implementation of the Agent Skills standard. Cited as the canonical source in `skills/README.md`, above any single implementation.

---

## What it is

- Reference implementation of the standard that `marketingskills` and other skill collections follow.
- Defines the `SKILL.md` contract this system uses: a skill is a folder with a `SKILL.md` describing what it is and when an agent should self-invoke it, plus deeper `references/` loaded only if needed.

## Why cited

- If a contract question about the skill format comes up (frontmatter fields, when to split references out), the spec is the tie-breaker.
- This is a spec reference, not a dependency; a project never installs it.

## Referenced by

- `skills/README.md`, `tools/registry.md`.