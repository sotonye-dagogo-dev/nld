# Evals — research

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

## Pass case
- Tool evaluation returns one row per resource, verdicts given, and one `needs-human-input` row for a blocked domain with the exact gap stated. Pass.

## Fail cases
- A blocked page is "summarized" from guesswork → fail.
- A find is reported with no verdict ("interesting resource") → fail: no decision value.
- A third-party summary is presented as the primary source without the primary being checked → fail.