# Development Task Queue

> **Metadata**
> - last-updated-by: (set on first update)
> - last-verified-against-code: (set after task-list review)
> - last-synced: [timestamp of the last `checkpoints/in-progress.md` write or `session-log.md` entry covering this queue] — keeps `audit-drift.md` able to catch a queue that drifted from its checkpoint without a human noticing manually
> - staleness-policy: re-verify before each session

> **Overview:** Sprint-level task queue with complexity tagging. Agents execute tasks top to bottom within the current sprint. Each task is sized so it can be completed in a single session.

---

## Complexity Tags

Tags help agents self-select whether a task needs the full `execute-feature.md` pipeline or a lighter `dev-cycle.md`:

| Tag | Meaning | Recommended Command |
|-----|---------|-------------------|
| `[XS]` | Trivial — single file, known pattern | dev-cycle.md |
| `[S]` | Small — 1-3 files, well-understood | dev-cycle.md |
| `[M]` | Medium — 3-8 files, some planning needed | dev-cycle.md with plan-feature pre-read |
| `[L]` | Large — feature spanning modules | execute-feature.md |
| `[XL]` | Very large — architecture-affecting | execute-feature.md, requires architect role |
| `[BUG]` | Bug fix | fix-build.md |

---

## Current Sprint

| Size | Task | Status |
|------|------|--------|
| [XS/S/M/L/XL/BUG] | [Task description — be specific] | [ ] / [x] |

---

## Up Next

| Size | Task |
|------|------|
| [tag] | [task description] |

---

## Backlog

| Size | Task |
|------|------|
| [tag] | [task description] |
| [XL] | Package the `ai-system` kit for versioned install (npm / GitHub Releases) for distribution beyond "clone the template repo" — deferred stretch goal from template v3 |
| [XL] | Optional `integrations/opencode/` adapter mapping `ai-system` commands to opencode-specific slash-commands (multi-manifest pattern, `AGENTS.md` + `opencode.json`), clearly labeled so the core kit stays vendor-neutral — deferred stretch goal from template v3 |

---

## Completed This Sprint

| Task | Completed |
|------|-----------|
| [task] | [x] |

---

## Notes

[Any context agents need to know about current sprint constraints, blockers, or priorities]
