# Verification Rules

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: this file changes rarely — trust unless explicitly flagged

> **Overview:** Pre-emptive verification procedures to run *before* declaring work complete. These are the concrete mechanisms behind the quality gate — how to actually check each criterion.

---

## How to Verify Each QA Criterion

### Requirement Match
- Re-read the original directive verbatim
- List the requirements implied by the directive
- Check each requirement against the implementation
- If any requirement is unmet, the work is not complete

### Generalization Check
- Identify test inputs beyond the example given
- Trace the implementation path for each alternative input
- If the logic special-cases the original example, refactor to generalize
- If you added a configuration point, verify it is documented

### Scope Discipline
- Run: `git diff --name-only` (if available) to list changed files
- For each file, state whether it was in-scope or out-of-scope
- Out-of-scope files must have a written justification
- If justification is weak, revert the out-of-scope change

### Architecture Consistency
- Check the modified code against `system-architecture.md` layer rules
- Verify no layer-skipping (UI→DB direct, Service→Service without interface)
- Verify naming conventions match existing patterns
- If a pattern from `design-system.md` exists for the task, verify it was used

### Error-Path Completeness
- For every function/modified block, identify 3 failure modes
- Check at least one is handled (try/catch, guard clause, fallback)
- If error surfaces to user, verify it is understandable

### Self-Verification
- Run the actual test suite: `npm test` / `pytest` / `cargo test` or equivalent
- If no test suite exists, run the linter and type checker
- If neither exists, manually trace the execution path for one success and one failure case
- Document which verification was performed and the result

### Pattern Adherence
- Grep for repeated magic values across files that should be config-driven
- Check whether new types/interfaces duplicate an existing shape defined elsewhere (grep for the concept name)
- Check whether new UI elements could have reused an existing universal component from the component library
- Verify that third-party SDK calls use a wrapper/adapter layer, not direct imports
- For every config-driven value, check that a fallback default is documented
- Verify that any new dependency or wrapper creation is logged in `memory/project-decisions.md`

### Pattern Adherence — v3 principle extensions
Wire the new `standards/engineering-principles.md` sections (§11–§24) into the same criterion #9 check, using the enforcement mapping in §25:

- **§11 RBAC** — a route that has per-role variants (`PageForAdmin`, `if role ==` forks) is a violation; role behavior must come from role-permission config.
- **§12 ACID** — a multi-step persist operation with no transaction and no documented saga/compensation is a violation; partial-failure behavior must be stated.
- **§13/§14/§15/§16/§21/§22** — new UI in a catalog category (Table/Form/Empty/Error/Toast/Navbar/Logo/Theme Toggle) built as a one-off without a logged exception; repeated utility groups not lifted into named classes; raw SVG/emoji icons when an icon system exists; hand-typed list markup instead of config iteration; a list view with unbounded fetch; destructive actions without the universal confirm/undo component.
- **§17** — a direct vendor SDK import outside its `integrations/<service>/` folder is a violation.
- **§18** — scheduled/transactional content built inline at send time instead of a template with a preview step.
- **§19** — `testing/test-plan.md` shows no proportional unit/integration/e2e coverage for this change.
- **§20** — a change to user data / public content / a11y has no statement of which policies apply and that they are not violated.
- **§23** — a state-changing action on something operationally significant logs neither actor, timestamp, nor a before/after diff.
- **§24** — a verification need satisfied by "manual reasoning" when the project's verification CLI has a command for it (or the CLI was not extended despite a repeated new need).

---

## Contract Compliance Checks

These are the mechanical checks behind §9 (checkpoint/task-queue coupling) and §10 (mandatory command chains) of the v3 spec. No judgment calls — each is a file comparison.

### Task-Queue / Checkpoint Coupling
- **Check:** was `planning/task-queue.md` modified this session? (`git status`, file-modified markers)
- **Requirement:** if yes, `checkpoints/in-progress.md` was written/updated in the same pass, **or** — for planning-only commands — a `checkpoints/session-log.md` entry records the mutation.
- **Test:** compare the task-queue `last-synced` marker (or file mtime) against `session-log.md`'s newest entry and `in-progress.md`'s timestamp. A mutation with no matching trace is a violation.

### Mandatory Chain Order
- **Check:** for a command whose `Contract` table names a mandatory `Chains to` target, does `session-log.md` show the chained command's entry immediately following this command's own entry?
- **Test:** read the command's contract row → find its entry in `session-log.md` → verify the chained command's entry appears next. Log-order is the check; a missing chain entry is a violation.

Every command's contract — including new v3 commands — must declare its own `Chains to` row using this same convention.
