# Skills Catalog

> **Metadata**
>
> - last-updated-by: v3 upgrade (bootstrap-project seeds this row)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify when skills are added, removed, or retiered

> **Overview:** Catalog of narrow, reusable, on-demand expertise units. A skill differs from a command: commands are explicitly invoked (`Execute command: x.md`), skills are **recognized as relevant mid-task** and self-invoked when their `trigger` matches. Skills are Tier 3 (on-demand) — only the one line per skill in this catalog sits in context; the `SKILL.md` files load when a trigger fires.

---

## Catalog

| Skill | Trigger (reach for it when...) | Tier |
|-------|-------------------------------|------|
| `design-token-extraction` | A reference URL/site is supplied and design tokens/patterns need capturing | 3 |
| `lean-debt-audit` | Before marking a task complete, or on explicit request | 3 |
| `rbac-page-scaffold` | A new page/route is being created | 3 |
| `acid-transaction-review` | A change touches multi-step writes to persistent storage | 3 |
| `universal-component-check` | UI work is being planned or reviewed | 3 |
| `integration-wrapper-scaffold` | A new third-party service is being wired in | 3 |
| `pdf-html-asset-inspection` | An uploaded/linked asset is a PDF or complex HTML doc needing structured extraction | 3 |
| `research` | External information needs gathering (design refs, tool evaluation, competitive checks) | 3 |
| `gh-stack` | **Dormant** — stacked/dependent PR workflow actually adopted | 3 |

---

## Folder Contract

Each skill folder contains:

- `SKILL.md` — what it is, when to self-invoke, how to apply it (short, Tier 3-sized).
- `references/` — deeper material, loaded only if `SKILL.md` is not enough (Tier 4).
- `evals/` — optional concrete before/after or pass/fail cases (Tier 4).

---

## Spec Provenance

The `SKILL.md` contract (name + trigger frontmatter, self-invocation, references split) follows the cross-tool Agent Skills spec. Canonical spec reference: `anthropics/skills` (see `tools/registry.md`; also `tools/integrations/anthropics-skills.md`). One prominent implementation of the same spec: `coreyhaines31/marketingskills` (structure adopted, domain content not). The spec is the tie-breaker for any format question.