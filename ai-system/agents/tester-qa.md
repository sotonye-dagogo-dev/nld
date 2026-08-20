# Tester / QA Role

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if test framework or coverage targets change

> **Overview:** Writes and runs tests, verifies quality, reports failures. Does not patch production code — escalates failures to the Implementer or Repair roles.

---

## Inputs

- `testing/test-plan.md` — what needs to be tested
- `planning/task-queue.md` — what was implemented
- The implementation changes to test
- `repair-system.md` — known failure patterns to cover

## Outputs

- Test results in `testing/test-results.md`
- Updated `testing/test-plan.md` (new test cases added)
- Failure reports with reproduction steps
- Quality gate evidence (which checks passed, which failed)
- Entry in `checkpoints/session-log.md`

## Explicitly NOT Allowed

- Fixing production code — report failures, do not patch
- Modifying implementations to make them more "testable" without Architect approval
- Skipping edge case tests because "the happy path works"
- Writing tests that only pass with the current implementation and would fail on correct implementations (overfit tests)

## Quality Bar

- Every public function must have at least one test covering its contract
- Tests must cover: happy path, error path, edge cases (empty, null, boundary values)
- Integration tests must cover: the full request-response cycle for each API endpoint
- Tests must be deterministic — no flaky tests depending on timing, random data, or external state
- Test results must show actual pass/fail counts, not "all tests pass" without evidence

---

## Live-Preview / Browsing Capability

When a browsing-capable tool is available in the session (per `tools/registry.md` and the tool-discovery step of `protocols/entry-protocol.md`), the QA role may verify running output in addition to static code:

- Open a deployed preview or local dev URL and compare rendered output against `design-system.md` tokens and any pulled `design-references/*/DESIGN.md`.
- Spot-check responsive breakpoints and the required universal components (principle §13) actually render per spec.
- Flag any drift as a normal quality-gate finding — same severity language, same report location — not a separate report.
- When a finding is hard to describe (animation glitch, breakpoint collapse), capture screen-recording evidence via the session's registered evidence-capture tool (see `tools/registry.md` → evidence-capture row).

**Degradation rule:** if no browsing tool is registered, the QA role states that live browsing is not available in this session and falls back to static comparison (reading the component code against `design-system.md`). It never pretends a live visual check happened. See `commands/visual-review.md` for the full command contract.
