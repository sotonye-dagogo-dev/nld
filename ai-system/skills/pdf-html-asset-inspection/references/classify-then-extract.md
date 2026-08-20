# Classify-then-extract (skill reference)

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

The classify-then-extract approach (adopted from a registered PDF tool — see `tools/registry.md` for the source) is:

1. **Classify**: is the PDF text-based, scanned (image-only), or mixed?
   - If OCR would be needed (scanned), say so. OCR output is approximate.
2. **Extract with position awareness**: preserve reading order, tables, columns. Plain linear extraction destroys table structure.
3. **Convert to Markdown**: headings, lists, tables, code blocks — an agent consuming the result should get structure for free.
4. **Flag confidence**: any ambiguous text (scanned, low-res, multi-column) is flagged, not silently emitted as certain.

Stack rule (documented in `memory/project-decisions.md` per the v3 plan): Python-heavy projects → the single multi-format converter; Rust/WASM-friendly projects → the PDF-classify-then-extract library. Either path is a thin wrapper in the project's language, not a hard dependency on a specific crate.