# Escalation Rules

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: this file changes rarely — trust unless explicitly flagged

> **Overview:** Defines when the active agent should ask a human for input vs. proceed autonomously. Reduces unnecessary interruptions while preventing costly wrong turns.

---

## When to Proceed Without Asking

| Situation | Action |
|-----------|--------|
| Requirement is unambiguous and within defined scope | Proceed |
| Implementation follows established patterns (same module, same conventions) | Proceed |
| Minor ambiguity resolvable by reading related code or docs | Resolve from codebase, proceed |
| Missing env var or config with a documented default | Use the default, proceed |
| Task is a known pattern (fix hydration error, add API route, add DB migration) | Proceed, reference repair-system |

---

## When to Ask a Clarifying Question

| Situation | Action |
|-----------|--------|
| Requirement is ambiguous and no code/doc clarifies it | Ask one focused question |
| Multiple valid approaches with different trade-offs | Present options with your recommendation |
| Change affects a module you have not read yet | Read it first; if still unclear, ask |
| Task implies scope not covered by any directive | Ask whether to proceed with expanded scope |
| User directive contradicts system-architecture.md or project-context.md | Flag the contradiction, ask for clarification |

**Format for questions:** State what you know, what you need, and (if applicable) your recommendation. One question per turn.

---

## When to Stop and Flag

| Situation | Action |
|-----------|--------|
| Task requires destructive operation (drop table, delete files, irreversible migration) | Stop, flag, await confirmation |
| Task adds a new external dependency | Flag with justification and alternatives |
| Task changes the data schema of a shared/production database | Stop, flag, await confirmation |
| Task modifies authentication, authorization, or security boundaries | Flag for human review |
| You detect a security vulnerability in existing code | Flag immediately, do not patch without confirmation |
| Task requires API keys, secrets, or credentials to be committed | Flag — this must never happen |
| The cost/time estimate for a task exceeds reasonable bounds for a single session | Flag, ask if it should be broken down |

---

## In Cloud / Async Sessions

For unattended sessions (`cloud-session.md`), escalation rules are stricter:
- **Never proceed** on destructive ops, dependency changes, schema migrations, or security changes without pre-authorization
- Hard stop-and-flag conditions are absolute — the agent must stop and write a human-handoff summary rather than proceeding with uncertainty
