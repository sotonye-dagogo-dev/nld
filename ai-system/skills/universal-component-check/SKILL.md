---
name: universal-component-check
trigger: UI work is being planned or reviewed
---

# Universal Component Check

> **Overview:** Confirms UI work consumes the universal component catalog (Table, Form/Input set, Empty State, Error State, Toast/Notification, Navbar, Logo, Theme Toggle) and the design tokens — instead of one-off re-implementations. Grounded in engineering principle §13.

---

## When to Self-Invoke

- Planning or writing any UI (new page, new screen, new widget).
- Reviewing finished UI before the quality-gate close.

## How to Apply It

1. Read the project's required catalog (principle §13; project-specific list in `design-system.md`).
2. For each UI element, match it to the catalog component or token. No duplicate components, no locally redeclared colors/spacing.
3. When the catalog genuinely lacks something (not "I prefer mine"), that is a deliberate, logged exception per principle §4 — log it in `memory/project-decisions.md` before building the new one-off.
4. Confirm design tokens are consumed, not re-declared (grep for raw hex/spacing values).
5. On review: flag catalog drift as a normal quality-gate finding.

## Contract

- Guarantees a per-element match against the catalog or a logged exception.
- Does NOT build new universal components speculatively; does NOT block work on cosmetic preference.

Deeper material: `references/catalog-checklist.md`.
Pass/fail cases: `evals/`.