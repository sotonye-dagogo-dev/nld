---
name: rbac-page-scaffold
trigger: A new page/route is being created in a project with roles/permissions
---

# RBAC Page Scaffold

> **Overview:** Scaffolds a new page so role controls the composition — one route rendered per role via a role-permission config, never a `PageForAdmin` / `PageForUser` fork. Grounded in engineering principle §11.

---

## When to Self-Invoke

- A new page/route is being created and any of its content, actions, or navigation entries differ by role.

## How to Apply It

1. Confirm the route is built once. Role must not spawn route variants.
2. Read/derive the role→permission mapping from the role-permission config (memory/`system-architecture.md`), not from ad-hoc `if role ==` branching.
3. Scaffold the page so it composes from: universal components (§13) + role-permission config deciding which components render and how they behave.
4. Verify every gated action also enforces server/config-side, not just hidden UI (UI hiding is UX, not security).
5. Add the page to the pagination/undo/audit defaults that apply to any list/destructive content on it.

## Contract

- Guarantees one route, config-driven role behavior, no page-per-role fork.
- Does NOT invent roles or permissions that are not in config; does NOT build a generic auth system that does not exist yet.

Deeper material: `references/example.md`.
Pass/fail cases: `evals/`.