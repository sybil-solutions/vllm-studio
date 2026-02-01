<!-- CRITICAL -->
# sessions.md - Session, Trace, and Tool-Call Storage (Current vs Standard)

This document answers:
1) How we store conversational/session data TODAY (controller + web + iOS).
2) Why parity and debugging are breaking (missing linkage + multiple representations).
3) How modern coding-agent harnesses (Codex CLI, Claude Code) store sessions/traces.
4) The recommended "standard" storage model for vllm-studio moving forward.

Date: 2026-02-01

---

## 0) Terminology (we must standardize)

- Session: durable container for a conversation (stable id, title, created_at).
- Turn: one user input to the agent (can involve multiple model steps + tool calls).
- Step: one model call/response pair within a turn.
- Tool call: model request to execute a tool (tool_call_id + tool name + arguments).
- Tool result: the output of executing a tool (references tool_call_id).
- Trace/event: an immutable log record that describes what happened (for replay/debug).

If we do not introduce at least "turn" and "tool_result" as first-class concepts, parity and debugging will continue to degrade.

---

## 1) Current storage in this repo

### 1.1 Controller: chat sessions/messages (SQLite)

Location:
- `data/chats.db`

Defined in:
- `controller/src/stores/chat-store.ts`

Tables:
- `chat_sessions`
  - `id TEXT PRIMARY KEY`
  - `title TEXT`
  - `model TEXT`
  - `parent_id TEXT`
  - `agent_state TEXT` (JSON)
  - `created_at`, `updated_at`
- `chat_messages`
  - `id TEXT PRIMARY KEY`
  - `session_id TEXT`
  - `role TEXT` (free-form string)
  - `content TEXT`
  - `model TEXT`
  - `tool_calls TEXT` (JSON string)
  - `parts TEXT` (JSON string; web AI SDK UIMessage parts)
  - `metadata TEXT` (JSON string; web AI SDK UIMessage metadata)
  - token columns (`request_*`)
  - `created_at`

Key limitations:
- There is no `tool_call_id` column for tool role messages.
- There is no first-class `tool_results` table.
- There is no first-class `turn` or `run` concept; messages are the only durable log.

### 1.2 Controller: agent filesystem (AgentFS)

Location:
- per session sqlite db: `data/agentfs/<sessionId>.db`

Code:
- `controller/src/services/agent-fs-store.ts`
- `controller/src/routes/agent-files.ts`

Notes:
- AgentFS is already evented via controller `/events` (file write/read/delete/move events).
- AgentFS is not yet represented as part of a run trace (it is a parallel system).

### 1.3 Controller: MCP servers (SQLite)

Location:
- `data/controller.db`

Code:
- `controller/src/stores/mcp-store.ts`

Notes:
- Tool execution is observable via controller SSE events (`mcp_tool_called`), but tool execution is not linked to a specific session/message/tool_call_id in a durable schema.

### 1.4 Frontend: what it persists

The web client persists:
- user and assistant messages to `data/chats.db`
- tool calls and tool outputs embedded inside the assistant message:
  - tool calls are extracted from AI SDK message parts
  - tool results are captured via `addToolOutput()` and persisted on a follow-up pass

Code:
- `frontend/src/app/chat/hooks/use-chat-transport.ts` (`persistMessage`)
- `frontend/src/app/chat/_components/layout/chat-page.tsx` (post-tool persistence effect)

### 1.5 iOS: what it persists

iOS persists:
- user messages to `/chats/:id/messages`
- assistant messages to `/chats/:id/messages`
- tool results as separate `role="tool"` messages with `tool_call_id`

Code:
- `swift-client/sources/features/chat/chat-detail-stream.swift`
- `swift-client/sources/features/chat/mcp-tool-runner.swift`

Critical mismatch:
- Controller currently ignores/drops `tool_call_id` on message insert.
- Therefore iOS tool result messages cannot be linked to the originating tool call after reload.

---

## 2) How modern coding-agent harnesses store sessions/traces (2025-2026 patterns)

The key pattern across serious coding agents is:

"Store a session transcript as an append-only event log with stable IDs, typically JSONL."

### 2.1 OpenAI Codex CLI (storage patterns)

Observed artifacts in Codex CLI docs and issue reports:
- Config home: `$CODEX_HOME` (default `~/.codex`)
- Local history file: `history.jsonl` under `$CODEX_HOME` (stores conversation-like records)
- Per-session logs: JSONL files under a date-based path such as:
  - `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`

Why this matters:
- JSONL event logs make replay and debugging straightforward:
  - you can inspect exactly what tool calls ran, what outputs they produced, and what the model saw next.

References:
- Codex CLI docs: https://developers.openai.com/codex/cli
- Codex CLI config: https://developers.openai.com/codex/cli/config
- Codex CLI advanced config: https://developers.openai.com/codex/cli/config-advanced
- Codex CLI issue discussing session JSONL location: https://github.com/openai/codex/issues/2288

### 2.2 Anthropic Claude Code (storage patterns)

