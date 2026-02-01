<!-- CRITICAL -->
# improve.md - Concrete Fix Plan (Parity + Standardization)

This is an actionable, verification-first plan to bring vllm-studio back into sync with:
1) AI SDK best practices (web)
2) OpenAI-compatible message/tool calling semantics
3) A standard session + trace methodology suitable for multi-turn tool calling

Date: 2026-02-01

---

## 0) Executive intent (what we are fixing)

Symptoms we must eliminate:
- Data is rewritten in too many places (LiteLLM callback, controller proxy, web client, iOS client).
- Session persistence is not uniform (web stores tool results inside assistant message; iOS stores separate tool messages but loses linkage).
- Parsing is "inline everywhere" (ad-hoc, untested, inconsistent), so debugging is non-reproducible.
- Feature parity: web and iOS do not implement the agent loop the same way (deep research/plan/tools/results).

Core engineering objective:
- Define ONE canonical agent loop and ONE canonical session trace format.

---

## 1) North-star architecture choices (decisions we must lock)

These are required decisions; the work below assumes them:

| Decision | Current state | Target state | Why |
|---|---|---|---|
| Agent loop ownership | client-owned (web via AI SDK, iOS manual) | controller-owned | guarantees parity; single debuggable control plane |
| Source of truth | mixed (UIMessage state + DB + toolResultsMap + iOS meta) | append-only run event log in controller | replay/debug; deterministic persistence |
| Tool result representation | web: inside assistant tool_calls/parts; iOS: separate tool messages | canonical tool_calls + tool_results tables/events | stable linkage via tool_call_id; consistent across clients |
| Parsing/normalization | duplicated across Python/TS/Swift | one "parser factory" in controller with tests | removes slop; reproducible fixes |
| Streaming protocol to clients | UIMessage stream (web) vs OpenAI SSE (iOS) | typed run-event SSE (both) + optional UIMessage projection for web | thin clients; parity; observability |

If we do not make these choices, parity will remain a moving target.

---

## 2) Success criteria (measurable)

| Area | Pass condition |
|---|---|
| Traceability | For any session id, we can reconstruct: (a) every model step request, (b) every tool call + args + tool_call_id, (c) every tool result + error flag + duration, (d) the exact assistant text produced, (e) token usage per step. |
| Parity | Given the same session history + settings, web and iOS produce identical tool-call sequences (up to nondeterminism) and store tool traces in the same shape. |
| Single parser | There is exactly one place where we parse tool calls from text, and it has regression tests with captured provider outputs. |
| Debuggability | There is a single endpoint and UI view that shows a step-by-step timeline of a run (events). |
| Migration | Existing sessions remain readable; compaction still works; old tool traces are preserved where possible. |

---

## 3) Work plan (phased, verifiable)

The plan is written to be executed top-to-bottom. Each phase ends with verification steps.

### Phase 0 - Add visibility without behavior changes (instrument-first)

Goal: make the current system observable before we refactor it.

| Task ID | Change | Files | Verification |
|---|---|---|---|
| P0-01 | Add request correlation ids (`request_id`, `session_id`, `run_id`) to controller logs and SSE events | `controller/src/http/app.ts`, `controller/src/routes/*` | `bun test`; manual: observe consistent ids across `/events` messages |
| P0-02 | Add a "raw provider stream capture" debug mode for `/v1/chat/completions` | `controller/src/routes/proxy-debug.ts`, `controller/src/services/proxy-streamer-debug.ts` | manual: compare raw vs transformed stream; confirm diff is visible |
| P0-03 | Add "chat trace export" endpoint returning current DB session + normalized tool trace | `controller/src/routes/chats.ts`, new `controller/src/services/chat-trace.ts` | manual: `GET /chats/:id/trace` returns stable JSON |
| P0-04 | Fix documentation drift (root README/CLAUDE.md still reference a Python controller) | `README.md`, `CLAUDE.md` | manual: docs match actual Bun/TS layout |

Notes:
- This phase is about visibility only; do not attempt to unify behavior yet.

### Phase 1 - Fix persistence contracts (tool_call_id and tool results)

Goal: make tool results reconstructable from the DB, regardless of client.

| Task ID | Change | Files | Verification |
|---|---|---|---|
| P1-01 | Extend `chat_messages` schema to store `tool_call_id` and `name` (for tool role messages) | `controller/src/stores/chat-store.ts` | unit test: insert tool message and read back fields |
| P1-02 | Update `/chats/:id/messages` to accept and store `tool_call_id` and `name` | `controller/src/routes/chats.ts` | iOS: tool messages persist and reload with tool_call_id intact |
| P1-03 | Add `tool_results` first-class table OR standardize on `tool_calls[].result` everywhere (pick one) | `controller/src/stores/chat-store.ts` + new store | tests: tool call + tool result linkage survives reload |
| P1-04 | Define a canonical "StoredMessage" JSON schema and validate incoming payloads (Zod) | `controller/src/routes/chats.ts` | invalid payloads produce 400; valid payload round-trips |

Implementation note:
- If we keep `tool_calls[].result` as the only representation, then iOS must stop writing `role=tool` messages and instead patch the assistant tool_calls (hard in Swift without UIMessage protocol). That is why a `tool_results` table is the cleaner universal solution.

### Phase 2 - Consolidate parsing into a controller "parser factory"

Goal: eliminate duplicated parsing and make fixes testable.

