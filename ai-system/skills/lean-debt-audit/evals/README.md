# Evals — lean-debt-audit

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

## Pass case
- Change adds a wrapper around a real third-party dependency used by a real requirement → verdict lean, pass.

## Fail cases
- A new dependency was added for a requirement nobody asked for and no config drives → over-engineered, must flag.
- Five identical blocks of markup/types that should be one shared definition → under-engineered, must flag.
- The audit hand-waves ("looks fine") with no ladder walk from YAGNI up → fail: reasoning must be visible.