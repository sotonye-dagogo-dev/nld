# Integration: awesome-mcp-servers — capability-gap sourcing pool

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: consult when a new capability gap appears; rows in tools/registry.md stay the record

> **Overview:** Curated directory of MCP servers. Not adopted as a dependency — it is the sourcing pool for real server candidates when a capability gap (browsing, filesystem, issue-tracker) needs one.

---

## What it is

- Curated list of MCP servers grouped by capability (browsing, filesystem, git, issue trackers, search, etc.).

## How an agent uses it

- In the tool-discovery step (`protocols/entry-protocol.md`), when the session lacks a capability that a registered tool provides, consult this directory for candidates.
- Any candidate that gets adopted is evaluated via `commands/audit-sources.md` and recorded in `tools/registry.md` — never wired in brand-new without a registry row.

## Install or reference-only

- Reference-only (sourcing pool). Projects install individual servers only when actually adopted.

## Referenced by

- `protocols/entry-protocol.md` (tool-discovery), `commands/audit-sources.md`, `tools/registry.md`.