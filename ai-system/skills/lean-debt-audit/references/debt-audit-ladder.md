# Debt-audit ladder (skill reference)

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

The source repo is a registered anti-over-engineering agent layer (see `tools/registry.md` → `lean-debt-audit` pattern source). Adopted pieces: the decision ladder and the debt-flagging idea, cross-referenced with engineering principle §8:

Decision ladder (ask in order, stop at the first that fits):
1. YAGNI — the requirement does not exist yet. Do not build it.
2. Reuse — does a function/component/config already do this? Use it.
3. Standard library — the language ships it. Use that.
4. Native — platform-native capability. Use that.
5. Dependency — a package is genuinely needed. Adopt only now, and through a wrapper (§17).
6. One-line — prefer a single clear line over a framework.

Debt-flagging: mark flagged spots inline so they can be harvested into a ledger later. In `ai-system`, the ledger is `memory/lessons-learned.md` and the audit is this skill + `commands/verify-work.md`.

The ladders reinforce §8; nothing from the external repo is adopted as code.