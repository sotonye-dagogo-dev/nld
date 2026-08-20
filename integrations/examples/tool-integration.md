# Example: Wiring an AI Tool to `ai-system`

> **Non-normative — this is an example only.** The `ai-system` kit works with any AI-assisted development tool. This file shows one possible integration pattern. Adapt it to your specific tooling stack.

---

## Core Principle

Configure your AI tool to read `ai-context.md` at session start. From there, the entry protocol handles the rest.

---

## Basic Setup (Any Tool)

1. Set your AI tool's system prompt or session instructions to:

   ```
   Read ai-context.md before responding to any query.
   ```

2. For tools that support file context injection, add `ai-system/protocols/entry-protocol.md` to the initial context.

3. For commands, use the `Execute command: [file].md` pattern with an optional `Directive:` parameter:
   ```
   Execute command: execute-feature.md
   Directive: Add role-based authentication
   ```

---

## Per-Tool Notes

### VS Code + AI Extension

- Configure the AI extension to include `ai-context.md` and `ai-system/` in its context retrieval
- Some extensions support glob patterns for auto-include: add `"ai-system/**/*.md"` to the context configuration

### CLI-based AI tool

- In your shell config or startup script, add an alias or pre-exec hook that reads `ai-context.md` into the prompt preamble
- Example: `alias ai='ai-tool --preamble "$(cat ai-context.md)"'`

### IDE-agnostic AI service

- Add `ai-context.md` as the first file in your initial prompt
- If the tool supports multi-file context, include the full `ai-system/protocols/` directory

---

## Running Commands

All `ai-system/commands/` files are designed to be invoked via the `Execute command:` pattern. The exact mechanism depends on your tool:

- Some tools support reading a command file URL/path directly
- Others require copying the content into the chat
- File-based agents can invoke the command by reading the `.md` file and following its instructions

---

## Startup Checklist (Optional)

If your tooling supports startup automation:

1. Ensure `ai-context.md` is in the initial context
2. Read `protocols/entry-protocol.md` to determine the session type (fresh vs. resume)
3. If resuming, read `checkpoints/in-progress.md` first
4. If fresh, read `planning/task-queue.md` to identify the next task

---

## What NOT to Configure

- Do NOT hardcode specific model names or providers in the `ai-system` files — the system is model-agnostic
- Do NOT add tool-specific config files (YAML, JSON, TOML for a specific extension) inside `ai-system/` — keep those in their standard locations (e.g., `.vscode/`, `~/.config/`, project root)
- Do NOT commit API keys or secrets to `ai-system/` — use `.env` or the tool's own credential store
