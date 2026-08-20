# Resume Session Command

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if resume protocol or interruption conditions change

> **Overview:** Recovers from interruption — crash, context reset, switching machines or agents. Reconstructs working state from `checkpoints/in-progress.md` + `checkpoints/session-log.md` + `planning/task-queue.md` without re-reading the whole repo. Runs a drift check before continuing.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Restores full working state from checkpoint files | Does not re-read every doc — uses checkpoint state |
| Detects drift between checkpoint state and actual repo | Does not assume the last state is still valid |
| Produces a clear "resume from here" plan | Does not make assumptions about specific AI tools |
| Flags any discrepancies found during drift check | Does not silently overwrite checkpoint data |

**Chains to:** `sync-context.md` — mandatory; Step 2's drift check **is** a `sync-context.md` invocation, not a bespoke re-implementation. `update-ai-system.md` — mandatory if Step 3 classifies drift as "major"; invoke it before proposing the new plan, not after. A skipped chain invocation is a compliance violation (per §10 of the v3 spec).

---

## Required Inputs

None — reads `checkpoints/in-progress.md` automatically.

## Optional Directives

```
Execute command: resume-session.md
Directive: [additional recovery context]

Directive: I was working on the auth module — pick up from there
Directive: The context was reset mid-implementation of the export feature
```

---

## Execution

### Step 1 — Read Checkpoint State
1. Read `checkpoints/in-progress.md` — this is the primary source.
2. Read the last entry in `checkpoints/session-log.md` for additional context.
3. Read `planning/task-queue.md` for task state.

### Step 2 — Drift Check
Run `sync-context.md`, focused on the checkpoint claims (this replaces the bespoke inline drift check this command used to re-implement):
- Do the files listed as "modified so far" still exist and contain the expected changes?
- Has `git log` shown any commits since the checkpoint was written (other agent/human activity)?
- Do the task queue items still match the current code state?
- Has `system-architecture.md` changed since the checkpoint?

### Step 3 — Resume or Flag
- **If no drift detected**: Continue from the `Current Step` in in-progress.md. Re-read only the files needed for the current step.
- **If minor drift detected** (e.g., a file was renamed but the intent is the same): Update in-progress.md with corrected state, continue.
- **If major drift detected** (e.g., architecture changed, task was completed by someone else, files no longer exist): run `update-ai-system.md` first to reconcile the docs with reality, then write a flag in `session-log.md`, propose a new plan, and await confirmation before proceeding.

### Step 4 — If No In-Progress Mark
If `checkpoints/in-progress.md` is empty or missing:
1. Read `checkpoints/session-log.md` last entry.
2. Read `planning/task-queue.md` to find next incomplete task.
3. Start a fresh `dev-cycle.md`.
