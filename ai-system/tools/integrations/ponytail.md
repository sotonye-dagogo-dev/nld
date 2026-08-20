# Integration: ponytail — anti-over-engineering patterns

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the decision ladder or debt-command patterns change value

> **Overview:** The pattern source for lean-debt checking. We adopt the decision ladder and the debt-comment idea — nothing that breaks the kit's file-based, vendor-neutral stance.

---

## What it is

- Anti-over-engineering agent layer built around: a decision ladder (YAGNI → reuse → stdlib → native → dependency → one-line), a `ponytail:` inline debt-comment convention harvested into a ledger, and review/audit/debt commands.
- Its multi-manifest distribution model (an `AGENTS.md` plus tool-specific manifests) is noted as the shape for a possible future opencode adapter — a stretch goal, not built in v3.

## What v3 adopted

- The decision ladder reinforces existing engineering principle §8 (Lean/YAGNI) — cross-reference instead of duplicating.
- The review-over-engineering loop became `skills/lean-debt-audit`.

## Install or reference-only

- Reference-only (patterns). No dependency.

## Referenced by

- `skills/lean-debt-audit`, `standards/engineering-principles.md` §8, `tools/registry.md`.