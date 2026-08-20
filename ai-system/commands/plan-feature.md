# Plan Feature Command

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if architecture or planning process changes

> **Overview:** Analyzes architecture impact before any code is written. Produces a structured plan, identifies affected modules, and updates the task queue. Planning only — no implementation.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Identifies all modules affected by the feature | Does not write any implementation code |
| Produces a concrete task list with dependencies | Does not change architecture without documenting it |
| Flags risks, edge cases, and conflicts with prior decisions | Does not make assumptions about specific AI tools |
| Checks scope against project-context.md | Does not skip reading existing architecture docs |

**Chains to:** `checkpoints/session-log.md` — mandatory. A `task-queue.md` mutation with zero trace is a compliance violation (per §9 of the v3 spec). Planning-only work does not need a full `in-progress.md` checkpoint; the session-log entry is the required minimum trace. Checkable by `verify-work.md` / `audit-drift.md`.

---

## Required Inputs

A feature description.

## Optional Directives

```
Execute command: plan-feature.md
Directive: [feature description]

Directive: Implement role-based authentication with JWT and refresh tokens
Directive: Add a real-time notifications system using WebSockets
Directive: Build a configurable export module that supports CSV, PDF, and JSON
```

---

## Execution

1. Read `system-architecture.md`, `design-system.md`, `project-context.md`, `planning/task-queue.md`, `memory/project-decisions.md`.

2. Produce:
   - **Feature summary** — what it does and why
   - **Architecture impact** — which existing modules are affected and how
   - **New modules or services required** — if any
   - **Data flow** — how data moves through the feature
   - **UI/UX considerations** — alignment with design-system.md
   - **Potential risks and edge cases**
   - **Concrete task list** — append to `planning/task-queue.md`
   - **Architecture doc updates** — note what needs to change in `system-architecture.md`

3. Do **not** write any code. Planning only.

4. **Log the trace.** Append a `checkpoints/session-log.md` entry recording the tasks added to `planning/task-queue.md` this session and why. This is the required minimum trace for a task-queue mutation (mandatory, not optional — see the Contract above).
