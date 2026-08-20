# Project Decisions

> **Metadata**
> - last-updated-by: (set on first entry)
> - last-verified-against-code: (set after decision review)
> - staleness-policy: each entry has its own staleness — check supersedes links

> **Overview:** Log of significant architectural, technical, and product decisions. Agents consult this before proposing changes to avoid contradicting prior reasoning. Uses supersedes/superseded-by links so contradictory entries are explicitly resolved rather than both appearing equally valid.

---

## Decision Format

```
## [Decision Title]

**Decision:** [What was decided]
**Date:** [YYYY-MM-DD]
**Made by:** [Role / Agent / Developer]
**Supersedes:** [link to any prior decision this replaces, or None]
**Superseded by:** [link to any newer decision that replaces this, or None]

**Reason:**
[Why this choice was made]

**Alternatives Considered:**
[What else was evaluated and why it was rejected]

**Implications:**
[What this decision affects going forward]
```

---

## Decisions

### PDF extraction backend for the design-asset viewer

**Decision:** Use the single multi-format converter (`markitdown`) if the project is Python-heavy; use the PDF classify-then-extract library (`pdf-inspector`) if the project is Rust/WASM-friendly. Reaffirm at implementation time of the design-asset viewer.
**Date:** [YYYY-MM-DD]
**Made by:** bootstrap-project (seeds the v3 decision)
**Supersedes:** None
**Superseded by:** None

**Reason:**
The viewer (§7 of the v3 spec) needs PDF text/structure extraction in one thin wrapper. `tools/registry.md` evaluates both candidates as "adopt (approach)." Picking one is a stack-fit decision (see `tools/integrations/markitdown.md` and `tools/integrations/pdf-inspector.md`), not a fixed default.

**Alternatives Considered:**
- A PDF-only Rust extractor as a hard dependency — rejected as over-coupling where the stack is not Rust/WASM.
- No extraction at all (render-only viewer) — rejected because agents must be able to read a PDF spec as Markdown.

**Implications:**
- The design-asset viewer's extraction utility is a thin wrapper around whichever backend the stack favors.
- Do not add both backends unless measurements justify it.
