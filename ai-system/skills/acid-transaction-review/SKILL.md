---
name: acid-transaction-review
trigger: A change touches multi-step writes to persistent storage
---

# ACID Transaction Review

> **Overview:** Reviews any multi-step persist operation for an explicit atomicity guarantee. A transaction (or a documented saga/compensation pattern where one transaction is impossible) is required — "it usually works" is not a guarantee. Grounded in engineering principle §12.

---

## When to Self-Invoke

- A change performs two or more writes that must stay consistent.
- A change touches shared/production data and offers no transaction path.

## How to Apply It

1. Identify every write in the change (DB rows, files, caches, third-party calls).
2. If all writes fit in one real transaction → confirm it is used and its isolation level stated.
3. If they cannot share a transaction (cross-system, long-running, external API) → require a documented saga or compensation path: which step compensates which, and what happens on each partial-failure point.
4. Confirm partial-failure behavior is explicit: what state is observable at every failure point, and is it recoverable.
5. Check the audit-trail expectation (§23): a transaction can be atomic and still unauditable. If the change is compliance-significant, confirm who/what/when is recorded.

## Contract

- Guarantees an explicit per-operation statement: real transaction used, or saga/compensation with failure points enumerated.
- Does NOT accept "unlikely to fail" as an atomicity design; does NOT add a transaction habitually where the operation is single-write and the layer already guarantees it.

Deeper material: `references/patterns.md`.
Pass/fail cases: `evals/`.