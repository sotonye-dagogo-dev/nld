# Integration: markitdown — multi-format → Markdown converter

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify before first production use

> **Overview:** Converts PDF, DOCX, PPTX, HTML, images-with-OCR, and more to a single Markdown output. The one-dependency alternative to a PDF-only extractor for the design-asset viewer.

---

## What it is

- Converts a wide format range to Markdown in one tool. Covering PDF plus Office formats plus HTML in a single dependency may be all the design-asset viewer needs.
- Evaluated alongside `tools/integrations/pdf-inspector.md` (PDF-only, Rust, position-aware extraction, no OCR).

## Cost / notes

- Convert only when extraction is actually needed — don't convert an asset just because it exists.
- OCR of scanned images is approximate; flag any extracted text confidence issues rather than silently trusting it.

## Install or reference-only

- Recommend `markitdown` for Python-heavy stacks; `pdf-inspector` for Rust/WASM-friendly stacks. The choice is documented in `memory/project-decisions.md` at implementation time (per §7 of the v3 plan).

## Referenced by

- §7 design-asset viewer, `skills/pdf-html-asset-inspection`, `tools/registry.md`.