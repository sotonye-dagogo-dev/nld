# Engineering Principles

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: this file changes rarely — trust unless explicitly flagged

> **Overview:** The canonical doctrine for how code should be written and structured in any project using this system. Distinct from `protocols/quality-gate.md` (which governs verification of finished work) and `design-system.md` (which governs visual/UX specifics per project). This file is checked — see §25 for how it is enforced.

---

## 1. Config-Driven Over Hardcoded

Behavior, limits, feature flags, and business rules live in configuration (env vars, config files, database-backed settings, feature-flag services), not inline in logic.

**The test:** If a non-engineer might reasonably want to change this value without a code deploy, it belongs in config.

**Fallback discipline:** Hardcoded values are acceptable only as fallback defaults layered beneath config — never as the sole source of truth. Every config-driven value must have a documented, safe fallback so the system degrades gracefully (not crashes) if config is missing or malformed.

**Example:**
```python
# Bad: hardcoded with no fallback path
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

# Good: config-backed with a documented fallback
MAX_UPLOAD_SIZE = config.get("uploads.max_size_mb", fallback=10) * 1024 * 1024
```

---

## 2. Metadata-Driven Structure

Where it is a good fit (admin-editable content types, dynamic forms, permission systems, navigation/menus), define structure as data/metadata rather than hardcoded markup or branching logic — so new instances of a "thing" (a new content type, a new field, a new role) can be added by changing data, not by writing new code paths.

**Trade-off:** This adds indirection, so use it where variability is real and expected, not applied reflexively to everything. If the set of variants is fixed and unlikely to grow, hardcoded is simpler and preferable.

**Example:**
```python
# Bad: hardcoded branching for each role
if role == "admin":
    permissions = ["read", "write", "delete"]
elif role == "editor":
    permissions = ["read", "write"]

# Good: role-permissions defined as data
ROLE_PERMISSIONS = {
    "admin": ["read", "write", "delete"],
    "editor": ["read", "write"],
}
permissions = ROLE_PERMISSIONS.get(role, ["read"])
```

---

## 3. Admin-Editability With Hardcoded Fallbacks

Anything public-facing or operationally significant that a non-engineer would plausibly need to change (copy, global variables/settings, feature toggles, pricing, contact info, banner content) should be editable through an admin surface or config layer — backed by a hardcoded fallback value or constant in code so the system never breaks or shows blank/broken content if the admin-editable value is unset, deleted, or the data layer is unavailable.

This is the same fallback discipline as §1, applied specifically to operator/admin-facing content.

**Example:**
```python
# Bad: fetches from DB with no fallback — returns None/blank if missing
banner_text = db.get_setting("homepage_banner")

# Good: DB-backed with a code fallback
banner_text = db.get_setting("homepage_banner") or "Welcome"
```

---

## 4. Universal Components & Wrappers

Prefer a small set of well-designed, reusable, configurable base components/wrappers over many bespoke one-off implementations. New UI elements or service wrappers should default to extending or composing existing universal components before a new one is created — and creating a new one should be a deliberate, justified decision (logged in `memory/project-decisions.md`), not the default path.

Wrappers around third-party libraries/SDKs (auth providers, payment processors, UI kits) should isolate the third-party API behind a stable internal interface, so swapping the underlying provider does not ripple through the whole codebase.

**Example:**
```python
# Bad: direct coupling to a specific provider
from sendgrid import SendGridAPIClient

def send_email(to, subject, body):
    client = SendGridAPIClient(api_key)
    client.send(...)

# Good: internal interface isolates the provider
from app.notifications import EmailSender

def send_email(to, subject, body):
    EmailSender().send(to=to, subject=subject, body=body)
```

---

## 5. Global Definitions: Styling, Config, Types/Interfaces

Single source of truth for:
- **Design tokens** — colors, spacing, typography (defined once, consumed everywhere, never re-declared per component)
- **Global configuration shape** — the expected schema of config values
- **Shared type definitions** — TypeScript interfaces, Python type aliases, or language equivalent

**The rule:** If two modules need to agree on the shape of something, that shape is defined in exactly one place and imported, never copy-pasted or redefined.

---

## 6. Modularization & Separation of Concerns

Each module, class, or function has one clear responsibility. Favor composition over deep inheritance chains. Apply standard encapsulation discipline where the language supports it (interface-first design, dependency injection over hard-coded instantiation) without forcing OOP patterns onto code that is naturally functional or data-oriented — match the paradigm to the problem, do not apply a hammer everywhere.

**The test:** If you cannot describe what a module does in one sentence without using "and," it likely has too many responsibilities.

---

## 7. Containerization & Environment Parity

Where applicable, favor containerized, reproducible environments (Docker or equivalent) so "works on my machine" issues are structurally prevented, and config/environment differences between local, staging, and production are explicit and versioned rather than tribal knowledge.

**Minimum standard:** The project must document how to set up and run in each environment (local, CI, staging, production), whether via containers, scripts, or platform tooling.

---

## 8. Lean, Efficient, Dynamic, Maintainable Code

