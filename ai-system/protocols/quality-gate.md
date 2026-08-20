# Quality Gate — Anti-Slop Verification Protocol

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: this file changes rarely — trust unless explicitly flagged

> **Overview:** The mandatory QA checklist that every command must run before declaring work complete. This is the most important protocol in the system — it prevents overconfident output, premature completion, scope-padding, hallucinated file references, and solutions overfit to one example rather than the actual requirement.

---

## Mandatory Checklist

Before closing any piece of work (feature, fix, refactor, or doc update), verify each item. If any check fails, do not mark the work complete — either fix the issue or flag it explicitly as a residual risk.

### 1. Requirement Match

Does the implementation address the **actual stated requirement**, not a convenient reinterpretation of it? Re-read the original directive. If you changed scope or approach, was that explicitly agreed?

### 2. Generalization Check

Would this solution work for inputs/cases beyond the one example discussed, or is it overfit?
- Hardcoded values that should be configurable? 
- Magic-string matching a specific test sample?
- Special-casing instead of solving the general case?
- Does the solution handle the **full contract** of the requirement, or just the visible example?

### 3. Scope Discipline

Did you touch only files relevant to the task? Cross-check against `dependency-graph.md` or live tool introspection. For every file modified outside the expected scope, write a justification. If you cannot justify it, revert the change.

### 4. Architecture Consistency

Does the change match `system-architecture.md` and the relevant role boundaries? Did you introduce silent architecture drift (e.g., a service calling another service directly instead of through its public API, a UI component doing data fetching that should go through a hook)? If architecture changes were needed, was `system-architecture.md` updated first?

### 5. No Unstated Assumptions

Any assumption made during implementation must be **explicitly logged**:
- Log significant assumptions to `memory/project-decisions.md`
- Log minor operational assumptions in the session-log entry
- Do not silently bake assumptions into the implementation

### 6. Error-Path Completeness

Are failure and edge cases handled, not just the happy path?
- What happens when inputs are empty, null, or malformed?
- What happens when a dependency (API, database, file) is unavailable?
- What happens on partial failure?
- Are errors surfaced understandably (user-facing message, logged, re-thrown)?

### 7. Self-Verification Before Handoff

State **how** you verified the work:
- Tests run and passed (list which)
- Manual trace or reasoning (describe the trace)
- Lint/type checks passed
- "Should work" is **not** an acceptable closing statement
- If verification was not possible, state that explicitly as a residual risk

### 8. No Re-Prompt Debt

Before ending the turn, ask yourself: "Is there an obvious follow-up question or fix the user or next agent will have to come back and ask for?" If yes:
- Resolve it now if it is small
- Or flag it explicitly in the session log so it is not silently deferred

### 9. Pattern Adherence

Does the implementation follow `standards/engineering-principles.md`? The new v3 principles (§11–§24) are enforced at the points the §25 enforcement map routes them to — cross-check your work against that table, not just the principle list:
- Are values that should be config-driven actually configurable (not hardcoded)?
- Are existing type/interface/styling definitions reused rather than duplicated?
- Is modularization appropriate — is each module responsible for one thing?
- Are third-party SDKs wrapped behind a stable internal interface?
- Is there a documented fallback for every config-driven value?
- RBAC via universal pages, not page variants (§11)? Transaction/saga choice stated (§12)?
- Universal catalog baseline used, raw tokens not leaking (§13, §5)? Data loaded paginated, not fetch-all (§21)?
- Destructive actions confirmed with undo path (§22)? Audit trails written (§23)?

---

## Rollback Guidance

If the QA gate fails **after** implementation:

| Condition | Action |
|-----------|--------|
| Small, contained issue | Patch-forward: fix inline, re-verify |
| Architecture drift, no test coverage | Revert the change, update architecture doc, re-implement |
| Overfit solution, wrong abstraction | Revert, re-plan, re-implement |
| Out-of-scope files modified | Revert those files, document why they should not have been touched |
| Can't verify (no tests, no manual trace possible) | Flag as residual risk, do not deploy to production |

If reverting, use `git revert` or `git checkout` for the affected files. Log the revert reason in `session-log.md`.

---

## Invocation

This gate is run automatically by:
- `execute-feature.md` (internal step before completion)
- `dev-cycle.md` (internal step before marking task done)
- `verify-work.md` (standalone invocation for spot-checks)
