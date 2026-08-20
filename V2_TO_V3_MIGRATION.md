# Migration Guide: `ai-system` v2 → v3

> For projects already bootstrapped from the v2 kit. If you are setting up a new project, ignore this file — copy the `ai-system-kit/` directory and run `bootstrap-project.md`. This document is also the first real test case for `pull-template-update.md` (see "Update propagation" below).

---

## Summary of Changes

| Area | v2 (your current state) | v3 (what's new) |
| ---- | ----------------------- | --------------- |
| Skill layer | Everything is a role or a command | `skills/` — self-invoking, on-demand expertise units (`SKILL.md` + `trigger`), 9 skills, swap without touching core role files |
| External resource history | Nothing recorded; each session re-litigates tools | `tools/registry.md` + `tools/integrations/*.md` — every evaluated resource, verdict, and why; `commands/audit-sources.md` is the append mechanism |
| Live browsing | Static-file reasoning only | `visual-review.md` + `tester-qa.md` browsing capability when a browsing tool is registered; graceful static fallback otherwise |
| Design references | `design-system.md` blank template, no way to populate | `design-references/<name>/DESIGN.md` library + `generate-design-md.md`; DESIGN.md convention |
| Engineering principles | 10 principles | 14 new (§11–§24) + enforcement table §10→§25; doc-style addendum |
| Compliance enforcement | Task-queue edits untraced; chains advisory prose | Checkpoint/task-queue coupling (§9) mandatory `Chains to` contract rows (§10) — mechanically checked by `verification-rules.md` / `audit-drift.md` |
| Versioning | None | Root `VERSION` + `CHANGELOG.md`; bootstrap records installed version |
| Update propagation | Manual copy-paste only | `pull-template-update.md` — diff-based proposal, never silent overwrite |

---

## What Changed — File by File

### New top-level folders in the kit

| Folder | Purpose |
| ------ | ------- |
| `ai-system/skills/` | Skill catalog (`README.md` + per-skill `SKILL.md`, `references/`, `evals/`) |
| `ai-system/tools/` | Resource registry (`registry.md` + `tools/integrations/*.md` for adopted resources) |
| `ai-system/design-references/` | Pulled reference-design languages (Tier 4) + `TEMPLATE/DESIGN.md` |

### New commands

| Command | Purpose |
| ------- | ------- |
| `audit-sources.md` | Evaluate a batch of links; append rows to `tools/registry.md` |
| `visual-review.md` | Compare a live URL against the design system (read-only) |
| `generate-design-md.md` | Extract a reference site's design language into `design-references/` |
| `pull-template-update.md` | Diff-based template update proposal |

### Edited files

| File | Change |
| ---- | ------ |
| `standards/engineering-principles.md` | +§11–§24; enforcement table renumbered §10→§25 and extended; style addendum on §9 |
| `protocols/entry-protocol.md` | Tool-discovery-first step; closing-turn advisory section |
| `protocols/context-tiering.md` | Tier 3 rows for skills/tools; Tier 4 rows for skill references / design-references / registry history |
| `protocols/verification-rules.md` | v3 principle checks under Pattern Adherence; §9/§10 contract-compliance checks |
| `commands/plan-feature.md` | Appends a `session-log.md` trace for task-queue mutations (mandatory) |
| `commands/sync-context.md` | Checkpoint-compliance step; chains to `in-progress.md` on task-queue mutations |
| `commands/execute-feature.md` | Deep-sync chain to `update-ai-system.md` on architecture impact or `[L]`/`[XL]` tasks |
| `commands/dev-cycle.md` | Deep-sync chain when a task empties the Current Sprint table |
| `commands/refactor-codebase.md` | Always chains to `update-ai-system.md` |
| `commands/fix-build.md` | Chains to `sync-context.md` when the fix is multi-file or a repair pattern changed |
| `commands/resume-session.md` | Drift check is now a `sync-context.md` invocation; major drift invokes `update-ai-system.md` first |
| `commands/cloud-session.md` | Completion now explicitly runs `sync-context.md` + `update-ai-system.md` |
| `commands/bootstrap-project.md` | Records the installed kit version in `ai-context.md` |
| `planning/task-queue.md` | `last-synced` metadata marker; seeded v3 backlog items |
| `agents/tester-qa.md` | Live-preview / browsing capability section |
| `design-system.md` | Reference Library section; Design Asset Viewer section (dev-only, env-gated) |
| `system-architecture.md` | Verification CLI section; deployment rollback/undo section; viewer config point |
| `memory/project-decisions.md` | Seeded PDF-extraction-backend decision |
| `ai-context.md` | `installed-ai-system-version` metadata; pointers to skills/tools catalogs |

---

## Upgrade Steps for an Existing v2 Project

> Recommended path: use `pull-template-update.md` if you can reach the template repo; otherwise copy-and-apply the diff below.

1. **Back up your current `ai-system/`:**

   ```
   Copy-Item -Recurse ai-system ai-system-v2-backup
   ```

2. **Bring in the new structure & files** (from `ai-system-kit/ai-system/`):
   - `skills/` (whole folder)
   - `tools/` (whole folder)
   - `design-references/` (whole folder)
   - New commands: `audit-sources.md`, `visual-review.md`, `generate-design-md.md`, `pull-template-update.md`
   - Root additions in the template repo: `VERSION`, `CHANGELOG.md`

3. **Apply the edits** in the table above to your existing files. Pay special attention to:
   - `engineering-principles.md` — append §11–§24, renumber enforcement §10→§25
   - Every command's `Contract` table — add its `Chains to` row (required for the §10 enforcement checks)
   - `planning/task-queue.md` — add the `last-synced` marker to metadata
   - `ai-context.md` — add `installed-ai-system-version` and set it to your final kit version

4. **Migrate content, keep your data:**
   - Your `planning/task-queue.md`, `memory/`, `checkpoints/session-log.md`, `summaries/dev-history.md`, `testing/`, `index/`, `system-architecture.md`, `design-system.md`, `repair-system.md`, `project-context.md` content is preserved — only the metadata/marker additions above are needed.
   - Never copy the template's placeholder versions of those files over yours.

5. **Record the version.** Set `installed-ai-system-version: 3.0.0` in `ai-context.md` so `pull-template-update.md` has a baseline.

6. **Run `sync-context.md`** to refresh freshness metadata on all migrating files, then stop — the review pass is not you; verify with `audit-drift.md`.

---

## Update propagation — status

`pull-template-update.md` **exists in v3** and is functional (comparison + diff proposal; human applies). The more ambitious *packaged* distribution (npm / GitHub Releases, plus an optional `integrations/opencode/` adapter) is flagged in `planning/task-queue.md` backlog as a stretch goal — it explicitly exists for stacks that can't do "clone the template repo."

---

## Key Behaviour Changes to Note

- **Task-queue edits are now traced.** Any command that mutates `planning/task-queue.md` must leave a `session-log.md` entry (planning-only) or update `checkpoints/in-progress.md` (interruptible work). `sync-context.md` and `audit-drift.md` will flag a missing trace.
- **Mandatory chains are checkable.** A command whose contract names a `Chains to` target must show that target's entry immediately after its own in `session-log.md`. Skipped chains were silently tolerated in v2; they are compliance violations now.
- **Skills self-invoke.** Read `skills/README.md` after upgrading. When a skill's trigger matches mid-task, apply the skill without waiting to be told.
- **Registry-first.** Before doing by hand what a registered tool does (browsing, PDF extraction, design-reference check), consult `tools/registry.md` first.
- **Live previews are opt-in.** `visual-review.md` degrades to static comparison when no browsing tool is registered — it never fakes a visual check.