Observed artifacts in Claude Code docs and issue reports:
- Session resume is a first-class concept (resume by session id).
- CLI supports structured output formats suitable for event logging (e.g., "stream-json").
- Local per-project JSONL files are used, typically in a directory like:
  - `~/.claude/projects/<project-name>/<session-id>.jsonl`

References:
- Claude Code settings docs: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/settings
- Claude Code issue referencing JSONL transcript location: https://github.com/anthropics/claude-code/issues/905
- Claude Code issue referencing per-project JSONL sessions: https://github.com/anthropics/claude-code/issues/1165

### 2.3 Takeaway for vllm-studio

If we want "Codex/Claude-level" debuggability, we need:
- stable session + run ids
- append-only run event logs
- first-class tool execution records linked by tool_call_id

Messages alone are not sufficient as a trace primitive.

---

## 3) Recommended session storage model for vllm-studio (ideal)

### 3.1 Canonical concept model

We should explicitly model:

- `session`
  - metadata: title, created_at, updated_at, parent/fork references
  - "mode": agent-enabled, etc
  - persisted settings snapshot (model, system prompt, tool enable flags)

- `run` (or `turn`)
  - a single user input + the agent work it triggered
  - may include multiple steps (tool loop rounds)

- `run_event` (append-only)
  - the actual source of truth for replay/debug

- `tool_execution`
  - normalized record for tool calls and results

### 3.2 Proposed SQLite schema (concrete)

This is a suggested schema, designed to:
- keep current `/chats/:id` working via projection
- add first-class traceability

```sql
-- Sessions remain stable.
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Chat',
  model TEXT,
  parent_id TEXT,
  agent_state TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Runs/turns: one user input -> one agent run.
CREATE TABLE IF NOT EXISTS chat_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message_id TEXT,
  model TEXT,
  system TEXT,
  toolset_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Append-only event stream for a run.
CREATE TABLE IF NOT EXISTS chat_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,          -- e.g., step_start, delta, tool_call, tool_result, usage, error, step_end
  data TEXT NOT NULL,          -- JSON payload (redacted policy)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(run_id) REFERENCES chat_runs(id) ON DELETE CASCADE,
  UNIQUE(run_id, seq)
);

-- First-class tool execution records.
CREATE TABLE IF NOT EXISTS chat_tool_executions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tool_call_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,     -- canonical: server__tool
  tool_server TEXT,
  arguments_json TEXT NOT NULL,
  result_text TEXT,
  is_error INTEGER NOT NULL DEFAULT 0,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  FOREIGN KEY(run_id) REFERENCES chat_runs(id) ON DELETE CASCADE,
  UNIQUE(run_id, tool_call_id)
);
```

Projection compatibility:
- Continue storing `chat_messages` during migration, but treat it as a projection.
- Long term: derive `chat_messages` from `chat_run_events` rather than writing it directly.

### 3.3 Canonical run events (example)

We want event types that match what humans debug:

```json
{ "type": "turn_started", "session_id": "...", "run_id": "...", "user_message_id": "..." }
{ "type": "step_started", "run_id": "...", "step": 1, "provider": "litellm", "model": "..." }
{ "type": "delta", "channel": "content", "text": "Hello" }
{ "type": "delta", "channel": "reasoning", "text": "I should call a tool..." }
{ "type": "tool_call", "tool_call_id": "call_123", "tool_name": "exa__search", "arguments": { "q": "..." } }
{ "type": "tool_result", "tool_call_id": "call_123", "content": "...", "is_error": false, "duration_ms": 842 }
{ "type": "usage", "input_tokens": 1234, "output_tokens": 456, "total_tokens": 1690 }
{ "type": "step_finished", "finish_reason": "stop" }
{ "type": "turn_finished", "status": "success" }
```

This structure supports:
- replay
- UI timeline rendering
- parity across clients
- precise bug reports ("tool_call parsed wrong at seq=17")

### 3.4 Redaction + privacy policy (required)

If we store raw request/response payloads:
- we must implement redaction at write-time
- we must store only what is needed to reproduce/debug

Recommended:
- store full tool arguments (often needed for debugging)
- store tool results (possibly truncated with an overflow pointer)
- optionally store model request messages (with a redaction/secret scanner)

---

## 4) What to change immediately (minimum viable session correctness)

If we are not ready for full runs/events yet, we still must fix the biggest parity bug:

1) Persist `tool_call_id` for tool messages.
2) Persist tool results in a consistent way across web and iOS.

Minimal patch path:
- Add columns `tool_call_id TEXT` and `name TEXT` to `chat_messages`.
- Update controller `/chats/:id/messages` to accept and store them.
- Update iOS to set `name` on tool messages and ensure `tool_call_id` is always sent.

This buys us:
- tool trace reconstructability
- the ability to migrate to run-events later without losing historical data

---

## 5) References (standards and exemplars)

- AI SDK docs (web streaming/tools): https://ai-sdk.dev/docs/introduction
- OpenAI API reference (chat completions + tools): https://platform.openai.com/docs/api-reference/chat
- OpenAI Codex CLI docs: https://developers.openai.com/codex/cli
- Claude Code settings/docs: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/settings
- MCP spec: https://modelcontextprotocol.io/

