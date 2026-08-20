---
name: integration-wrapper-scaffold
trigger: A new third-party service (storage, cache, email, payments, etc.) is being wired in
---

# Integration Wrapper Scaffold

> **Overview:** Scaffolds a third-party integration in the consistent folder shape: client wrapper (isolating the SDK), config, and types. No scattered vendor calls from wherever they are needed. Grounded in engineering principle §17 (and §4's wrapper isolation).

---

## When to Self-Invoke

- A new third-party service is being added and a first call is about to be written.

## How to Apply It

1. Confirm the service is genuinely needed (lean-debt-audit ladder: reuse → stdlib → dependency last).
2. Create the integration folder in the established shape:
   - `client` / wrapper — isolates the vendor SDK, exposes a stable internal interface (swap vendor without touching callers).
   - `config` — keys, endpoints, limits; config-driven with fallbacks per §1; secrets never committed.
   - `types` — the integration's data shapes, defined once (single source of truth per §5).
3. Wire calls through the wrapper everywhere; no direct vendor imports outside it.
4. Per escalation rules, flag the dependency addition if not pre-authorized.
5. Check the strictness the vendor requires (timeouts, retries, rate limits) and encode it in the wrapper, not per-call.

## Contract

- Guarantees wrapper + config + types in the integration folder; no vendor calls outside the wrapper.
- Does NOT choose a vendor for you (that is a human/architect decision); does NOT wrap a one-call utility in ceremony that speculation would regret (lean check applies).

Deeper material: `references/shape.md`.
Pass/fail cases: `evals/`.