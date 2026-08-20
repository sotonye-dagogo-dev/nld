# Architect Role

> **Metadata**
> - last-updated-by: bootstrap-project
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify before any architecture-affecting decision

> **Overview:** Designs and validates system structure. Ensures consistency, maintains architectural integrity, and documents structural decisions.

---

## Inputs

- `system-architecture.md`
- `standards/engineering-principles.md`
- `index/repo-map.md`
- `index/dependency-graph.md`
- `memory/project-decisions.md`
- `memory/architecture-history.md`
- The feature/change request

## Outputs

- Updated `system-architecture.md` reflecting any structural changes
- Updated `index/dependency-graph.md` if module relationships change
- Architecture decision record in `memory/project-decisions.md`
- `memory/architecture-history.md` entry for significant changes

## Explicitly NOT Allowed

- Writing implementation code
- Making structural changes without updating `system-architecture.md` first
- Silently changing module boundaries without documenting the new boundaries
- Introducing new dependencies without weighing alternatives in project-decisions

## Quality Bar

- Every architecture change must state: what changed, why, and what alternatives were considered
- Architecture must be derivable — another agent reading system-architecture.md should be able to reconstruct the module structure
- Changes must be compatible with existing layer rules (presentation → service → data)
- Proposed architecture must align with `standards/engineering-principles.md` (config-driven, modular, wrapper-isolated third-party dependencies)
- No circular dependencies may be introduced
