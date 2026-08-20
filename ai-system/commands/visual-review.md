# Visual Review Command

> **Metadata**
>
> - last-updated-by: v3 upgrade (visual-review)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the design system or browsing capability changes

> **Overview:** Opens a preview/deployment URL (or local dev server address) and compares the rendered output against `design-system.md` tokens and any relevant `design-references/*/DESIGN.md`. Reports drift as findings. Does **not** modify code — same contract shape as `verify-work.md`.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Compares rendered output against the design system and pulled references | Does not modify any code |
| Spot-checks responsive breakpoints and universal components (§13) per spec | Does not silently fail if browsing is unavailable — states it explicitly |
| Reports drift with the same severity vocabulary as the quality gate | Does not fake a visual check that did not happen |
| Degrades to static comparison when no browsing tool is registered | Does not make assumptions about specific AI tools |

**Chains to:** `None` — read-only by contract. Findings feed `verify-work.md` or the next implementation pass as deliberate invocations. Logs a `checkpoints/session-log.md` entry on completion.

---

## Required Inputs

A `Directive:` with a preview URL, deployment URL, or local dev server address.

## Optional Directives

```
Execute command: visual-review.md
Directive: URL [preview/deployment/local address]

Directive: URL https://preview.example.com — focus on the checkout flow
Directive: URL http://localhost:3000 — spot-check the navbar at mobile breakpoints
```

---

## Execution

1. **Discover the browsing tool.** Check `tools/registry.md` for the registered browsing tool (adopted backend documented in `tools/integrations/`).

2. **If no browsing tool is available:** state explicitly that browsing is not available in this session and fall back to static comparison — read the relevant component code against `design-system.md`. Do not present this as a live visual check.

3. **Open the target URL.** Load the preview/deployment page or local dev address.

4. **Compare against the design system:**
   - Colors, typography, and spacing against `design-system.md` tokens (§5 — tokens are the source of truth)
   - Required universal components (§13) actually rendering per spec
   - Any pulled `design-references/*/DESIGN.md` that match the screen
   - Responsive breakpoints (the design-system's breakpoint table)

5. **Flag drift** as a normal quality-gate finding: location, severity (blocking/major/minor), and the specific token/spec mismatch. Where showing beats describing (animation, hover, breakpoint collapse), attach a screen-recording reference via the session's registered evidence-capture tool (see `tools/registry.md`).

6. **Report:** what was reviewed, at what URL, what matched, what drifted, and — if degraded to static — that explicit statement.

7. **Log** a `checkpoints/session-log.md` entry with the review result.