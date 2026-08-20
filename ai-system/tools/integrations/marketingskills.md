# Integration: marketingskills — the Agent Skills spec, one implementation

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the Agent Skills spec evolves

> **Overview:** The repo that demonstrated the portable cross-tool skill format adopted for `skills/`. We adopt the *structure* only — never marketing-domain content.

---

## What it is

- A collection of marketing-domain agent skills built on the Agent Skills spec: a `SKILL.md` (what it is + when to self-invoke) with optional `references/` and `evals/` sidecars.
- The same format works across any coding tool that reads a `SKILL.md`.

## What v3 adopted

- The folder shape (`skills/<name>/SKILL.md`, `references/`, `evals/`).
- The `trigger` idea: a skill is recognized as relevant mid-task, unlike a command which is explicitly invoked.
- The canonical spec source is `tools/integrations/anthropics-skills.md`; this repo is one implementation of that spec.

## Install or reference-only

- Reference-only (structure). No code installed in a project.

## Referenced by

- `skills/README.md`, `tools/registry.md`.