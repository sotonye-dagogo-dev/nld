# Integration: excalidraw — agent-generatable diagrams

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the .excalidraw format stabilizes further

> **Overview:** Open-source whiteboard/diagramming tool whose file format agents can emit directly as JSON — no manual drawing required. Used for architecture sketches and UI-review annotation.

---

## What it is

- Diagramming surface. Its `.excalidraw` JSON format is plain text, so an agent can generate a diagram artifact that opens naturally in the tool.

## How an agent uses it

- Architecture diagrams: when a diagram communicates structure better than prose, emit `.excalidraw` JSON as a repo artifact and link it from `system-architecture.md` or the relevant review finding.
- UI-review annotation: mark up a screenshot or mock with callouts for visual-QA findings.

## Cost / notes

- Keep generated diagram JSON small and committed with the docs it supports.
- The tool is not a dependency of a built app — it is a working-surface artifact format.

## Install or reference-only

- Reference/app-level (the app is used by humans; agents only write the JSON). No runtime install in an application.

## Referenced by

- §5 (diagramming), `commands/visual-review.md` (annotation), `agents/architect.md` (sketch option), `tools/registry.md`.