---
name: gh-stack
trigger: (DORMANT) — stacked/dependent branch management adopted as a real workflow
---

# gh-stack (DORMANT STUB)

> **Overview:** Held for a stacked/dependent-PR workflow. This skill is intentionally not built out. Per YAGNI, full content is created only when the use-case arrives — do not develop it speculatively.

---

## Current State

- **Dormant.** This folder exists so the catalog has a place and nothing is forgotten.
- Do not expand this skill's content unless a stacked/dependent branch workflow is actually adopted (e.g., splitting one large change into a reviewable PR chain, restacking after a base-branch merge).

## When It Becomes Active

- The project regularly produces changes too large for a single reviewable PR and splitting them is being considered.
- A base-branch merge keeps breaking dependent branches and a restack procedure is wanted.

When that happens, populate: `SKILL.md` (trigger + procedure), `references/`, `evals/`.

## Contract (dormant)

- Does NOT invent a branch workflow for a project that has none.
- Logs its activation in `memory/project-decisions.md` the session it is first used.