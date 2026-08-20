# Bootstrap Project Command

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on completion)
> - staleness-policy: run once per project — re-run only if project structure fundamentally changes

> **Overview:** One-time project initialization. Analyzes the actual codebase and generates all `ai-system` documentation files with project-specific content. Vendor-neutral — works with any AI tool.

---

## Contract

| What this command guarantees                                          | What it does NOT do                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| Populates all ai-system files with accurate, codebase-derived content | Does not install software, modify code, or set up tooling |
| Creates freshness metadata on every file                              | Does not configure editor extensions or API keys          |
| Seeds the task queue with real, actionable next steps                 | Does not assume any specific AI product or model          |
| Produces architecture docs that reflect actual code                   | Does not invent structure that isn't there                |
| Records the installed template version for later update propagation   | Does not pull template updates itself                     |

**Chains to:** `None` — terminal, first-run only. It records the installed kit version in `ai-context.md` metadata so a later `pull-template-update.md` comparison is possible.

---

## Required Inputs

- A repository with actual code (or at minimum a defined directory structure)

## Optional Directives

```
Execute command: bootstrap-project.md
Directive: [additional context about the project]

Examples:
Directive: This is a Next.js marketplace — focus on modular service architecture
Directive: The project uses Tailwind and Ant Design — include both in the design system
Directive: This is greenfield — suggest an ideal architecture for a REST API
```

---

## Execution

1. **Scan the repository.** Detect languages, frameworks, entry points, folder structure, dependencies, architectural patterns (MVC, service layer, monorepo, etc.).

2. **For each file in `ai-system/`**, produce project-specific content:
   - `ai-context.md` — project overview with actual stack, key modules
   - `protocols/` — populate freshness metadata (these files are pre-written, just update the metadata header)
   - `standards/engineering-principles.md` — stamp the metadata header (static doctrine file, no project-specific content needed)
   - `system-architecture.md` — architecture diagram, module breakdown, data flow, config points
   - `project-context.md` — goals, users, constraints, tech decisions
   - `design-system.md` — detected UI patterns or templates to fill
   - `repair-system.md` — pre-populate with known patterns for the detected tech stack
   - `planning/project-plan.md` — feature checklist inferred from codebase
   - `planning/task-queue.md` — immediate actionable tasks
   - `index/repo-map.md` — folder structure with purpose of each directory
   - `index/dependency-graph.md` — module relationships as text diagram
   - `checkpoints/session-log.md` — first entry: "initial project scan and ai-system setup"
   - `checkpoints/in-progress.md` — clear/empty state
   - `memory/project-decisions.md` — empty, ready for entries
   - `memory/lessons-learned.md` — empty, ready for entries
   - `memory/architecture-history.md` — initial entry
   - `summaries/dev-history.md` — first entry
   - `testing/test-plan.md` — template filled for detected stack
   - `testing/test-results.md` — empty

3. **Record the installed template version.** Read `ai-system-kit/VERSION` (or the kit's `VERSION` file at its install location) and write it to `ai-context.md`'s metadata as `installed-ai-system-version: [semver]`. Without this, `pull-template-update.md` has no baseline to compare against.

4. **Update freshness metadata** on every file: set `last-updated-by: bootstrap-project` and `last-verified-against-code: [current date]`.

5. **Report.** List:
   - What was generated
   - Key architecture findings
   - Recommended first tasks
   - Any detected issues (missing config, inconsistent patterns, etc.)
