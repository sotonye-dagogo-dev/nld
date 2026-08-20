# Transaction and saga patterns (skill reference)

> **Metadata**
> - last-updated-by: v3 upgrade (skill authoring)
> - last-verified-against-code: (set on first use)
> - staleness-policy: Tier 4 reference — re-verify before relying on anything in a specific audit

Single-transaction path (in-process, same data store):
- One transaction, explicit isolation level. All-or-nothing at the DB level. No compensation needed because the failure state is "nothing happened."

Saga / compensation path (cross-system, long-running, external):
- Decompose the operation into named steps. For each step define its compensating step. At each failure point, state what is observable and how the system recovers (rollback prior steps, retry, or flag for manual resolution).
- A saga's guarantee is eventual consistency, not atomicity — document that honestly.

Idempotency:
- Any step that can be retried must be idempotent so compensation and retry do not double-apply.

These patterns are the toolbox behind principle §12. The requirement is a written choice per operation: transaction, or documented saga with explicit failure points.