# Dev Cycle Command

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if workflow processes change

> **Overview:** The daily autonomous development loop. Executes a full plan → implement → review → test → document cycle for the next task in the queue. Lighter than `execute-feature.md` — suitable for well-defined, scoped tasks.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Picks the next incomplete task from the queue | Does not handle multi-task features (use execute-feature for that) |
| Runs the quality gate before marking complete | Does not skip reading tier-1 protocol files |
| Updates all relevant docs after completion | Does not make assumptions about specific AI products |
| Writes in-progress.md for interruption safety | Does not refactor unrelated code |

**Chains to:** `sync-context.md` — mandatory at close (Step 7), checkable in `session-log.md`. `update-ai-system.md` — mandatory if completing this task empties `planning/task-queue.md`'s "Current Sprint" table (the sprint-end deep sync its overview already describes); invoke it before the final `sync-context.md`, not after. A skipped chain invocation is a compliance violation (per §10 of the v3 spec).

---

## Required Inputs

- A populated `planning/task-queue.md` with at least one incomplete task

## Optional Directives

```
Execute command: dev-cycle.md
Directive: [focus instruction]

Directive: Focus only on the authentication module today
Directive: Prioritise fixing the broken API response formatter before new features
```

---

## Execution

1. **Read protocol tier-1.** Read `entry-protocol.md`, `quality-gate.md`, `escalation-rules.md`.

2. **Identify next task.** Read `planning/task-queue.md`. Pick the first incomplete task.

3. **Plan.** Read the relevant knowledge docs (`system-architecture.md`, `repair-system.md`, etc. per context-tiering). Confirm the task aligns with architecture. If it does not, flag it and stop.

4. **Write in-progress.md.** Record the task, steps planned, and files expected to touch.

5. **Implement.** Make the code changes. Follow role rules. Test as you go.

6. **QA gate.** Run the quality gate checklist. Fix issues. If gate fails and cannot be resolved, write residual risk and flag.

7. **Document.** Update session-log, mark task done in task queue (and the `last-synced` marker), update dev-history. **Sprint boundary check:** if this task empties the "Current Sprint" table in `planning/task-queue.md`, run `update-ai-system.md` before `sync-context.md` — the sprint-end deep sync fires here, not just the lightweight sync. Otherwise run `sync-context.md`.

8. **Clear in-progress.md.**

9. **Report.** What was done, what was verified, what the next task is.
