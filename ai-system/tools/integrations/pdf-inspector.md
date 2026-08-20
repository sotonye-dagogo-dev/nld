# Integration: pdf-inspector — PDF classify-then-extract

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify before first production use

> **Overview:** Rust library that classifies a PDF as text-based / scanned / mixed, extracts position-aware text, and converts it to Markdown without OCR. Adopted for its *approach*, not as a hard dependency.

---

## What it is

- Classify-then-extract: detect text-based vs. scanned, then extract with position awareness and convert to Markdown.
- Has Python/Node/WASM bindings, so it can fit non-Rust stacks.

## How an agent invokes it

- Via the design-asset viewer's extraction utility, or directly when an agent (`skills/pdf-html-asset-inspection`) must turn a design PDF spec into Markdown it can read.
- Implement as a small internal utility or thin wrapper if a suitable package exists in the project's language — not a hard dependency on the Rust crate.

## Cost / notes

- No OCR: scanned pages need an OCR path or a flag that extraction is incomplete.
- Position awareness matters for tables/columns; preserve structure when converting.

## Install or reference-only

- Preference rule: Rust/WASM-friendly stacks → pdf-inspector; Python-heavy stacks → `tools/integrations/markitdown.md`. Documented in `memory/project-decisions.md` at implementation time.

## Referenced by

- §7 design-asset viewer, `skills/pdf-html-asset-inspection`, `tools/registry.md`.