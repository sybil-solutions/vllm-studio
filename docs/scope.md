<!-- CRITICAL -->
# scope.md - Methodology for De-slopping the Agent/System Architecture

This document defines the methodology we follow to turn the current multi-loop, multi-parser system into a rational, testable, standardized architecture.

Date: 2026-02-01

---

## 0) Problem statement (why we need scope)

We are currently in a state where:
- The "agent loop" is implemented in multiple clients (web AI SDK, iOS manual loop).
- Tool calls and reasoning are parsed/normalized in multiple layers (LiteLLM callback, controller proxy, clients).
- Sessions are persisted differently per client, causing feature parity drift and making debugging non-reproducible.

Without a strict methodology, any new feature (new tool, new model provider quirk, new UI) increases entropy.

---

## 1) Scope (in)

In-scope changes include:

1) Canonical agent loop definition
   - Single "turn" protocol
   - Tool calling semantics and limits
   - Deterministic persistence of tool traces

2) Canonical data model and storage
   - Session schema with stable identifiers
   - First-class tool call + tool result linkage
   - Trace/event logs for debugging and replay

3) Canonical parsing and normalization
   - One parser factory for: tool calls, reasoning, provider quirks
   - Regression tests using captured provider outputs

4) Client parity
   - Web and iOS consume the same agent runtime API
   - Any client-side state is derived/projection only (no divergent logic)

5) Observability
   - Structured logs, correlation ids
   - Run timelines visible via API and UI

---

## 2) Scope (out)

Out-of-scope for this effort (unless explicitly added later):
- UI/UX redesign unrelated to parity/agent loop
- Model lifecycle features (launch/evict) beyond adding trace hooks
- New tool development (except where needed to move execution server-side)
- Changing providers (vLLM vs SGLang vs Tabby) beyond normalizing outputs

---

## 3) Non-negotiable principles

These principles are the guardrails that prevent re-slop:

1) Single source of truth
   - Conversation truth is an append-only event log (run events), not mutable message arrays scattered across clients.

2) One parser, versioned
   - Provider quirks are handled in one place (controller parser factory) with fixtures.

3) Stable identifiers everywhere
   - session_id, run_id, message_id, tool_call_id are mandatory and persistent.

4) Thin clients
   - Clients render and send user input. They do not implement the agent loop.

5) Backwards compatibility via projection
   - Existing endpoints (e.g., `/chats/:id`) continue to work by projecting from run events until we can deprecate.

6) Verification-first
   - Every behavior change requires a test vector or an integration script that reproduces it.

---

## 4) Standardization targets (the "external truth")

We align to:
- AI SDK semantics for tools and streaming (web): https://ai-sdk.dev/docs/introduction
- OpenAI-compatible tool calling and streaming formats: https://platform.openai.com/docs/api-reference/chat
- MCP tooling standard: https://modelcontextprotocol.io/

Important: "Aligning" does not mean "copying UX".
It means:
- our data types match the standard contracts
- our parsing follows the standard formats
- our storage preserves enough information to reconstruct the interaction

---

## 5) Implementation methodology (how we execute)

### 5.1 Work in vertical slices

Each slice must include:
- API contract (request/response + event stream)
- persistence (DB schema + migrations)
- parser coverage (fixtures + tests)
- minimal UI changes to consume and display

Avoid "horizontal refactors" that move files without delivering parity/visibility.

### 5.2 Add observability before refactoring behavior

Rule:
- If we cannot see it in logs/events/trace exports, we do not change it.

This reduces "unknown unknowns" and gives us rollback confidence.

### 5.3 Feature flags and rollback

We will use:
- server flags (env or config) to switch between legacy and new runtime endpoints
- client flags to switch between old UI loop and new streaming

Rollback must be:
- one config change
- no data loss (traces remain)

### 5.4 Compatibility window

We will maintain a compatibility window where:
- old `/api/chat` and client-owned tool loop still exists
- new controller-owned agent runtime runs in parallel

We then gradually flip defaults, and remove legacy after parity is proven.

---

## 6) Required artifacts (always updated)

These docs are living contracts:
- `docs/data.md` (data flow + types + transformation map)
- `docs/state-diagram-machine.md` (diagrams: current vs ideal)
- `docs/methods.md` (mutators map)
- `docs/improve.md` (phased plan + tasks)
- `docs/sessions.md` (storage schema + trace methodology)

If behavior changes and the doc is not updated, we treat it as incomplete work.

---

## 7) Quality gates (definition of done)

We do not merge major changes unless:
- controller typecheck passes: `cd controller && bun run typecheck`
- controller tests pass: `cd controller && bun test`
- frontend build + lint pass: `cd frontend && npm run build && npm run lint`
- iOS builds (if Swift touched): `cd swift-client && ./setup.sh && xcodebuild ... clean build`
- parser regression tests updated for any provider/format changes
- a trace export for a sample run shows tool calls/results and usage correctly