- **Lean:** No speculative abstraction for requirements that do not exist yet (YAGNI) — but also no copy-pasted duplication that should be a shared function (DRY). Both extremes are smells.
- **Efficient:** Be conscious of algorithmic complexity, unnecessary re-renders/re-computation, and N+1 query patterns — but do not micro-optimize at the cost of readability where performance is not actually a constraint.
- **Dynamic:** Code should accommodate reasonable variation (different environments, scales, locales, tenants if multi-tenant) without requiring a code change for each variation — this connects back to §1 (config-driven) and §2 (metadata-driven).
- **Maintainable:** A developer unfamiliar with this specific change should be able to understand it from the code plus its documentation without needing to ask the original author.

---

## 9. Documentation: Concise, Clear, and Exists

- Every non-trivial function/module gets a short doc comment: what it does, why (if not obvious), and any non-obvious constraints or gotchas — not a restatement of the function signature in prose.
- Prefer self-documenting names over comments explaining bad names.
- README and architecture docs stay in sync with code. Documentation drift is itself a quality-gate failure (per `protocols/quality-gate.md` and `commands/sync-context.md`), not a separate concern.
- No long comment blocks explaining "how" when the code itself could be made clear enough to not need it. Comments are for "why," not "what."

**Example:**
```python
# Bad: explains what (obvious from code)
# Increment the counter by 1
counter += 1

# Good: explains why (non-obvious)
# Bump the counter before the async check to prevent a race with the webhook
counter += 1
```

### Documentation style (extends §9)

Write system docs — and instruct agents to write generated documentation — in a **simplified, single-meaning-word style**: short sentences, one action per verb, no decorative synonyms, no embedded subordinate clauses. This is the discipline behind aviation's ASD-STE100 (Simplified Technical English) standard, applied here for a second reason: it keeps agent-authored docs cheap to re-read every session and free of the padded phrasing that marks AI-written prose. Apply it when writing or reviewing any `ai-system` file or generated doc. This is a style constraint on §9, not a new numbered principle.

---

## 11. RBAC via Universal Pages, Not Page Variants

