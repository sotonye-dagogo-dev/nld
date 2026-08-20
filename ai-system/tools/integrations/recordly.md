# Integration: recordly — visual-QA evidence capture

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify before first production use

> **Overview:** Open-source screen recorder/editor. Used to capture a screen recording as evidence when a visual-QA finding needs to be shown, not just described.

---

## What it is

- Records and edits screen captures for demos and walkthroughs. Adopted specifically as the evidence-capture tool behind `commands/visual-review.md`.

## How an agent invokes it

- When a `visual-review` finding is hard to express in words (an animation glitch, a hover-state bug, a breakpoint collapse), capture a short recording of the failing behavior and cite it in the QA finding.
- Used sparingly — recordings are heavy. Describe first, record only when description is insufficient.

## Cost / notes

- Recordings are binary artifacts, not Markdown state. Keep them out of context tiering; reference by path.

## Install or reference-only

- Install where visual-QA evidence becomes a real need. Otherwise evaluated-but-dormant, and this doc is the reference.

## Referenced by

- `commands/visual-review.md`, `agents/tester-qa.md` (capability section), `tools/registry.md`.