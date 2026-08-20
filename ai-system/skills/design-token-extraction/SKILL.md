---
name: design-token-extraction
trigger: A reference URL or markup is supplied and design tokens/patterns (colors, type, spacing, components) need capturing
---

# Design Token Extraction

> **Overview:** Captures a reference site's design language into a plain-markdown `DESIGN.md` so agents can reason about it without re-browsing. Never writes `design-system.md` — a human decides what gets promoted.

---

## When to Self-Invoke

- A reference URL/site is supplied for design inspiration or comparison.
- Markup or existing assets are given and tokens need pulling out of them.

## How to Apply It

1. Check `tools/registry.md` for the registered browsing tool (adopted backend documented in `tools/integrations/`). If available, fetch the rendered page; if not, work from supplied markup/HTML.
2. Extract, in order:
   - Color palette (with usage, not just hex values)
   - Typography scale (font, size, weight, role)
   - Spacing scale (base unit + derived values)
   - Component patterns (buttons, forms, nav, cards, dialogs — how they actually render)
3. Write `design-references/<name>/DESIGN.md` tagged with source and date pulled (template: `design-references/TEMPLATE/DESIGN.md`).
4. Do **not** edit `design-system.md`. Note promotion suggestions in the DESIGN.md file or the session log.

## Contract

- Guarantees a self-contained reference doc with source + date, honestly labeled ("inferred from rendered output," "inferred from markup").
- Does NOT overwrite `design-system.md`; does NOT invent tokens the source does not show.

Deeper material: `references/design-md-convention.md`.
Pass/fail cases: `evals/`.