Pages/routes are built once. Role determines which components render and how they behave, driven by a role-permission config (extends §2's metadata-driven pattern) — never a `PageForAdmin` / `PageForUser` fork of the same route.

**The test:** Is there exactly one route per screen, with role behavior read from config? Or does the codebase split one screen into role variants, or branch on role inside the handler? The latter is a violation.

**Example:**
```python
# Bad: a fork per role
if role == "admin":
    return render_admin_project(pid)
elif role == "member":
    return render_member_project(pid)

# Good: one route, config-driven composition
return render_project(pid, role, ROLE_PAGE_CONFIG[role])
```

---

## 12. ACID-Aware Data Operations

Any multi-step write to persistent storage documents its atomicity guarantee and uses a real transaction — or a documented saga/compensation pattern where a single transaction is not possible. "It usually works" is not a guarantee. Partial-failure behavior must be explicit.

**The test:** For every multi-write operation, can you state what happens at every failure point? If the answer is "it's unlikely to fail" rather than a transaction or a compensation map, the work is not complete.

---

## 13. Universal Component Catalog (required baseline)

Every project maintains, at minimum, single-source components for: **Table, Form/Input set, Empty State, Error State, Toast/Notification, Navbar** (responsive-first, with collapsibility and dropdowns for overflow content), **Logo** (variants for the contexts it actually renders in), and a **Theme Toggle** (light/dark/**system**, not just light/dark). All consume the design tokens from §5 — none redeclare colors/spacing locally.

**The rule:** New one-off UI in these categories is a deliberate, logged exception (per §4), not the default. The catalog's exact contents live in `design-system.md`; this principle sets the required minimum.

---

## 14. Config-Driven Utility Classes

If a utility-CSS framework (e.g. Tailwind) is in use, recurring utility combinations are lifted into named global/component classes and referenced, not repeated inline across files — the same single-source-of-truth logic as §5, applied to class composition.

**The test:** Grep a repeated multi-utility string (e.g. `flex items-center justify-between gap-2`). If it appears in N files, it belongs in a named class, not pasted N times.

---

## 15. Icons Over Raw SVG/Emoji

UI uses an icon library/component system. Inline hand-written SVG and emoji-as-icon are avoided in component code.

**The test:** Is the icon an import from the project's icon system, or ad-hoc markup drawn in the component? The latter is a violation.

---

## 16. Iteration Over Hand-Typed Repetition

Repeated or list-like content (including public-facing pages) is driven by iterating arrays/objects sourced from config, not hand-typed per-item markup — this is §1/§2/§3 applied specifically to "don't type the same block out five times with different text."

**The test:** Does the page render its list items from a data source by iteration, or is the same markup block pasted with different text? Hand-typed repetition is a violation; iteration over config-driven data is the default.

---

## 17. Structured Integration Folders

Third-party service integrations (object storage/CDNs, Redis/cache, email providers, payments, etc.) live in a consistent shape per integration: **client wrapper** (isolating the SDK per §4), **config**, and **types** — not scattered calls to a vendor SDK from wherever it is needed.

**The test:** Can you find every direct import of a vendor SDK outside its single wrapper? For each, that's a violation. Replacing a vendor should touch only its integration folder, never call sites.

Use the `integration-wrapper-scaffold` skill when wiring a new service.

---

## 18. Templated, Previewable Content

Content sent or published on a schedule/trigger (transactional and marketing emails at minimum) is stored as a template with an admin-facing preview step before send/publish — never string-built inline at send time.

**The test:** Is there a template artifact and a preview path before the first send? If email/notification body text is assembled at send time in code, that's a violation.

---

## 19. Testing Pyramid Requirement

Unit, integration, and end-to-end tests are all required, proportionally — many unit, fewer integration, fewest e2e. Not e2e-only or untested-only. `testing/test-plan.md` must show coverage across all three tiers; the quality gate checks this proportionally, not just "tests exist."

**The test:** Does `test-plan.md` list real coverage at all three tiers for current work, not just a claim that "tests exist"?

---

## 20. Compliance & Regulatory Awareness

Any change touching user data, public-facing content, or accessibility documents which policies/regulations apply (in `project-context.md` — project-specific; this file stays silent on which regulations by default) and confirms the change doesn't violate them.

**The rule:** This is a gate criterion for anything in that category, not a blanket requirement on every change. Changes to data, public content, or a11y must state which policies apply and that they are not violated.

---

## 21. Inherent Pagination

Any view rendering a list, table, or feed defaults to paginated (or virtualized/infinite-scroll, where that's the better UX fit) retrieval — never an unbounded fetch-all. Page size is config-driven (§1) with a hardcoded fallback. This is a baseline behavior of the Table/List universal component (§13), not something each screen re-implements.

**Example:**
```python
# Bad: fetch-all, paginate client-side after the fact (or not at all)
users = db.query("SELECT * FROM users")

# Good: paginated at the source, page size from config
page_size = config.get("pagination.default_page_size", fallback=25)
users = db.query("SELECT * FROM users LIMIT %s OFFSET %s", page_size, offset)
```

---

## 22. Global Destructive-Action Confirmation & Undo

Any destructive action (delete, bulk-remove, irreversible state change) routes through a single universal confirmation component (§13 territory — don't let each screen build its own confirm dialog), and where the underlying operation allows it, follows a soft-delete/undo pattern (a timed undo toast, a trash/recovery state) rather than immediate hard deletion.

**The rule:** Where true immediate hard deletion is unavoidable (e.g. compliance-mandated erasure), the confirmation step says so explicitly instead of implying it's reversible.

---

## 23. Audit Trails

State-changing actions on anything operationally or compliance-significant (per §20) are logged with **actor, timestamp, and a before/after or diff** — not just a generic "updated" flag. This is the data layer's contribution to §12 (ACID awareness) and §20 (compliance): a transaction can be atomic and still unauditable if nothing records who changed what.

**The test:** For a state-changing action, can you answer who did it, when, and what it changed? If the log says only "updated," that's a violation.

---

## 24. Agent-Extensible Verification CLI

Where feasible, the project exposes a CLI (or extends an existing one) that an agent can invoke to observe and verify application behavior end-to-end — checking real state instead of reasoning from code alone — and is permitted to extend that CLI itself when a new kind of verification is needed. This directly strengthens quality-gate criterion #7 (self-verification before handoff): "should work" stops being acceptable once there's a CLI capable of proving it does.

**The rule:** Document the CLI's commands in `system-architecture.md` so agents know it exists before reaching for a manual check. When a change creates a new verification need, extend the CLI rather than falling back to "manual reasoning, trust me."

---

## 25. How This Gets Enforced

This document is not aspirational — it is checked. Here is exactly where:

| Role/Command | When |
|-------------|------|
| **Architect** role (`agents/architect.md`) | Consults this when designing structure; proposed architecture must align with it — owns §11 (RBAC page shape), §12 (atomicity design), §17 (integration folder structure) |
| **Implementer** role (`agents/implementer.md`) | Consults this during coding; violations are flagged before completion — applies §11–§16, §21, §22, §24 in the code it writes |
| **Quality Gate** (`protocols/quality-gate.md`) | Includes a "Pattern Adherence" criterion (criterion #9) that checks against these principles — directly verifies §18 (templated/previewable), §20 (compliance statement), §23 (audit trail) |
| **Verification Rules** (`protocols/verification-rules.md`) | Provides concrete how-to checks for each principle (grep for repeated magic values, check for duplicate type definitions, etc.) — runs the mechanical checks for all sections |
| **Verify Work** (`commands/verify-work.md`) | Runs the full quality gate including pattern adherence for anything beyond a trivial change — owns §19 (testing pyramid), §24 (verification CLI evidence) |
| **Skills (`skills/`)** | `universal-component-check` for §13/§14/§15/§16/§21/§22; `rbac-page-scaffold` for §11; `acid-transaction-review` for §12; `integration-wrapper-scaffold` for §17; `lean-debt-audit` for §8/everywhere |

Each new principle above is enforced by the role/command that already owns that kind of check (right column) — the 9-point quality gate stays the single enforcement backbone.
