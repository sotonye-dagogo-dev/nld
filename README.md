# Default Template

A GitHub template repository incorporating the **`ai-system` v3** framework for AI-assisted software development, pre-configured with an **opencode local trigger workflow**.

---

## What's Included

### `ai-system/` — AI-Assisted Development System

A vendor-neutral, model-agnostic framework for AI-assisted software development. Provides structured documentation, command-driven workflows, and quality gates that work identically across any AI coding tool.

```
ai-system/
├── protocols/          # Entry, tiering, QA, escalation, verification
├── agents/             # Function-based roles (Planner, Architect, Implementer, etc.)
├── commands/           # Reusable command pipelines (execute-feature, dev-cycle, etc.)
├── skills/             # On-demand expertise units (SKILL.md + trigger self-invocation)
├── tools/              # External resource registry (registry.md + integrations/ docs)
├── standards/          # Engineering principles
├── design-references/  # Pulled reference-design languages (Tier 4, human reconciliation)
├── system-architecture.md  # Structural docs with freshness metadata
├── project-context.md      # Project goals and constraints
├── design-system.md        # UI/UX rules
├── repair-system.md        # Error knowledge base
├── planning/           # Task queue and project plan (with complexity tagging)
├── memory/             # Decisions and lessons (with supersedes links)
├── index/              # Repo map and dependency graph (auto-regenerable)
├── testing/            # Test plan and results
├── checkpoints/        # Session log (append-only) + in-progress (singular, overwritten)
└── summaries/          # Development history
```

### `ai-context.md` — Session entry point

The first file any AI agent reads to get a 30-second project orientation. Also records the installed `ai-system` version (the baseline for `pull-template-update.md`).

### `integrations/examples/tool-integration.md` — Optional integration example

Non-normative example of wiring an AI tool to `ai-system`. Keep tool-specific config out of the core kit.

### `VERSION` + `CHANGELOG.md` — Versioning

`VERSION` records the installed kit version; `CHANGELOG.md` lists what changed between releases. Together they make `pull-template-update.md` (diff-based, never silent overwrite) work.

### `MIGRATION.md` + `V2_TO_V3_MIGRATION.md` — Upgrade guides

`MIGRATION.md` covers upgrading existing projects from `ai-system` v1 to v2; `V2_TO_V3_MIGRATION.md` covers v2 to v3.

### `.github/workflows/opencode.yml` — Opencode local trigger

Enables running opencode agents directly from issue comments and PR review comments using `/oc`, `/opencode`, `/design`, `/od`, and `/opendesign` commands. Delegates to the central workflow runner in the [sotonye-dagogo-dev/github-workflows](https://github.com/sotonye-dagogo-dev/github-workflows) repository.

---

## How to Use This Template

### 1. Create a Repository from This Template

Click **"Use this template"** on GitHub to create a new repository.

### 2. Clone and Bootstrap

```bash
git clone <your-new-repo-url>
cd <your-repo>
```

Then, in your AI tool, run the bootstrap command:

```
Execute command: ai-system/commands/bootstrap-project.md
Directive: [describe your project, e.g., "Next.js + Node.js marketplace app"]
```

### 3. Start Development

```
Execute command: ai-system/commands/dev-cycle.md
```

### 4. Pull Future Template Updates (Optional)

```
Execute command: ai-system/commands/pull-template-update.md
```

Compares the installed kit version against the upstream template's `VERSION`, then proposes a diff-based merge — it never silently overwrites locally customized files.

### 5. Use Opencode (Optional)

Comment `/oc` on any issue or PR to trigger an opencode agent session via the configured workflow.

---

## Prerequisites & Suggestions

- **GitHub Organization**: For teams, set up an org-level secrets and environments to share across repos using this template.
- **Repository Secrets**: If using the opencode workflow, ensure `GITHUB_TOKEN` has the necessary permissions (contents write, pull requests write, issues write).
- **AI Tool**: Any AI coding tool that can read `ai-context.md` at session start (CLI, IDE extension, API loop, or autonomous agent).
- **GitHub Workflows Repo**: The opencode trigger workflow references `sotonye-dagogo-dev/github-workflows`. Ensure this repository is accessible within your org, or update the workflow reference accordingly.

---

## References

- **`ai-system` Framework Docs**: See [Sotonye0808/ai-system-template](https://github.com/Sotonye0808/ai-system-template) for the canonical `ai-system` documentation and philosophy.
- **Opencode Workflows**: See [sotonye-dagogo-dev/github-workflows](https://github.com/sotonye-dagogo-dev/github-workflows) for the central workflow runners.

---

## License

See [LICENSE](./LICENSE).
