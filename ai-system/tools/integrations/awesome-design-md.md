# Integration: awesome-design-md — the DESIGN.md convention

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the DESIGN.md convention changes upstream

> **Overview:** The convention this system adopts for per-reference design documentation: a plain-markdown `DESIGN.md` file (design tokens and component patterns) sibling to a site/repo's docs, so an agent can consume a reference site's design language without opening the browser.

---

## What it is

- A curated collection of 73 `DESIGN.md` files extracted from real sites (Shopify, Tesla, Zapier, Intercom, and more).
- We adopt the *convention* (a `DESIGN.md` per reference), not anyone's extracted content. Pulled references live in `design-references/<name>/DESIGN.md`, each tagged with source + date pulled.

## How an agent uses it

- `commands/generate-design-md.md` produces a new `design-references/<name>/DESIGN.md` using `skills/design-token-extraction`.
- `commands/visual-review.md` compares rendered output against pulled `design-references/*/DESIGN.md`.
- References are Tier 4 — read only when explicitly relevant. They are inputs to be reconciled, never the project's source of truth (that stays in `design-system.md`).

## Install or reference-only

- Reference-only (convention). No code installed.

## Referenced by

- `design-references/README.md`, `commands/generate-design-md.md`, `commands/visual-review.md`, `skills/design-token-extraction`, `tools/registry.md`.