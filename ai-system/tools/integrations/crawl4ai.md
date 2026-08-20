# Integration: crawl4ai — browsing / scraping backend

> **Metadata**
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: re-verify before first production use

> **Overview:** The registered browsing/scraping backend for live-preview verification and design-token extraction. LLM-friendly extraction — not a screenshot-only tool. Name appears here and in `tools/registry.md` only; commands describe this as "the registered browsing tool."

---

## What it is

- Open-source web crawler/scraper. Extracts page content as clean, LLM-consumable data (markdown / structured), plus options for screenshots.
- Best-fit choice where a QA agent must open a deployed preview or a reference URL and read its actual rendered content, rather than reason from source alone.

## How an agent invokes it

1. Confirm the session has the browsing tool available (tool-discovery step in `protocols/entry-protocol.md`; check this doc for invocation specifics).
2. Feed it the preview/deployment URL (or local dev address) from the `Directive:`.
3. For design work, extract rendered content then compare against `design-system.md` tokens and any pulled `design-references/*/DESIGN.md` per `commands/visual-review.md` and `commands/generate-design-md.md`.

## Cost / context notes

- Crawls are external network calls — respect the session's network policy and site terms.
- Prefer extraction over screenshots when tokens matter; screenshots are evidence, not primary input.

## Install or reference-only

- Install/reference: install only where the project actually builds a browsing or viewer capability. Otherwise it stays an evaluated candidate and this doc is the reference.
- Adopted as the *backing approach* for §5/§6 capabilities; the concrete wiring decision belongs to `memory/project-decisions.md` at implementation time.

## Referenced by

- `commands/visual-review.md`, `commands/generate-design-md.md`, `skills/pdf-html-asset-inspection`, `agents/tester-qa.md` (capability section), `tools/registry.md`.