# Execute Feature Command

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if pipeline steps or quality criteria change

> **Overview:** The full end-to-end feature pipeline. Takes a feature directive, runs an internal planning pass, gets explicit go/no-go confirmation, implements, runs the QA gate, updates docs, and only then marks complete. This is the "do the whole thing properly, without needing a re-prompt" command.

---

## Contract

| Guarantees                                           | Does NOT                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Produces working, QA-verified code for the feature   | Does not change architecture without documenting it first   |
| Creates or updates all relevant ai-system docs       | Does not skip the quality gate under any circumstance       |
| Logs assumptions and decisions made during execution | Does not make assumptions about specific AI tools or models |
| Writes in-progress.md before starting risky work     | Does not proceed if the QA gate fails                       |

**Chains to:** `sync-context.md` — mandatory, mid-work (Step 3) and again at close (Step 5), checkable in `session-log.md`. `update-ai-system.md` — mandatory when Step 1 finds architecture impact or the originating task-queue entry is tagged `[L]`/`[XL]`; invoke it in Step 5, not just `sync-context.md`. A skipped chain invocation is a compliance violation (per §10 of the v3 spec), logged as one in `session-log.md`.

---

## Required Inputs

A feature directive describing what to build.

## Optional Directives

```
Execute command: execute-feature.md
Directive: [feature description]

Directive: Add role-based authentication with JWT and refresh tokens
Directive: Build a configurable export module supporting CSV, PDF, and JSON
```

---

## Pipeline

### Step 1 — Internal Planning Pass

1. Read `planning/task-queue.md`, `system-architecture.md`, `design-system.md`, `repair-system.md`
2. Decompose the feature into concrete tasks (files to create/modify, test cases, doc updates)
3. Identify architecture impact — does the feature require structural changes?
4. If architecture impact, run `plan-feature.md` logic first, get sign-off
5. Write `checkpoints/in-progress.md` with the plan

### Step 2 — Self-Check Against Architecture + Scope

1. Verify the feature fits within `project-context.md` scope boundaries
2. Verify no conflicts with `memory/project-decisions.md`
3. If any check fails, **stop and flag** — do not proceed to implementation
4. If all checks pass, proceed

### Step 3 — Implementation

1. Implement per `agents/implementer.md` role rules
2. Follow `design-system.md` patterns for UI work
3. Avoid `repair-system.md` known pitfalls
4. Write tests for the new code (per `agents/tester-qa.md`)
5. Update `checkpoints/in-progress.md` after each major sub-step
6. Run `sync-context.md` at internal checkpoints (not just at the end)

### Step 4 — QA Gate (mandatory)

1. Run `verify-work.md` — the full quality gate checklist
2. Fix any issues found (or revert if fix is more expensive than redo)
3. If the gate fails and cannot be resolved, write a residual risk note and do not mark complete

### Step 5 — Documentation & Close

1. Update `checkpoints/session-log.md`
2. Update `summaries/dev-history.md`
3. Mark tasks complete in `planning/task-queue.md` (and the `last-synced` metadata marker)
4. Update `memory/project-decisions.md` if assumptions were made
5. **Deep sync condition:** if Step 1 found architecture impact, or the originating task-queue entry was tagged `[L]`/`[XL]`, run `update-ai-system.md` now — the full deep sync, not just `sync-context.md`.
6. Run `sync-context.md` one final time to catch any drift
7. Clear `checkpoints/in-progress.md`
