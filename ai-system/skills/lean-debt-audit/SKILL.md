---
name: lean-debt-audit
trigger: Before marking a task complete, or on explicit request to check for over-engineering / lean-ness
---

# Lean Debt Audit

> **Overview:** Checks completed work for over-engineering (speculative abstraction, premature dependency, unused configurability) and under-engineering (copy-paste duplication). Grounded in engineering principle §8 (Lean, Efficient, Dynamic, Maintainable) and the decision ladder pattern. Verdicts feed the normal quality-gate finding, not a separate report.

---

## When to Self-Invoke

- Just before marking a task complete in the quality gate.
- On explicit request: "is this over-engineered?" / "check for debt."
- On request to decide whether a dependency is warranted.

## How to Apply It

1. Walk the change up the decision ladder, in order, and stop at the first rung that fits:
   YAGNI (don't build it) → reuse existing → standard library → native language → add dependency → only as a last resort.
2. For each abstraction/dependency/wrapper introduced, ask: does a requirement exist *today* that it serves?
3. For each repeated block, ask: is this copy-paste that should be a shared function, or duplication for a reason?
4. Check the quality-gate criterion #2 (generalization) — an overfit solution is also a lean failure, and a speculative abstraction is the inverse failure.
5. Report findings as blocking/major/minor with a specific remedy. Do not fix silently — flag and hand to the relevant role.

## Contract

- Guarantees a verdict per change: lean / over-engineered / under-engineered, each with the reasoning.
- Does NOT reject a dependency that a real, current requirement justifies; does NOT force duplication removal where the abstraction would be speculative.

Deeper material: `references/debt-audit-ladder.md`.
Pass/fail cases: `evals/`.