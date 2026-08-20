# Changelog

Semantic versioning. Each release lists changes for projects bootstrapped from an earlier template version.

## [Unreleased]

## [3.0.0] — v3 upgrade

Breaks the pattern of "everything is a role or a command" by adding self-invoking, on-demand expertise units and a record of every external resource the system evaluates.

**New subsystems**
- `skills/` — skill catalog (`SKILL.md` + trigger self-invocation), 9 skills: design-token-extraction, lean-debt-audit, rbac-page-scaffold, acid-transaction-review, universal-component-check, integration-wrapper-scaffold, pdf-html-asset-inspection, research, gh-stack (dormant stub).
- `tools/` — `registry.md` seeded with the full §13 evaluation table (35 rows) plus `tools/integrations/` docs for adopted resources (crawl4ai, markitdown, pdf-inspector, awesome-design-md, marketingskills, anthropics/skills, ponytail, excalidraw, recordly, hyperframes, awesome-mcp-servers, ASD-STE100).
- `design-references/` — reference-design library (`DESIGN.md` convention) + TEMPLATE.

**New commands**
- `audit-sources.md` — evaluate a batch of links; append to `tools/registry.md`.
- `visual-review.md` — live-preview comparison against the design system (browsing capability).
- `generate-design-md.md` — extract a reference's design language into `design-references/<name>/DESIGN.md`.
- `pull-template-update.md` — pull-based template update propagation (diff, never silent overwrite).

**Standards**
- `engineering-principles.md`: new §11–§24 (RBAC-as-config, ACID-awareness, universal component catalog, utility-class discipline, icons, iteration, integration folders, templated/previewable content, testing pyramid, compliance awareness, pagination, destructive-action confirm/undo, audit trails, agent-extensible verification CLI); old §10 enforcement becomes §25; documentation-style addendum (simplified single-meaning-word style).

**Compliance enforcement**
- Checkpoint/task-queue coupling: `plan-feature.md` now always traces task-queue mutations to `session-log.md`; `sync-context.md` flags task-queue-edit-without-trace as a compliance violation; `task-queue.md` gains a `last-synced` marker; `audit-drift.md` checks both.
- Mandatory command chaining: `Chains to` contract row on every command; `execute-feature`/`dev-cycle`/`refactor-codebase`/`fix-build`/`resume-session`/`cloud-session` wired to `update-ai-system.md`/`sync-context.md` at the right triggers; `verification-rules.md` and `audit-drift.md` mechanically check chain order.
- Advisory closing-turn reporting added to `entry-protocol.md`.

**Tiering**
- Tier 1 unchanged in size except two pointer lines. `skills/`, `tools/`, `design-references/` sit in Tiers 3/4.

**Versioning**
- Root `VERSION` + `CHANGELOG.md`; `bootstrap-project.md` records the installed version in `ai-context.md`.

## [2.0.0] — v2 revamp

Zero vendor references, explicit protocols, 12 commands with contracts, interruption-safe checkpoints, 9-point quality gate, freshness metadata, MCP-aware tool-discovery-first, task-complexity tags, supersedes links, auto-regenerable indexes. See `MIGRATION.md` for the v1→v2 path.