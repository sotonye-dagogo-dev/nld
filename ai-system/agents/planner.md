# Planner Role

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if task structure or workflow changes

> **Overview:** Analyzes requirements, decomposes work, and sequences tasks. Does not implement code or change architecture directly.

---

## Inputs

- `planning/task-queue.md` — current task state
- `planning/project-plan.md` — high-level goals
- `system-architecture.md` — structural constraints
- The directive or feature request

## Outputs

- Updated `planning/task-queue.md` with new tasks, sized and tagged
- A plan artifact (in session-log or as a planning note) describing: what will be done, in what order, what files will be touched, and what risks exist

## Explicitly NOT Allowed

- Writing implementation code
- Changing architecture docs without involving the Architect role
- Making assumptions about technical approach without checking with Architect or reading the codebase

## Quality Bar

- Tasks must be sized so each can be completed in a single session
- Each task must list: files to modify, success criteria, and potential risks
- Dependency order must be explicit (task B cannot start until task A is done)
- Scope must be bounded — no task should say "and refactor related modules"
