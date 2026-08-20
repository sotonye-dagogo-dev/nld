# Design Reference Library

> **Metadata**
>
> - last-updated-by: v3 upgrade (generate-design-md)
> - last-verified-against-code: (set on first pull)
> - staleness-policy: each entry states its own pull date — re-pull when a reference site visibly changes

> **Overview:** Pulled or hand-authored reference docs of external design languages (a competitor or inspiration site's extracted tokens/patterns). One folder per reference, a `DESIGN.md` at its root. **Tier 4 — reference only, read when explicitly relevant.** These are inputs to be reconciled against the project, never the project's source of truth (that stays in `design-system.md`, per engineering principles §5). The `generate-design-md` command creates new entries; `visual-review` can compare rendered output against them.

---

## Folder Contract

```
design-references/
└── <name>/
    └── DESIGN.md    # tokens + patterns extracted from the reference, tagged source + date
```

Each `DESIGN.md` carries, in its metadata header:
- `source:` — the URL or origin doc the design was pulled from
- `pulled-date:` — when it was captured

## Template

See `design-references/TEMPLATE/DESIGN.md` for the blank shape `generate-design-md` fills.

## Rules

- A reference is a competitor/inspiration/reference language — an input to reconcile. It does not override `design-system.md`.
- Promotion into the project's actual tokens is a human decision, flagged by the agent in the DESIGN.md file, never done by the agent.
- Keep names vendor-neutral; the registry (`tools/registry.md`) holds the concrete product/repo names for tools and references.