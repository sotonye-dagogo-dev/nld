# Integration: hyperframes — HTML→video for stakeholder review

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify before first use; lowest-priority adoption of the §5 set

> **Overview:** Turns a static HTML mock into a walkthrough video. Optional, agent-oriented way to present a design mock to stakeholders. Newest and least proven of the four §5 tools — treat as optional, not required.

---

## What it is

- HTML→video rendering service/library built for agent workflows. A design mock becomes a shareable walkthrough video.

## How an agent uses it

- Optional step in visual review: when a stakeholder wants a narrated walkthrough of a static design mock, render it to video instead of sending a screenshot.
- Same capability contract as recordly — binary evidence/artifact, referenced by path, never inline.

## Cost / notes

- Rendering HTML→video has real cost and failure modes (fonts, animations, timing). Do not make it a gating dependency of any v3 command.

## Install or reference-only

- Optional. Marked lower priority: wait until a concrete stakeholder-video need appears before wiring it.

## Referenced by

- §5 (optional), `tools/registry.md`.