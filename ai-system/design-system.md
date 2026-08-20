# Design System

> **Metadata**
> - last-updated-by: bootstrap-project (execute-feature, issue 1)
> - last-verified-against-code: 2026-08-20
> - staleness-policy: re-verify if UI components or styling dependencies change

> **Overview:** Visual language, component patterns, and UX principles. Agents building UI must read this before writing any frontend code. The colour, typography, and spacing tables below are the **single source of truth** for design tokens (per `standards/engineering-principles.md` §5) — components must consume these tokens rather than redeclaring values. Platform name, logo, and content copy are admin-configurable via the settings store with hardcoded fallbacks (per §3).

---

## Visual Language

### Colour Palette

| Token | Value (light/dark) | Usage |
|-------|--------------------|-------|
| primary | `#4f46e5` / `#818cf8` | buttons, links, CTAs |
| secondary | `#0ea5e9` / `#38bdf8` | accents, highlights |
| background | `#f8fafc` / `#0b1220` | page background |
| surface | `#ffffff` / `#131c2e` | cards, modals |
| text-primary | `#0f172a` / `#f1f5f9` | main body text |
| text-muted | `#64748b` / `#94a3b8` | labels, captions |
| danger | `#dc2626` / `#f87171` | errors, destructive actions |
| success | `#16a34a` / `#4ade80` | confirmations, access granted |

All tokens are declared once in `src/app/globals.css` as CSS variables and consumed via Tailwind theme mapping — components never redeclare hex values.

### Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| Heading 1 | Inter / system-ui | 2.25rem (text-4xl) | 700 |
| Heading 2 | Inter / system-ui | 1.5rem (text-2xl) | 600 |
| Body | Inter / system-ui | 1rem (text-base) | 400 |
| Code | ui-monospace | 0.875rem | 400 |

### Spacing Scale

4px base unit: 4, 8, 12, 16, 24, 32, 48, 64 (`p-1` … `p-16`). Section rhythm uses `space-y-6`/`space-y-8` between blocks.

---

## Component Patterns

The universal component catalog (per §13 required baseline) lives in `src/components/ui`:

### Buttons
- Primary: filled `bg-primary text-white`, rounded-lg, `px-4 py-2`; loading state shows spinner
- Secondary: outlined with border, same radius/padding
- Destructive: `bg-danger text-white`
- Disabled state: `opacity-50 cursor-not-allowed`
- All variants rendered by the single `Button` component from a variant config map

### Forms
- Input fields: `Input` wrapper with label, hint, and error text; validation errors inline below field
- Error messages: `text-danger text-sm` under the field, with a summarized alert at the top of the form

### Navigation
- `Navbar`: responsive topnav with collapsible menu on mobile; logo from admin config (fallback wordmark); ThemeToggle in nav

### Cards / Containers
- `Card`: `bg-surface rounded-xl border shadow-sm p-6`, used for devotional cards, admin records, forms

### Modals / Dialogs
- `Modal`: confirm/destructive actions route through `ConfirmDialog` (per §22); form-in-modal supported; closes on backdrop click with cancel path

### Empty / Error States
- `EmptyState` and `ErrorState` are shared components — no per-screen implementations

### Toast / Notifications
- `Toast`/`toast()` helper for async feedback (purchase success, copy-password, errors)

---

## UX Principles

1. Always show loading state for async actions (buttons disable + spinner, pages show skeleton where appropriate).
2. Destructive actions require confirmation via the universal `ConfirmDialog` with an undo path where possible.
3. Error messages must explain what the user can do (e.g. "Payment failed — try again or contact support").
4. Purchase and access-grant flows give immediate, obvious feedback (success toast + email preview copy).

---

## Responsive Breakpoints

| Breakpoint | Value  | Target    |
| ---------- | ------ | --------- |
| sm         | 640px  | Mobile    |
| md         | 768px  | Tablet    |
| lg         | 1024px | Desktop   |
| xl         | 1280px | Wide      |

Reader layout collapses to single column on mobile; admin tables scroll horizontally on small screens.

---

## Accessibility Requirements

- All interactive elements must have keyboard focus states
- Colour contrast must meet WCAG AA (4.5:1 for text) — tokens chosen to comply in both themes
- Images must have alt text; devotional content uses semantic headings
- Forms must have associated labels
- Theme toggle supports light / dark / system

---

## Reference Library

External design languages — competitor, inspiration, or reference sites — pulled into `design-references/<name>/DESIGN.md` (Tier 4, read when explicitly relevant). None adopted yet. These are **inputs to be reconciled**, never the project's source of truth.

---

## Design Asset Viewer (dev-only entry point)

Not yet mounted. When needed, it must follow the template contract: mounted at a distinct base path (`/__design/*`), gated behind `ENABLE_DESIGN_VIEWER=true`, never enabled in production, reading a config manifest (engineering principles §1).

---

## Theme

- `ThemeToggle` persists choice in localStorage with `system` default; theme class applied on `<html>`; tokens swap via CSS variables.