# Entry Protocol

> **Metadata**
>
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: this file changes rarely — trust unless explicitly flagged

> **Overview:** The mandatory entry procedure for every AI session. Read this first before any other file. It defines how to discover available tools, which docs to load based on context budget, and how to start any session correctly.

---

## Session Start Procedure

1. **Discover available tools.** Before assuming any capability is unavailable, query the current session for available tools / MCP servers. Common capabilities: filesystem read/write, git introspection, test execution, search, linting, package management. Use these tools for ground-truth operations (live git status, actual file contents) rather than trusting cached docs blindly.

2. **Tool-discovery-first.** Before doing by hand anything a registered tool does better — browsing a live preview, extracting PDF/HTML text, checking a design reference — consult `tools/registry.md` first (and the matching `tools/integrations/*.md` for adopted resources). Prefer the registered tool over manual reasoning when both are available. When a capability gap needs a real MCP server candidate, consult the registered capability-gap sourcing pool (see `tools/registry.md` → sourcing-pool rows).

3. **Read the tier-1 core** (mandatory, always read, ~1.5k tokens total):
   - `ai-context.md` — 30-second project orientation (its pointers to `skills/README.md` and `tools/registry.md` are part of the tier-1 core — the catalogs themselves stay Tier 3)
   - `protocols/context-tiering.md` — what to read next, based on task
   - `protocols/quality-gate.md` — the QA bar that all work must clear
   - `protocols/escalation-rules.md` — when to ask for human input

4. **If the session is a resumption** (not a fresh start), read `checkpoints/in-progress.md` first and then execute `resume-session.md` instead of the above.

5. **If no task is specified and this is a fresh session**, read `planning/task-queue.md` to identify the next piece of work.

6. **Before writing any code**, read the relevant role file in `agents/` and any applicable knowledge doc (system-architecture, design-system, repair-system) per the tiering rules.

---

## Relationship Between Docs and Tools

- `ai-system/` files are a **cache and summary layer** over the real repository. They provide fast orientation but are never a substitute for ground truth.
- When a doc contradicts what tools/MCP reveal about the actual repo, **trust the tools**. Flag the discrepancy by running `sync-context.md`.
- `ai-system/` files are authoritative for **intent** (architecture decisions, design principles, conventions) — those are not derivable from code alone.

---

## Closing a Turn (advisory)

When a turn ends — this is the *advisory* half of the picture, distinct from the *enforcement* half in the Contract tables and `verification-rules.md` — state, briefly:

1. **What ran** — the commands/skills/tools executed this turn.
2. **Which gate/compliance checks fired and their result** — including mandatory chains, so a human can see they happened, not just trust that they did.
3. **The recommended next command/skill/tool** when the choice is genuinely the human's to make, and why.
4. **If a human decision is required**, name exactly what is being asked.

Keep it tight: one short list per turn, not a report.

---

## Quick Navigation

| If you need...                            | Read this first                       |
| ----------------------------------------- | ------------------------------------- |
| Project overview                          | `ai-context.md`                       |
| What to read next                         | `protocols/context-tiering.md`        |
| QA requirements                           | `protocols/quality-gate.md`           |
| When to ask vs. proceed                   | `protocols/escalation-rules.md`       |
| How to verify work                        | `protocols/verification-rules.md`     |
| Engineering standards / how to write code | `standards/engineering-principles.md` |
| Current task                              | `planning/task-queue.md`              |
| System structure                          | `system-architecture.md`              |
| Known errors                              | `repair-system.md`                    |
| Past decisions                            | `memory/project-decisions.md`         |
| Half-done work                            | `checkpoints/in-progress.md`          |
| On-demand expertise (skills)              | `skills/README.md`                    |
| External tool/resource registry           | `tools/registry.md`                   |
