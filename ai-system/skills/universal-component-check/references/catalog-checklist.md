# Universal catalog checklist (skill reference)

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

Required baseline (principle §13). All consume design tokens (principle §5):

- Table — single-source table component, paginated by default (§21).
- Form / Input set — labels, validation messages, error state.
- Empty State — shown when a list/table has no data.
- Error State — shown when a load fails, with an action.
- Toast / Notification — async feedback, used for transient actions.
- Navbar — responsive-first, collapsible, dropdowns for overflow.
- Logo — variants for the contexts it actually renders in.
- Theme Toggle — light / dark / **system**, not just light/dark.

Check for each: is this element re-implemented anywhere, or reused from the catalog? Are raw tokens leaking in instead of catalog-consumed styles?