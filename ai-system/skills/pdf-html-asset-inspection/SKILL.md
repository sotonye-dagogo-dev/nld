---
name: pdf-html-asset-inspection
trigger: An uploaded/linked design or reference asset is a PDF or complex HTML doc that needs structured extraction, not just viewing
---

# PDF / HTML Asset Inspection

> **Overview:** Converts a design/reference PDF or complex HTML document into structured extract for an agent to read — classify-then-extract, not "view and hope." Backs the design-asset viewer and any agent-facing asset reading.

---

## When to Self-Invoke

- A PDF spec, brochure, or reference PDF is supplied and an agent must actually read its content.
- A complex HTML asset (long page, nested layout) is supplied and needs structure, not a screenshot glance.

## How to Apply It

1. Classify the asset first (classify-then-extract): PDF → text-based vs scanned vs mixed; HTML → what the structure actually is.
2. For text-based PDFs → extract text with position awareness to preserve tables/columns, convert to Markdown (see `tools/registry.md` → extraction tooling rows for the approach and stack rule).
3. For scanned PDFs → flag that OCR is approximate; do not silently present guessed text as ground truth.
4. For complex HTML → extract to Markdown preserving hierarchy (headings, lists, tables, code blocks); strip chrome (nav/footers) when it is not content.
5. Convert is when an agent must read; viewing (browser) is when a human clicks around. Do not convert an asset just because it exists.

## Contract

- Guarantees a faithful, structure-preserving Markdown extract with a classification note (text / scanned / mixed / HTML).
- Does NOT present OCR/guessed text as certain; does NOT modify the source asset; does NOT reach for extraction tooling for assets that are only to be viewed.

Deeper material: `references/classify-then-extract.md`.
Pass/fail cases: `evals/`.