| Task ID | Change | Files | Verification |
|---|---|---|---|
| P2-01 | Create `controller/src/llm/parser-factory.ts` with explicit provider adapters | new files under `controller/src/llm/` | unit tests pass; no behavior change initially (shadow mode) |
| P2-02 | Move TS parsing functions into parser factory (think tags, MCP XML, malformed tool_calls, utf8 cleanup) | move code from `controller/src/services/proxy-parsers.ts` | regression tests using captured streams |
| P2-03 | Align MCP naming: always emit function names as `server__tool` for MCP tool calls | parser factory + `proxy-parsers` replacement | tests: MCP XML -> tool_calls[].function.name includes server prefix |
| P2-04 | Define "normalization stages" (exactly once) and remove double-normalization | controller proxy streamer; optionally LiteLLM callback | manual: show only one stage active (toggle) |

Decision checkpoint:
- Either remove `config/tool_call_handler.py` parsing logic, or reduce it to the minimum required for LiteLLM routing.
- The controller should be the canonical normalizer if the controller is the canonical agent runtime.

### Phase 3 - Implement a controller-owned agent runtime endpoint

Goal: one agent loop for all clients.

Proposed API surface:
- `POST /chats/:sessionId/turn` with `{ input, model, tools, settings }`
- returns `run_id`
- `GET /chats/:sessionId/runs/:runId/stream` SSE of typed events

| Task ID | Change | Files | Verification |
|---|---|---|---|
| P3-01 | Add run tables: `agent_runs`, `agent_run_events`, `agent_tool_executions` | new store(s) in `controller/src/stores/` | migration tests; `bun test` |
| P3-02 | Implement server-owned tool loop: call model, detect tool calls, execute MCP tools, persist tool results, continue | `controller/src/services/agent-runtime.ts` | deterministic replay from stored events |
| P3-03 | Emit typed SSE events per run (delta/tool_call/tool_result/usage) | `controller/src/routes/*` | UI can render from stream; events persist |
| P3-04 | Add "projection" helper: derive `chat_messages` rows from run events (for backwards compatibility) | `controller/src/services/run-projections.ts` | existing `/chats/:id` still works |

This phase is the parity unlock: once web and iOS both call the same endpoint, their loops match by definition.

### Phase 4 - Migrate clients to the new runtime (parity)

Goal: thin clients, same behavior.

| Task ID | Change | Files | Verification |
|---|---|---|---|
| P4-01 | Web: replace client-owned tool loop with run-event stream rendering | `frontend/src/app/chat/**` | compare: same tools + same results persisted; no missing tool results on reload |
| P4-02 | iOS: replace manual loop with run-event stream consumption | `swift-client/sources/features/chat/chat-detail-stream.swift` | iOS no longer posts tool messages; it renders from run events |
| P4-03 | Deprecate `/api/chat` for agent mode (or keep only as legacy single-step) | `frontend/src/app/api/chat/route.ts` | stable behavior with/without legacy |

### Phase 5 - Delete duplicated logic (pay down slop)

Goal: enforce "one way to do it".

| Task ID | Delete/Replace | Files | Verification |
|---|---|---|---|
| P5-01 | Remove LiteLLM callback tool parsing if controller now owns normalization | `config/tool_call_handler.py`, `config/litellm.yaml` | tool calls still work; MCP models still supported via controller |
| P5-02 | Remove controller proxy SSE rewriting where it is no longer needed | `controller/src/services/proxy-streamer.ts` | only adapter layer remains (if any) |
| P5-03 | Remove iOS thinking/tool parsers that are now projections | `swift-client/...` | app still renders reasoning and tools |

---

## 4) Concrete "exact changes" table (by problem)

This is the shortest path to fixing the worst debugging blockers first.

| Problem | Current behavior | Exact change | Files to edit | Expected outcome |
|---|---|---|---|---|
| Tool results cannot be linked to tool calls (iOS) | controller drops `tool_call_id` | add `tool_call_id` column + read/write it | `controller/src/stores/chat-store.ts`, `controller/src/routes/chats.ts` | sessions can show tool results per tool call |
| MCP tool names inconsistent | TS parser drops server name | parse MCP XML to `server__tool` | `controller/src/services/proxy-parsers.ts` (or new parser factory) | same tool name across web/iOS |
| Reasoning normalization happens in multiple layers | `<think>` stripped/rewritten multiple times | pick one normalization stage; remove others | LiteLLM callback vs controller proxy streamer vs clients | stable reasoning channel, fewer edge bugs |
| Compaction uses different backend path | compaction calls `:8000`, chat calls `:4100` | route compaction through the same provider path and parser | `controller/src/services/chat-compaction.ts` | consistent behavior + easier debugging |
| Persistence races (web tool outputs) | AI SDK mutates message after onFinish | stop client-owned loop or persist via run events | `frontend/src/app/chat/**` | tool traces never missing on reload |

---

## 5) Test strategy (must exist before refactors get large)

| Test type | What it covers | Where |
|---|---|---|
| Parser regression tests | Given raw provider chunks/content, expected normalized `tool_calls` and `reasoning_content` | `controller/tests/parser-*.test.ts` |
| Store round-trip tests | Persist a session with tool calls/results and read back; ensure linkage | `controller/tests/chat-store-*.test.ts` |
| Contract tests (client <-> controller) | JSON schema compatibility for StoredMessage/RunEvent | `controller/tests/contracts-*.test.ts` + fixtures used by web/iOS |
| E2E smoke | Start stack, run one tool-calling conversation, verify DB contains trace | script under `scripts/` |

---

## 6) References (standards to keep us honest)

- AI SDK: https://ai-sdk.dev/docs/introduction
- OpenAI tool calling + streaming: https://platform.openai.com/docs/api-reference/chat
- MCP: https://modelcontextprotocol.io/
- LiteLLM callbacks: https://docs.litellm.ai/
