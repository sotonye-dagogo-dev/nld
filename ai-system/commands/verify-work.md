# Verify Work Command

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if QA criteria change

> **Overview:** Standalone quality gate invocation. Runs the full QA checklist from `protocols/quality-gate.md` against a given piece of work. Can be invoked on its own or as a required internal step of `execute-feature.md` and `dev-cycle.md`.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Evaluates work against all 9 QA criteria | Does not fix issues found — flags them |
| Produces a pass / conditional pass / fail result | Does not skip criteria to produce a "pass" result |
| Identifies specific issues with locations and severity | Does not make assumptions about specific AI tools |
| Recommends rollback or patch-forward for each failure | Does not modify code |

**Chains to:** `None` — deliberately. `verify-work.md` is read-only by contract ("does not modify code"); it is the human-in-the-loop escalation point, not a chain trigger. Fixes triggered by its findings are separate, deliberate invocations.

---

## Required Inputs

A description of the work to verify, or the work is the current session's changes.

## Optional Directives

```
Execute command: verify-work.md
Directive: [specific focus area]

Directive: Focus on generalization check and error paths for the auth module
Directive: Verify the last commit for architecture consistency only
```

---

## Execution

1. Read `protocols/quality-gate.md` for the full checklist.

2. For each criterion, run the concrete checks from `protocols/verification-rules.md`:
   - **Requirement match** — re-read directive, check each requirement
   - **Generalization check** — test with inputs beyond the example
   - **Scope discipline** — list changed files, justify out-of-scope
   - **Architecture consistency** — check against system-architecture.md
   - **No unstated assumptions** — scan for baked-in assumptions
   - **Error-path completeness** — check 3 failure modes per function
   - **Self-verification** — check test results, manual trace
   - **No re-prompt debt** — check if follow-ups are needed
   - **Pattern Adherence** — check against standards/engineering-principles.md

3. Produce a report:
   - **Result**: Pass / Conditional Pass / Fail
   - **Criterion-by-criterion assessment**: each with pass/fail and evidence
   - **Issues found**: location, severity (blocking/major/minor), description
   - **Recommendation**: for each blocking issue, rollback or patch-forward

4. If invoked as part of `execute-feature.md` or `dev-cycle.md`, return the result to the parent command.
