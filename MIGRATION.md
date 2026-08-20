# Migration Guide: `ai-system` v1 → v2

> For teams or individuals upgrading an existing project that uses the old `ai-system` kit. If you are setting up a new project, ignore this file — just copy the `ai-system-kit/` directory and run `bootstrap-project.md`.

---

## Summary of Changes

| Area                | v1 (old)                                                          | v2 (new)                                                                                                               |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Vendor coupling     | Continue, Cline, Ollama, etc. hardcoded throughout                | Zero vendor references — tool-agnostic                                                                                 |
| Agent definitions   | Tool-based (Continue → Planner, Cline → Coder)                    | Function-based (Planner, Architect, Implementer, Reviewer, Tester/QA, Historian)                                       |
| Protocol            | Implicit — spread across general-instructions.md                  | Explicit — `protocols/` directory with entry, tiering, quality gate, escalation, verification                          |
| Commands            | 8 commands, no pipeline                                           | 12 commands, including execute-feature pipeline, resume-session, cloud-session, verify-work, sync-context, audit-drift |
| Interruption safety | None — lost state on reset                                        | `checkpoints/in-progress.md` + `resume-session.md`                                                                     |
| Quality gate        | None (only reactive self-heal on test failures)                   | Mandatory 9-criterion QA gate in `protocols/quality-gate.md` (+ engineering principles check)                          |
| Freshness metadata  | None                                                              | Every file has `last-updated-by`, `last-verified-against-code`, `staleness-policy`                                     |
| Bootstrap           | Two overlapping files (agent-bootstrap.md + bootstrap-project.md) | Single `commands/bootstrap-project.md`                                                                                 |
| MCP/tool awareness  | None                                                              | Tool-discovery-first in entry protocol                                                                                 |
| Planning/memory     | Basic task queue and decisions log                                | Complexity tags on tasks, supersedes links on decisions/lessons                                                        |
| Docs                | auto-regenerable not identified                                   | repo-map.md and dependency-graph.md marked as auto-regenerable                                                         |
| Integration config  | continue-config.yaml + start-ai-dev.bat in kit                    | Removed from core — optional `integrations/examples/` folder                                                           |

---

## Files Removed

| File                       | Replacement                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `agent-bootstrap.md`       | Merged into `commands/bootstrap-project.md`                                     |
| `self-heal.md`             | Merged into `commands/fix-build.md`                                             |
| `generate-architecture.md` | Folded into commands that need it (plan-feature, execute-feature)               |
| `continue-config.yaml`     | Moved to `integrations/examples/tool-integration.md` as non-normative reference |
| `start-ai-dev.bat`         | Removed from kit — tool-specific startup is outside the system contract         |

## Files Added

| File                                        | Purpose                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `protocols/entry-protocol.md`               | Mandatory session start procedure                                             |
| `protocols/context-tiering.md`              | Progressive disclosure rules by context budget                                |
| `protocols/quality-gate.md`                 | 9-criterion anti-slop QA checklist                                            |
| `protocols/escalation-rules.md`             | When to ask vs. proceed                                                       |
| `protocols/verification-rules.md`           | How to verify each QA criterion                                               |
| `agents/planner.md`                         | Role: planning only                                                           |
| `agents/architect.md`                       | Role: architecture design                                                     |
| `agents/implementer.md`                     | Role: code implementation                                                     |
| `agents/reviewer.md`                        | Role: quality review                                                          |
| `agents/tester-qa.md`                       | Role: testing and QA                                                          |
| `agents/historian.md`                       | Role: memory and documentation                                                |
| `commands/execute-feature.md`               | Full pipeline feature command                                                 |
| `commands/resume-session.md`                | Interruption recovery                                                         |
| `commands/cloud-session.md`                 | Async/unattended session protocol                                             |
| `commands/sync-context.md`                  | Mid-work lightweight sync                                                     |
| `commands/verify-work.md`                   | Standalone QA gate                                                            |
| `commands/audit-drift.md`                   | Deep consistency check                                                        |
| `checkpoints/in-progress.md`                | Singular, overwritten in-progress marker                                      |
| `integrations/examples/tool-integration.md` | Optional, non-normative integration example                                   |
| `standards/engineering-principles.md`       | Engineering doctrine — config-driven, modular, fallback-safe coding standards |
| `MIGRATION.md`                              | This file                                                                     |

---

## Upgrade Steps

### For an Existing Project with v1 `ai-system/`

1. **Backup your current `ai-system/`:**

   ```
   Copy-Item -Recurse ai-system ai-system-v1-backup
   ```

2. **Replace the `ai-system/` directory** with the v2 kit:

   ```
   Remove-Item -Recurse ai-system
   Copy-Item -Recurse ai-system-kit\ai-system .
   ```

3. **Migrate your content.** Move over these files from your backup:
   - `ai-context.md` — your project overview (update the metadata header)
   - `system-architecture.md` — your architecture content (add metadata header)
   - `project-context.md` — your project context (add metadata header)
   - `design-system.md` — your design system (add metadata header)
   - `repair-system.md` — your error entries (add metadata header, ensure entries have status field)
   - `planning/task-queue.md` — add complexity tags to your tasks
   - `planning/project-plan.md` — your feature checklist
   - `index/repo-map.md` — your folder descriptions (mark as auto-regenerable)
   - `index/dependency-graph.md` — your module relationships (mark as auto-regenerable)
   - `memory/` — move your entries, add supersedes fields
   - `checkpoints/session-log.md` — append your log entries
   - `summaries/dev-history.md` — your history entries

4. **Remove old files that no longer exist in v2:**
   - Delete `agents/general-instructions.md` (replaced by `protocols/` + role files)
   - Delete `commands/self-heal.md` (merged into `commands/fix-build.md`)
   - Delete `commands/generate-architecture.md`

5. **Remove vendor config from the project root** (if you copied them in originally):
   - `continue-config.yaml`
   - `start-ai-dev.bat`

6. **Update your README** to reference the new system structure (see the kit's root README for reference).

7. **Run `sync-context.md`** to update freshness metadata on all migrated files.

### Key Behaviour Changes to Note

- **Session start is different.** In v1, agents read `general-instructions.md` first. In v2, they read `protocols/entry-protocol.md` which directs them to use the tiering protocol.
- **Roles are function-based.** Agents must now self-identify which role they are acting in (Planner, Architect, Implementer, etc.) based on the task, not based on which tool they are running in.
- **Quality gate is mandatory.** Before marking any work complete, run the QA checklist (now 9 criteria, not 8 — "Pattern Adherence" was added in v2.1). The old "self-heal on test failure" model is replaced by "verify before declaring done."
- **Interruption recovery.** If a session is interrupted, the next session must run `resume-session.md` before anything else.
- **Commands have contracts.** Every command file now has a header declaring its guarantees, limitations, and required inputs.
