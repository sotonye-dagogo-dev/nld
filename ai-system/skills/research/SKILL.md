---
name: research
trigger: External information needs gathering — design references, tool evaluation, competitive checks, factual verification
---

# Research

> **Overview:** Codifies how an agent researches external information: registry-first, primary sources, explicit verdicts, and honest handling of what it cannot access. Turns the discipline of a careful audit session into a reusable skill. Never guesses at unreachable content.

---

## When to Self-Invoke

- Gathering design references or competitive DESIGN.md pulls.
- Evaluating tools/repos for `commands/audit-sources.md` or a dependency decision.
- Verifying a fact, pattern, or standard before relying on it.

## How to Apply It

1. **Check the registry first.** If the subject is already in `tools/registry.md`, read that row before re-researching.
2. **Prefer primary sources.** The vendor repo, the official docs, the standard's own text — over third-party summaries when the primary is reachable.
3. **One-line verdicts.** Every find gets a verdict (adopt / reference-only / reject / needs-human-input) and a one-line reason. No "that's interesting."
4. **Flag inaccessible sources explicitly.** Blocked domain, dead link, requires auth → `needs-human-input`, reason "inaccessible." Say so. Never guess at content or fake a summary.
5. **Anchoring**: state what the source itself says vs. what you infer from it. Do not conflate.
6. **Trust remarks**: for vendor claims, note when something is unverified marketing rather than verified behavior.
7. Record results via the applicable command (`audit-sources` for tool evaluation, `generate-design-md` for design references) or a session-log entry.

## Contract

- Guarantees: primary-source preference, one-line verdict per find, accessible/inaccessible honesty.
- Does NOT fabricate content for unreachable sources; does NOT adopt-and-build from hearsay — an adoption changes a file this session, verified content only.

Deeper material: `references/source-discipline.md`.
Pass/fail cases: `evals/`.