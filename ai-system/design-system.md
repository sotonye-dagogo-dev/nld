# Design System

> **Metadata**
> - last-updated-by: (set on first run)
> - last-verified-against-code: (set after visual audit)
> - staleness-policy: re-verify if UI components or styling dependencies change

> **Overview:** Visual language, component patterns, and UX principles. Agents building UI must read this before writing any frontend code. The colour, typography, and spacing tables below are the **single source of truth** for design tokens (per `standards/engineering-principles.md` §5) — components must consume these tokens rather than redeclaring values.

---

## Visual Language

### Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| primary | [#hex] | [buttons, links, CTAs] |
| secondary | [#hex] | [accents, highlights] |
| background | [#hex] | [page background] |
| surface | [#hex] | [cards, modals] |
| text-primary | [#hex] | [main body text] |
| text-muted | [#hex] | [labels, captions] |
| danger | [#hex] | [errors, destructive actions] |
| success | [#hex] | [confirmations] |

### Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| Heading 1 | [font] | [size] | [weight] |
| Body | [font] | [size] | [weight] |
| Code | [font] | [size] | [weight] |

### Spacing Scale

[e.g. 4px base unit: 4, 8, 12, 16, 24, 32, 48, 64]

---

## Component Patterns

### Buttons
- Primary: [style and usage]
- Secondary: [style and usage]
- Destructive: [describe]
- Disabled state: [describe]

### Forms
- Input fields: [style and validation rules]
- Error messages: [placement and style]

### Navigation
- [sidebar / topnav / tabs — describe pattern]

### Cards / Containers
- [shadow, border radius, padding]

### Modals / Dialogs
- [confirmation, form-in-modal, alert patterns]

---

## UX Principles

1. [e.g. Always show loading state for async actions]
2. [e.g. Destructive actions require confirmation]
3. [e.g. Error messages must explain what the user can do]

---

## Responsive Breakpoints

| Breakpoint | Value | Target |
|------------|-------|--------|
| sm | 640px | Mobile |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Wide screens |

---

## Accessibility Requirements

- All interactive elements must have keyboard focus states
- Colour contrast must meet WCAG AA (4.5:1 for text)
- Images must have alt text
- Forms must have associated labels

---

## Reference Library

External design languages — competitor, inspiration, or reference sites — pulled into `design-references/<name>/DESIGN.md` (Tier 4, read when explicitly relevant). The `generate-design-md` command creates them.

These are **inputs to be reconciled**, never the project's source of truth. The token tables in this file remain the single source of truth per engineering principles §5. Promotion from a reference into the project's real tokens is a human decision, not an agent write.

See `design-references/README.md` for the folder contract.

---

## Design Asset Viewer (dev-only entry point)

A human-facing route to browse design assets — HTML mocks, images, PDFs — without those assets touching the app's real route table when deployed. This is a dev tool, not an agent workflow, and it is itself governed by the engineering principles like any other page.

**Hard rules (not conventions):**
- Mounted at a distinct, configurable base path (e.g. `/__design/*`) on its own router/middleware branch — never nested under app routes.
- **Gated:** only mountable when the env flag is set (e.g. `ENABLE_DESIGN_VIEWER=true`), defaulting off. **Never enabled in a production build regardless of the flag** — this is a hard rule, not a convention.
- Reads a config manifest (engineering principles §1) listing which local folders/paths it is allowed to serve — never an open filesystem browser.
- No hardcoded asset lists in code.

**Rendering by type:**
- HTML → sandboxed iframe
- Images → `<img>`
- PDF → render pages; where text/structure extraction is needed, use the classify-then-extract approach from the `pdf-html-asset-inspection` skill (detect text vs scanned, extract with position awareness, convert to Markdown) via a small internal utility or thin wrapper.

**Extraction backend decision:** chooses between the two registered extraction candidates (see `tools/registry.md` → PDF-extraction-tooling rows; approach documented in `tools/integrations/`) based on the project stack; the choice is documented in `memory/project-decisions.md`.

**Where it lives:** see also the `system-architecture.md` configuration points template (the `ENABLE_DESIGN_VIEWER` flag) and the viewer's security isolation note for the deployment platform.
