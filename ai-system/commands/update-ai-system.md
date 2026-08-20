# Update AI System Command

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if sync procedure changes

> **Overview:** Sprint-end deep synchronization. Reads all `ai-system/` files and compares them against the current repository state. Fixes drift that accumulated during the sprint. Heavier than `sync-context.md`.

---

## Contract

| Guarantees                                           | Does NOT                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Reconciles all ai-system docs with actual code state | Does not change code to match docs — only docs to match code |
| Flags architecture drift for human review            | Does not make assumptions about specific AI tools            |
| Updates all freshness metadata                       | Does not skip drift that is inconvenient to fix              |
| Produces a discrepancy report                        | Does not run automatically — must be explicitly invoked      |

**Chains to:** `None` — this is the terminal deep sync (the heavier end of the `sync-context.md` / `update-ai-system.md` pair). Its findings feed the next human decision; it does not auto-trigger further commands.

---

## Required Inputs

None — operates on the full `ai-system/` directory and the repo.

## Optional Directives

```
Execute command: update-ai-system.md
Directive: [focus area]

Directive: Focus on updating summaries after the authentication module refactor
Directive: Specifically check for architecture drift in the services layer
```

---

## Execution

1. Read all files in `ai-system/` and compare against repo state.

2. Update:
   - `index/repo-map.md` — reflect new/removed directories, update purpose descriptions
   - `index/dependency-graph.md` — update module relationships, flag new dependencies
   - `system-architecture.md` — flag any architecture drift, update to match current state
   - `planning/project-plan.md` — mark completed items, add newly discovered tasks
   - `summaries/dev-history.md` — add a sprint summary
   - `memory/lessons-learned.md` — document recurring issues or new patterns
   - All freshness metadata headers

3. Report: what was updated and what inconsistencies were found.
