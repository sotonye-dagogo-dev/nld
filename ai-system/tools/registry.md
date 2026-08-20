# Tool & Resource Registry

> **Metadata**
>
> - last-updated-by: v3 upgrade (audit-sources)
> - last-verified-against-code: (set on first run)
> - staleness-policy: append-only; re-verify a row only when the resource is adopted or referenced

> **Overview:** Master table of every external tool, repo, and reference resource evaluated for this system. One row per resource, kept terse (one line each — longer notes belong in the matching `tools/integrations/*.md` doc for adopted resources). **This is Tier 3 (on-demand).** Read it before doing by hand anything a registered tool does better — a live-preview browse, PDF text extraction, a design-reference check (per `protocols/entry-protocol.md`).

---

## Registry

Columns: `Resource | Source link | Category | What it does (1 line) | Verdict (adopt / reference-only / reject / needs-human-input) | Why | Action taken`

| Resource | Source link | Category | What it does | Verdict | Why | Action taken |
|---|---|---|---|---|---|---|
| marketingskills (`coreyhaines31`) | https://github.com/coreyhaines31/marketingskills | Repo — Agent Skills reference | Marketing-domain agent skills using the Agent Skills spec (`SKILL.md` + `references/` + `evals/`) | adopt (structure only) | Structure is domain-agnostic and well-shaped; domain content is not ours | Basis for the whole `skills/` subsystem and this registry's shape |
| pdf-inspector (`firecrawl`) | https://github.com/firecrawl/pdf-inspector | Repo — library | Classifies PDFs (text / scanned / mixed), extracts position-aware text, converts to Markdown | adopt (approach) | Adopt the classify-then-extract approach, not necessarily the Rust crate | Backs PDF handling in the design-asset viewer and the `pdf-html-asset-inspection` skill |
| ai-agents-for-beginners (`microsoft`) | https://github.com/microsoft/ai-agents-for-beginners | Repo — course | 18-module curriculum: tool use, agentic patterns, agentic RAG, planning, multi-agent, memory, browser-use, securing agents | reference-only | Learning reference, not a drop-in artifact; no content copied | Informed browsing capability, closing-turn reporting, and compliance awareness conceptually |
| awesome-design-md (`VoltAgent`) | https://github.com/VoltAgent/awesome-design-md | Repo — convention | 73 curated `DESIGN.md` files extracted from real sites (Shopify, Tesla, Zapier, Intercom, etc.) | adopt (convention) | `DESIGN.md` is the proven plain-markdown design-token/pattern convention | Basis for `design-references/` and the `generate-design-md` command |
| ponytail (`DietrichGebert`) | https://github.com/DietrichGebert/ponytail | Repo — patterns | Anti-over-engineering layer: YAGNI→reuse decision ladder, debt-comment ledger, multi-manifest distribution | adopt (patterns) | Decision ladder matches the lean/YAGNI doctrine already in engineering principles §8 | Basis for the `lean-debt-audit` skill and the opencode-adapter stretch goal (§11) |
| simplifyingai.co | http://simplifyingai.co/ | Website | Unknown — not reachable from the audit session | needs-human-input | Domain not on the allowed network list | Paste the content or a screenshot; audit-sources will evaluate it |
| 8 × x.com status links (unicodef1wn, chddaniel, divyansht91162 ×3, dcoderio, mehulmpt, bensenescu, precisox, akintola_steve) | x.com | Social posts | Breadcrumb trail pointing at the resource batch evaluated below | evaluated — see rows below | Post content was supplied as the batch in this table | No further action on the links themselves |
| free-for-dev (`ripienaar`) | https://github.com/ripienaar/free-for-dev | Repo — list | Curated free-tier SaaS/PaaS/IaaS list | reference-only | Sourcing pool, nothing to adopt itself | Consult when a project needs a free-tier infrastructure option |
| public-apis | https://github.com/public-apis/public-apis | Repo — list | Curated public API directory | reference-only | Sourcing pool | Consult when a project needs a public API |
| awesome-selfhosted | https://github.com/awesome-selfhosted/awesome-selfhosted | Repo — list | Curated self-hostable software alternatives | reference-only | Sourcing pool | Consult when a self-hosted alternative to a SaaS dependency is needed |
| awesome-claude-code (`hesreallyhim`) | https://github.com/hesreallyhim/awesome-claude-code | Repo — list | Curated skills/agents/workflows for one coding tool | reference-only, high value | Tool-specific by nature, so not adopted; worth periodic idea-checks | Re-check periodically via `audit-sources` for new command/skill ideas |
| skills (`anthropics`) | https://github.com/anthropics/skills | Repo — canonical spec | Reference implementation of the Agent Skills standard | adopt (canonical spec) | Authoritative source for the `SKILL.md` contract | Cited as the canonical spec reference in `skills/README.md` |
| awesome-mcp-servers (`punkpeye`) | https://github.com/punkpeye/awesome-mcp-servers | Repo — list | Curated MCP server directory | adopt (sourcing pool) | Direct feed when a capability gap needs a real MCP server candidate | Referenced by the tool-discovery step in `protocols/entry-protocol.md` |
| awesome-llm-apps (`Shubhamsaboo`) | https://github.com/Shubhamsaboo/awesome-llm-apps | Repo — list | 100+ open-source agent/RAG app examples | reference-only | Inspiration pool, not a structural adoption | Browse for patterns only |
| system-prompts-and-models-of-ai-tools (`x1xhlol`) | https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools | Repo — list | Collected system prompts from commercial AI tools | reference-only, use with caution | Useful for competitive awareness; provenance/licensing of leaked material is unclear | Do not copy verbatim into `ai-system` files |
| awesome-codex-skills (`composio-community`) | https://github.com/composio-community/awesome-codex-skills | Repo — list | Curated tool-specific skills | reference-only | Same role as awesome-claude-code — idea sourcing only | Re-check periodically via audit-sources |
| awesome (`sindresorhus`) | https://github.com/sindresorhus/awesome | Repo — list | Root meta-list of curated lists | reference-only | Parent index of the other `awesome-*` lists | No direct action |
| sybau.md | (no link supplied) | File | 814k+ char anti-slop design document — not provided | needs-human-input | No file or working link was supplied, only a description | Paste the file or a link; audit-sources will run it against §6 |
| OpenHands / Agent Canvas | https://github.com/OpenHands/OpenHands | Repo — app | Self-hosted control center for running coding agents across local/remote/cloud backends | reference-only, worth revisiting | Possible operator dashboard for unattended sessions | Flagged in backlog; not built against in v3 |
| mem0 (`mem0ai`) | https://github.com/mem0ai/mem0 | Repo — library | Retrieval-based long-term memory layer for agents | reference-only, future | Would add a DB dependency, conflicting with file-based-state rule | Revisit only when `memory/` files outgrow flat-file skimming |
| crewAI (`crewAIInc`) | https://github.com/crewAIInc/crewAI | Repo — framework | Multi-agent orchestration framework | reference-only | Adopting it as a dependency reintroduces vendor coupling | Study for patterns; no dependency |
| autogen (`microsoft`) | https://github.com/microsoft/autogen | Repo — framework | Multi-agent orchestration framework | reference-only | Same reasoning as crewAI | Study for patterns; no dependency |
| langflow (`langflow-ai`) | https://github.com/langflow-ai/langflow | Repo — app | Visual, node-based builder for AI workflows | reference-only | Candidate for an optional visual layer, not v3 | Noted as a future option, not built |
| gpt-researcher (`assafelovic`) | https://github.com/assafelovic/gpt-researcher | Repo — app | Autonomous research agent | reference-only | Conceptual input to a research skill | Informed `skills/research`, not a dependency |
| crawl4ai (`unclecode`) | https://github.com/unclecode/crawl4ai | Repo — library | Open-source, LLM-friendly web crawler/scraper | adopt (browsing backend) | LLM-friendly extraction, not screenshot-only | Registered browsing backend behind `visual-review` and `generate-design-md` |
| openinterpreter | https://github.com/openinterpreter/openinterpreter | Repo — app | Coding agent tuned for small/cost-efficient models | reference-only | Validates the context-tiering philosophy (Tier 1 stays small) | Cited as validation; no structural change |
| ragflow (`infiniflow`) | https://github.com/infiniflow/ragflow | Repo — app | RAG engine | reference-only, future | Real DB/retrieval dependency — deliberate future call only | Same bucket as mem0 |
| markitdown (`microsoft`) | https://github.com/microsoft/markitdown | Repo — library | Converts PDF/DOCX/PPTX/HTML/images with OCR to Markdown in one tool | adopt (approach) | Multi-format alternative to pdf-inspector; may be the single dependency the viewer needs | Candidate extraction backend; stack decides pdf-inspector vs markitdown |
| n8n (`n8n-io`) | https://github.com/n8n-io/n8n | Repo — app | Visual workflow automation, 1500+ integrations | reference-only | Could automate things around ai-system, external to the kit | Not built in v3 |
| recordly (`webadderallorg`) | https://github.com/webadderallorg/recordly | Repo — app | Open-source screen recorder/editor for demos and walkthroughs | adopt (evidence capture) | Turns a visual-QA finding into showable evidence | Registered for visual-review evidence capture |
| hyperframes (`heygen-com`) | https://github.com/heygen-com/hyperframes | Repo — app | HTML→video rendering, built for agents | adopt (lower priority) | Optional design-mock-to-walkthrough-video path | Registered; lowest priority of the four §5 tools |
| excalidraw (`excalidraw`) | https://github.com/excalidraw/excalidraw | Repo — app | Open-source whiteboard/diagramming, agent-generatable | adopt | Agents can emit `.excalidraw` JSON directly, no manual drawing | Registered for architecture sketches and UI-review annotation |
| ASD-STE100 | (standard — no repo) | Standard | Simplified Technical English: 53 rules, ~900 approved words, one meaning per word | adopt (style rule) | One meaning per word keeps agent-authored docs cheap to re-read | Added as the documentation-style addendum to engineering principles |
| CLI self-improve pattern | (practice — no repo) | Practice | Give the agent a CLI over the app; let it extend that CLI itself | adopt | Lets agents verify end-to-end instead of reasoning from code alone | Became engineering principle §24 |
| openseo | https://www.producthunt.com/products/openseo | Product page | Unknown — not reachable from the audit session | needs-human-input | producthunt.com not on the allowed network list | Paste a description and audit-sources will assess fit |

---

## How to Use

- **Before hand-work:** if a task needs browsing, PDF text extraction, a design-reference check, or a similar registered capability, check this table and the matching `tools/integrations/*.md` first.
- **Appending:** run `commands/audit-sources.md` with the new links in the `Directive:`. It appends rows here; adopted resources also get a doc in `tools/integrations/`.
- **One-line rule:** a row longer than one line belongs in that resource's integration doc, referenced from here, not inlined.
- **Tier rule:** this file is Tier 3 (on-demand). Row history older than the most recent entries is Tier 4 — read it only when a specific history question demands it.