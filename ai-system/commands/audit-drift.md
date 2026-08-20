# Audit Drift Command

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if audit criteria change

> **Overview:** Periodic deep consistency check. Compares `ai-system/` claims against actual repo state — architecture doc vs. real code structure, task-queue claims vs. git history, repair-system entries vs. whether the bug actually recurred. Produces a discrepancy report. Does not fix drift — only detects and reports it.

---

## Contract

| Guarantees                                            | Does NOT                                            |
| ----------------------------------------------------- | --------------------------------------------------- |
| Detects all categories of drift between docs and code | Does not fix the drift — only reports it            |
| Produces a structured discrepancy report              | Does not make assumptions about specific AI tools   |
| Recommends which command to run for each discrepancy  | Does not modify any files                           |
| Tracks freshness metadata staleness across all files  | Does not skip discrepancies that are hard to detect |
| Detects mandatory-chain and checkpoint-coupling violations | Does not silently fix them — only reports       |

**Chains to:** `None` — read-only by contract ("does not modify any files"), the deliberately-manual escalation point.

---

## Required Inputs

None — operates on the full `ai-system/` directory and the repo.

## Optional Directives

```
Execute command: audit-drift.md
Directive: [focus area]

Directive: Check only architecture-level drift (system-architecture.md vs module structure)
Directive: Verify repair-system entries against current code
```

---

## Execution

1. **Write in-progress.md.** Record that an audit is in progress and which areas are being checked.

2. **Architecture drift check.** Compare `system-architecture.md` module claims against actual folder structure and module boundaries. Are all listed modules still present? Are there modules in the code that the doc does not mention?

3. **Dependency drift check.** Compare `index/dependency-graph.md` against actual imports/dependencies. Are all listed dependencies still accurate? Are there new dependencies not documented?

4. **Task queue vs. git history.** Compare `planning/task-queue.md` completion claims against `git log`. Are completed tasks actually committed? Did git show activity that is not reflected in the task queue?

5. **Repair-system validity.** For each entry in `repair-system.md`, check: does the fix still exist in the code? Has the code changed around it in a way that could re-introduce the bug?

6. **Freshness metadata audit.** For every `ai-system/` file, check `last-verified-against-code`. If it is older than the staleness policy allows, flag it.

7. **Chain compliance drift.** For every command's `Contract` table that names a mandatory `Chains to` target, verify `session-log.md` shows the chained command's entry immediately following that command's own entry. A command ran (per `session-log.md`) without its mandated chain target appearing afterward is a discrepancy — log order is the check, no judgment call needed.

8. **Checkpoint coupling audit.** Compare `planning/task-queue.md`'s `last-synced` marker against `checkpoints/in-progress.md` and `checkpoints/session-log.md` timestamps. A task-queue mutation this session with no corresponding checkpoint write or session-log entry is a compliance violation — the exact "silently half-done work" failure the checkpoint system prevents.

9. **Produce report:**

   ```
   ## Drift Audit Report — [date]

   ### Drift Found
   | File | Claim | Actual | Severity | Recommended Action |
   |------|-------|--------|----------|-------------------|

   ### Compliance Violations
   | Category | Command | Mandated Chain / Coupling | Found in session-log? |
   |----------|---------|---------------------------|----------------------|
   (Chain compliance drift / task-queue coupling — new §9/§10 checks)

   ### Stale Docs
   | File | Last Verified | Policy | Action |
   |------|--------------|--------|--------|

   ### Clean Docs
    [list of docs that passed audit]
   ```

10. **Clear in-progress.md** after the report is produced.
