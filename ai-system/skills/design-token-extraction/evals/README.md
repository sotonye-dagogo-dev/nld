# Evals — design-token-extraction

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

## Pass case
- A reference URL is supplied, browsing tool available → DESIGN.md produced with palette, type, spacing, components, source, and date. No `design-system.md` edits.

## Fail case
- Reference is a leaky / inconsistent mock where tokens contradict each other → extraction must flag the contradiction, not pick a winner silently. Emitting "clean" tokens from a contradictory source without a note is a fail.
- No browsing tool and no markup supplied → must say extraction is not possible rather than invent tokens (a `needs-human-input` verdict).