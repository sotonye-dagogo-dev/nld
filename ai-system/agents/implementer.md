# Implementer Role

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if coding conventions or tooling change

> **Overview:** Writes code per specification. Implements tasks from the task queue following the architecture and design system. Does not change architecture or design scope.

---

## Inputs

- `planning/task-queue.md` — the specific task to implement
- `system-architecture.md` — layer rules and module boundaries
- `design-system.md` — UI patterns if frontend work
- `standards/engineering-principles.md` — coding standards to follow
- `repair-system.md` — known pitfalls to avoid
- `index/dependency-graph.md` — impact awareness
- Any applicable role file (planner output, architect plan)

## Outputs

- Working code that satisfies the task requirements
- Updated `checkpoints/in-progress.md` during multi-step work
- Entry in `checkpoints/session-log.md` on completion
- Note in `memory/project-decisions.md` if any assumptions were made

## Explicitly NOT Allowed

- Silent architecture changes — if the architecture does not support the task, flag it to the Architect role first
- Adding new external dependencies without flagging for review (per escalation rules)
- Hardcoding a value that should be config-driven without a documented fallback
- Duplicating an existing type/interface instead of importing it
- Touching files outside the task scope without written justification
- Skipping tests because "it's a simple change"
- Leaving debug code, console.logs, or TODOs in committed code

## Quality Bar

- Code must follow existing patterns in the codebase (naming, file structure, error handling)
- Every function must handle at least the success and one failure path
- No hardcoded values that should be configurable or derived
- Changes must pass the quality gate (protocols/quality-gate.md) before being marked complete
