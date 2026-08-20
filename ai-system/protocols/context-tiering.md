# Context Tiering Protocol

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: this file changes rarely — trust unless explicitly flagged

> **Overview:** Defines which files to read based on context budget and task complexity. Prevents small-context models from being overwhelmed and large-context models from skipping orientation. The system degrades gracefully: even reading only the tier-1 core gives enough to be useful.

---

## Tier 1 — Always Read (mandatory core, ~1.5k tokens)

These fit in any model's context. Every session must read them:

| Order | File                            | Token Budget | Why                                  |
| ----- | ------------------------------- | ------------ | ------------------------------------ |
| 1     | `ai-context.md`                 | ~200         | Project identity, stack, key modules |
| 2     | `protocols/context-tiering.md`  | ~500         | This file — tells you what to read   |
| 3     | `protocols/quality-gate.md`     | ~500         | The QA bar every output must clear   |
| 4     | `protocols/escalation-rules.md` | ~300         | When to ask vs. proceed              |

---

## Tier 2 — Read When You Have a Task (~3k tokens)

Add these when a specific task is identified:

| File                                      | Token Budget | When                                                    |
| ----------------------------------------- | ------------ | ------------------------------------------------------- |
| `planning/task-queue.md`                  | ~500         | Always when starting a task                             |
| `agents/planner.md` or relevant role file | ~800         | Match to your current role                              |
| `system-architecture.md`                  | ~1000        | Before designing or changing structure                  |
| `standards/engineering-principles.md`     | ~800         | Before most implementation work — sets coding standards |
| `repair-system.md`                        | ~700         | If debugging or working near known problem areas        |

---

## Tier 3 — Read On Demand (~5k tokens)

Load these only when the task directly touches their domain:

| File                          | Token Budget | Trigger                                           |
| ----------------------------- | ------------ | ------------------------------------------------- |
| `project-context.md`          | ~700         | If you need user/business/domain context          |
| `design-system.md`            | ~1000        | Before writing frontend code                      |
| `agents/architect.md`         | ~700         | If doing architecture work                        |
| `agents/reviewer.md`          | ~600         | If reviewing someone else's output                |
| `agents/tester-qa.md`         | ~500         | If writing or running tests                       |
| `agents/historian.md`         | ~400         | If logging or documenting                         |
| `planning/project-plan.md`    | ~500         | If prioritising across multiple phases            |
| `memory/project-decisions.md` | ~600         | If a decision could conflict with prior reasoning |
| `memory/lessons-learned.md`   | ~400         | Before repeating work that had issues before      |
| `index/repo-map.md`           | ~500         | To navigate unfamiliar code areas                 |
| `index/dependency-graph.md`   | ~500         | To assess change impact                           |
| `skills/<name>/SKILL.md`      | ~300         | When a skill's `trigger` matches the mid-task need |
| `tools/registry.md`           | ~400         | Before doing by hand what a registered tool does; before a resource decision |
| `tools/integrations/<name>.md` | ~300        | When actually using an adopted resource            |

---

## Tier 4 — Reference Only (load when explicitly needed)

| File                             | Token Budget | Use Case                        |
| -------------------------------- | ------------ | ------------------------------- |
| `memory/architecture-history.md` | ~400         | Tracing why a structure evolved |
| `testing/test-plan.md`           | ~500         | Writing new tests               |
| `testing/test-results.md`        | ~300         | Checking current test health    |
| `summaries/dev-history.md`       | ~500         | Sprint retrospectives           |
| `checkpoints/session-log.md`     | ~300         | Recent session context          |
| `checkpoints/in-progress.md`     | ~100         | Only on resumption              |
| `skills/<name>/references/`      | ~400         | When a skill's SKILL.md is not enough |
| `design-references/*/DESIGN.md`  | ~500         | When a specific reference is explicitly relevant |
| `tools/registry.md` (row history) | ~300        | Only when a past evaluation history is needed |

---

## Tiering Rules

- **Small-context / cheap models**: read only Tier 1. Use tool-based discovery for everything else (live git log, file search, test runner output). Accept that you'll operate with less cached knowledge and rely on ground-truth tools more.
- **Large-context models** (100k+ tokens): read Tier 1 + Tier 2 proactively. Load Tier 3 as needed during the session. Use progressive disclosure: start with less, add more if the task requires it.
- **All models**: Tier 4 files are never read preemptively. Load them only when a specific action requires them.

---

## Staleness Cadence

If a file's `last-verified-against-code` metadata is missing, clearly outdated relative to recent git activity, or exceeds the file's `staleness-policy`, the agent should:

1. **Not block** — stale docs are not a reason to stop work.
2. **Note the staleness** in session context (internal note, not necessarily written to a file).
3. **Trigger `sync-context.md` proactively** rather than waiting for a scheduled `audit-drift` run. This keeps context fresh during active sessions without requiring a separate command invocation.

This rule applies to all tiers equally: even Tier 1 files should be suspect if their freshness metadata is stale relative to recent architecture-affecting commits.
