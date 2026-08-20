# Pull Template Update Command

> **Metadata**
>
> - last-updated-by: v3 upgrade (pull-template-update)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify if the version-comparison or merge policy changes

> **Overview:** Pull-based template update propagation. Compares the installed kit's recorded version (in `ai-context.md` metadata, set at bootstrap) against the upstream template's `VERSION`. If newer, fetches the changed files, diffs them against local copies, and **proposes** a merge — it never silently overwrites a file that diverges from the version it was bootstrapped from. Produces a human-reviewable diff; does not auto-apply.

---

## Contract

| Guarantees | Does NOT |
|------------|----------|
| Compares installed version vs upstream `VERSION` and reports the delta | Does not auto-apply anything |
| Fetches changed files and diffs them against local copies | Does not silently overwrite a locally customized file |
| Checks `memory/project-decisions.md` for logged local customizations first | Does not merge if local divergence is logged |
| Produces a human-reviewable diff and proposal | Does not make assumptions about specific AI tools / network availability of the remote |

**Chains to:** `None` mandatory — the output is a proposal for a human. After the human approves, follow-up work is manual or invokes `sync-context.md` for freshness. Logs a `checkpoints/session-log.md` entry noting the comparison result.

---

## Execution

1. **Read the local recorded version** from `ai-context.md` metadata (`installed-ai-system-version:`) — set by `bootstrap-project.md`. If missing, say so: there is no baseline, and the operator must bootstrap or manually record the version before this command can compare.

2. **Fetch the upstream `VERSION`** from the template repository (the source repo the project bootstrapped from). If unreachable, report `needs-human-input` and stop — do not guess at a version.

3. **Compare.** If the installed version equals or is newer than upstream, report "up to date" and stop. Otherwise list which files changed between the two versions (from the upstream `CHANGELOG.md` and/or the diff).

4. **Check local customizations first.** For each changed file, check `memory/project-decisions.md` for a logged local customization. A file with a logged customization is flagged as *divergent* — the proposal must show the diff and require explicit human approval for that file; it is never merged silently.

5. **Fetch and diff** the changed files. Produce a human-reviewable diff (what changed upstream, what differs locally).

6. **Propose.** List per file: `merge-clean` / `divergent-needs-decision` / `new-file` / `removed`. Never auto-apply. The human reviews and decides.

7. **Log** the comparison result in `checkpoints/session-log.md`.

---

## Feasibility note (honest)

This is a template *repository*, not a package registry with subscriber tracking — there is no way to push updates to already-bootstrapped projects. The mechanism is pull-based, initiated by each project, via this command. A stretch goal (packaging the kit for versioned install) is flagged in `planning/task-queue.md` backlog, not built in v3.