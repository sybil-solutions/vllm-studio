# Changelog

## v1.11.0 (2026-02-07)

### Highlights
- **Frontend**: New Recipes, Usage, and Logs pages; improved Configs connection flow; Discover UI improvements; better chat UX (artifacts viewer, agent files panel + previews + versions, mobile results drawer, toast stack).
- **Controller**: Agent runtime refactor (SSE streaming + persistence + system prompt builder + modular tool registries), improved runtime/process utilities, download helpers, usage backends (SQLite + Postgres), and log retention utilities.
- **Swift client**: Feature re-org for Chat (detail/list/agent/parsing), plus new/expanded Logs, Recipes, and Usage views.
- **Ops/docs**: Repo hygiene updates (.gitignore + workflows) and documentation refresh; removed environment-specific endpoints from docs.

### Not New
- No new required environment variables: additions (like mock inference) are optional.
- No intentional breaking changes to the OpenAI-compatible API surface.

## v1.10.0 (2026-02-05)

### Bug Fixes
- **Multi-turn agent failures**: Fixed "Error in input stream" on follow-up messages after agent file tool usage. `buildToolResults()` now produces placeholder results for agent FS tools to keep message history structurally valid for the OpenAI API.
- **Chat titles stuck on "New Chat"**: Title generation now extracts reasoning content as fallback when no text content exists, and no longer requires assistant content to trigger.
- **Agent files enabled across runs**: Persist agent file state so tools remain available on subsequent turns.
- **Agent UTF-8 stream**: Clean malformed UTF-8 sequences from agent streaming output.

### Features
- **Activity panel overhaul**: Tool categorization (file/search/plan/web/code) with distinct colored icons, inline state badges, turn summaries with tool counts, auto-collapsing completed turns.
- **Thinking snippet in status bar**: Show live reasoning preview during agent turns.
- **Optimized chat rendering**: Reduce unnecessary re-renders in conversation view.
- **Agent files panel**: Enhanced file viewer with version history navigation.
- **Chat UX improvements**: Collapsible tool calls, better error handling, unified resizable sidebar.

### Chores
- Context panel and sidebar activity styling refinements
- Stall detection effect dependency stabilization
- Activity turn label corrections
