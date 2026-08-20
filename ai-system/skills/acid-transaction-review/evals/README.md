# Evals — acid-transaction-review

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

## Pass case
- Two-DB-tables change → single transaction with isolation stated; failure of second write rolls back the first. Pass.

## Fail case
- Multi-write change (deduct in DB + notify via external API) with no ordering, no compensation, no failure-point statement → fail. Must specify saga or compensation even if "the API rarely fails."
- Reviewer accepts "it usually works" as a design guarantee → fail: partial-failure behavior must be explicit.