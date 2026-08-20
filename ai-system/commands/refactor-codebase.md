# Refactor Codebase Command

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if refactoring conventions change

> **Overview:** Structural improvement without behavioural change. Analyzes current code, proposes a better structure, updates docs, and implements safely one module at a time.

---

## Contract

| Guarantees                                         | Does NOT                                          |
| -------------------------------------------------- | ------------------------------------------------- |
| Preserves all existing behaviour                   | Does not change logic — only structure            |
| Updates all relevant ai-system docs                | Does not skip the quality gate                    |
| Moves one module at a time with verification steps | Does not add new features during refactor         |
| Writes in-progress.md before starting              | Does not make assumptions about specific AI tools |

**Chains to:** `update-ai-system.md` — mandatory, unconditionally, on completion (Step 8). Refactors are architecture-affecting by this command's own definition, so the deep sync always runs — no conditional logic needed. `verify-work.md` also runs (Step 8). A skipped chain invocation is a compliance violation (per §10 of the v3 spec).

---

## Required Inputs

A refactoring goal.

## Optional Directives

```
Execute command: refactor-codebase.md
Directive: [refactoring goal]

Directive: Convert the project to a config-driven modular architecture
Directive: Extract all database logic into a dedicated data access layer
Directive: Standardise all API responses through a single response formatter utility
```

---

## Execution

1. Read `system-architecture.md`, `index/repo-map.md`, `index/dependency-graph.md`, `memory/project-decisions.md`.

2. **Analyze** — identify problems: tight coupling, repeated logic, missing abstractions, hardcoded config, modules doing too many things.

3. **Propose** — describe the refactored structure, new module boundaries, and what moves where.

4. **Update architecture doc** — `system-architecture.md` with proposed changes before touching code.

5. **Add tasks** — append refactoring tasks to `planning/task-queue.md`.

6. **Implement** — one module at a time. After each move: verify imports resolve, verify behaviour unchanged.

7. **After completion** — update `index/repo-map.md`, `index/dependency-graph.md`, log in `summaries/dev-history.md`.

8. **Quality gate** — run `verify-work.md` to confirm behaviour is preserved.

9. **Deep sync (mandatory, unconditional)** — run `update-ai-system.md`. A refactor is structural change by definition; the full deep sync always runs here, never skipped. Ran without it? That is a compliance violation, logged in `session-log.md`.
