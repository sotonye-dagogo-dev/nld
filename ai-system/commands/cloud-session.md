# Cloud / Async Session Command

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if async session constraints change

> **Overview:** Protocol for unattended/asynchronous sessions where there is no human in the loop to interrupt bad direction in real time. Requires tighter pre-authorized scope boundaries, mandatory checkpoint cadence, and a hard stop-and-flag condition list.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Writes checkpoints at defined cadence (not just at end) | Does not proceed past hard stop-and-flag conditions |
| Includes a human-handoff summary on completion | Does not make assumptions about specific AI tools |
| Respects pre-authorized scope boundaries strictly | Does not perform destructive ops without explicit pre-authorization |

**Chains to:** `sync-context.md` and `update-ai-system.md` — both mandatory on completion. An unattended session gets the deep sync unconditionally, every time: there is no human available later to notice drift and trigger it manually. `update-ai-system.md` runs before writing the handoff summary. A skipped chain invocation is a compliance violation (per §10 of the v3 spec).

---

## Required Inputs

- A directive with **explicit scope boundaries** (what is and is not allowed)
- Pre-authorization or explicit denial for: destructive ops, dependency changes, schema migrations, security changes

## Optional Directives

```
Execute command: cloud-session.md
Directive: [task with explicit scope]

Directive: Refactor the user module service layer. Pre-authorized: change service files only. NOT authorized: touch database schema, add dependencies, modify auth.
```

---

## Execution

### Setup
1. Read the directive and extract explicit scope boundaries.
2. Confirm pre-authorization status for each risky category.
3. Write `checkpoints/in-progress.md` with: scope boundaries, pre-auth status, and checkpoint cadence.

### Checkpoint Cadence
- Write to `checkpoints/in-progress.md` after every major sub-step (not just at the end)
- Write to `checkpoints/session-log.md` after every checkpoint
- Do not proceed more than 3 steps without a written checkpoint

### Hard Stop Conditions (must stop immediately, flag in session-log, write handoff summary)
- Any operation touching files outside the authorized scope
- Any dependency addition or removal
- Any schema migration or data transformation
- Any security boundary change
- Any operation that requires a decision not covered by pre-authorization
- If a test suite fails in a way the fix is unclear
- If the actual work diverges from the plan by more than one step

### Completion
1. Run the quality gate from `protocols/quality-gate.md`.
2. Run `sync-context.md`.
3. Run `update-ai-system.md` — the deep sync runs unconditionally in an unattended session (mandatory chain, see Contract).
4. Write a **human-handoff summary**:
   - What was attempted
   - What was completed
   - What was stopped (and why)
   - Remaining work
   - Any decisions made that should be reviewed
5. Clear `checkpoints/in-progress.md`.
