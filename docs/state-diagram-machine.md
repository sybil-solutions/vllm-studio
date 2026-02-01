<!-- CRITICAL -->
# state-diagram-machine.md - Current vs Ideal Diagrams (Visibility Pack)

This file is a "diagram bank" for the system: architecture, state machines, sequence diagrams, and diff views.

Goal: make the current agent loop and session system visually inspectable, and make the target (ideal) design unambiguous.

Date: 2026-02-01

---

## 0) Diagram index

- A1. Current architecture (web + controller + litellm + inference)
- A2. Current architecture (iOS + controller)
- A3. Ideal architecture (single agent runtime)
- S1. Current web agent loop (AI SDK tool loop)
- S2. Current iOS agent loop (manual loop)
- S3. Ideal agent loop (server-owned, event-sourced)
- S4. Session lifecycle (current)
- S5. Session lifecycle (ideal)
- D1. Parsing/normalization locations (current)
- D2. Data contracts (ideal)
- Q1. "Where did my data change?" checklist map

---

## A1) Current architecture (web)

```mermaid
flowchart TB
  subgraph Browser["Browser (Next.js client)"]
    UI["Chat UI (AI SDK useChat)"]
    Z["Zustand stores (messages/tools/results)"]
  end

  subgraph Next["Next.js server"]
    ApiChat["POST /api/chat (AI SDK streamText -> UIMessage stream)"]
    ApiProxy["/api/proxy/* (reverse proxy -> controller)"]
  end

  subgraph Controller["Controller :8080 (Bun/TS)"]
    Proxy["POST /v1/chat/completions (proxy -> LiteLLM)"]
    Chats["/chats + chats.db (sessions/messages)"]
    MCP["/mcp + controller.db (servers)"]
    AgentFiles["/chats/:id/files + agentfs/<id>.db"]
    Events["/events (SSE event bus)"]
  end

  subgraph LiteLLM["LiteLLM :4100"]
    LProxy["POST /v1/chat/completions"]
    Callback["Python callback: tool_call_handler.py"]
  end

  subgraph Inference["Inference :8000"]
    V1["/v1/chat/completions"]
  end

  UI --> Z
  UI -->|stream model response| ApiChat --> Proxy --> LProxy --> V1
  UI -->|persist + load sessions| ApiProxy --> Chats
  UI -->|tool execution| ApiProxy --> MCP
  UI -->|agentfs| ApiProxy --> AgentFiles
  UI -->|subscribe| ApiProxy --> Events

  Callback -. modifies .- LProxy
```

Notes:
- Web inference streaming is "front-end owned": tool calls emitted to browser; browser executes tools; browser resends.
- Persistence is done out-of-band via controller (`/chats/...`), not by the inference route.

---

## A2) Current architecture (iOS)

```mermaid
flowchart TB
  subgraph iOS["swift-client (iOS)"]
    V["ChatDetailViewModel.streamTurn() (manual tool loop)"]
    OAI["OpenAIChatService (SSE parser)"]
    S["SettingsStore (UserDefaults)"]
  end

  subgraph Controller["Controller :8080"]
    Proxy["/v1/chat/completions"]
    Chats["/chats (sessions/messages)"]
    MCP["/mcp (tools)"]
  end

  subgraph LiteLLM["LiteLLM :4100"]
    LProxy["/v1/chat/completions"]
  end

  subgraph Inference["Inference :8000"]
    V1["/v1/chat/completions"]
  end

  V -->|build prompt| OAI -->|SSE| Proxy --> LProxy --> V1
  V -->|persist| Chats
  V -->|exec tools| MCP
  V --> S
```

Notes:
- iOS calls controller directly for both inference and persistence.
- iOS stores tool results as separate tool messages; controller schema currently loses tool_call_id linkage.

---

## A3) Ideal architecture (single agent runtime, shared contract)

Principle: **the controller owns the agent loop**. Clients become thin renderers + input providers.

```mermaid
flowchart TB
  subgraph Clients["Clients"]
    Web["Web UI"]
    iOS["iOS UI"]
    CLI["CLI (optional)"]
  end

  subgraph Controller["Controller :8080 (Agent Runtime)"]
    AgentAPI["POST /agent/runs (or /chats/:id/turn)"]
    StreamAPI["GET /agent/runs/:id/stream (SSE)"]
    Store["Session + Trace Store (SQLite)"]
    ToolExec["Tool Executors (MCP, AgentFS, synthetic tools)"]
    Parser["Parser factory (tool calls + reasoning + provider quirks)"]
  end

  subgraph Providers["Providers"]
    Gateway["LiteLLM (optional)"]
    Inference["vLLM/SGLang/etc"]
  end

  Web --> AgentAPI
  iOS --> AgentAPI
  CLI --> AgentAPI

  Web --> StreamAPI
  iOS --> StreamAPI
  CLI --> StreamAPI

  AgentAPI --> Store
  AgentAPI --> Parser
  AgentAPI --> Gateway
  Gateway --> Inference
  AgentAPI --> ToolExec
  ToolExec --> Store
  StreamAPI --> Store
```

Key changes vs current:
- One canonical stream protocol for agent runs (SSE of typed events).
- One canonical persistence schema for tool calls/results and model steps.
- "Parser factory" lives in one place, versioned and tested.

---

## S1) Current web agent loop (AI SDK tool loop, client-owned)

```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> UserSubmitted: user clicks Send
  UserSubmitted --> Streaming: POST /api/chat

  Streaming --> ToolCallEmitted: model emits tool call part
  ToolCallEmitted --> ToolExecuting: browser executes MCP / local tool
  ToolExecuting --> ToolOutputInjected: addToolOutput(toolCallId,...)

  ToolOutputInjected --> AutoResubmit: sendAutomaticallyWhen(...)
  AutoResubmit --> Streaming: POST /api/chat (next step)

  Streaming --> Completed: stream finish (no tool calls)
  Completed --> Idle

  note right of ToolOutputInjected
    Persistence is tricky: AI SDK mutates\nassistant message after onFinish.\nFollow-up persistence required.
```

Observed pain points:
- Two sources of truth: in-memory UIMessage vs controller stored messages.
- Tool results persistence is delayed and can be missed (race/edge cases).

---

## S2) Current iOS agent loop (manual loop, client-owned)

```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> PersistUser: POST /chats/:id/messages (role=user)
  PersistUser --> LLMRequest: POST /v1/chat/completions (stream=true)
  LLMRequest --> Streaming

  Streaming --> PersistAssistant: POST /chats/:id/messages (role=assistant)

  PersistAssistant --> HasToolCalls: tool_calls != empty
  PersistAssistant --> Done: tool_calls empty

  HasToolCalls --> ExecutePlanTools: local only
  HasToolCalls --> ExecuteMCP: POST /mcp/tools/:server/:tool
  ExecutePlanTools --> PersistToolMsgs: POST /chats/:id/messages (role=tool)
  ExecuteMCP --> PersistToolMsgs
  PersistToolMsgs --> LLMRequest

  Done --> Idle
```

Observed pain points:
- Tool messages depend on `tool_call_id`, but controller schema drops it.
- The same parsing rules (reasoning/tool calls) are reimplemented in Swift and TS and LiteLLM.

---

## S3) Ideal agent loop (server-owned, event-sourced)

We want a single loop for all clients.

```mermaid
stateDiagram-v2
  [*] --> Ready

  Ready --> TurnStarted: POST /chats/:id/turn
  TurnStarted --> PersistedInput: store user message + attachments + settings
  PersistedInput --> LLMStreaming: start model stream

  LLMStreaming --> ToolCallsDetected: tool call event(s)
  ToolCallsDetected --> ToolExec: run tools (MCP/AgentFS/local)
  ToolExec --> PersistToolResults: store tool results with tool_call_id
  PersistToolResults --> LLMStreaming: next model step

  LLMStreaming --> PersistedAssistant: assistant message complete
  PersistedAssistant --> Ready

  note right of LLMStreaming
    Controller emits typed SSE events:\n- token deltas\n- reasoning deltas\n- tool_call\n- tool_result\n- step_start/step_end\n- usage\n- errors
```

This design makes:
- persistence deterministic
- replay/debug possible (event log)
- client logic minimal

---

## S4) Session lifecycle (current)

```mermaid
stateDiagram-v2
  [*] --> NoSession

  NoSession --> SessionCreated: POST /chats
  SessionCreated --> Active
  Active --> MessageUpserted: POST /chats/:id/messages (many times)
  MessageUpserted --> Active

  Active --> Forked: POST /chats/:id/fork
  Forked --> Active

  Active --> Compacted: POST /chats/:id/compact
  Compacted --> Active

  Active --> Deleted: DELETE /chats/:id
  Deleted --> NoSession
```

Weakness:
- "Message" is overloaded: can represent UI text, tool calls, tool results, metadata, partial traces.
- Tool traces are not first-class and differ by client.

---

## S5) Session lifecycle (ideal)

Introduce explicit "runs" / "turns" and keep a stable session id.

```mermaid
stateDiagram-v2
  [*] --> NoSession

  NoSession --> SessionCreated: create session
  SessionCreated --> Active

  Active --> TurnCreated: create a run/turn
  TurnCreated --> TurnStreaming
  TurnStreaming --> TurnCompleted
  TurnCompleted --> Active

  Active --> Forked: fork creates new session id
  Forked --> Active

  Active --> Compacted: compaction creates new session id + link
  Compacted --> Active

  Active --> Deleted
  Deleted --> NoSession
```

In ideal, a session is:
- stable id
- a sequence of turns/runs
- each run has an event log (tool calls/results included)

---

## D1) Parsing/normalization locations (current)

```mermaid
flowchart TB
  subgraph Providers["Provider quirks"]
    Q1["<think> tags"]
    Q2["MCP XML tool calls"]
    Q3["malformed tool_calls (empty names)"]
    Q4["utf8 streaming corruption"]
  end

  subgraph LiteLLM["LiteLLM (Python callback)"]
    L1["parse think tags"]
    L2["parse tool calls from content"]
    L3["convert server+tool -> server__tool"]
    L4["strip tool xml from content"]
  end

  subgraph Controller["Controller proxy (TS)"]
    C1["parse think tags (again)"]
    C2["parse tool calls from content (again)"]
    C3["fix malformed tool_calls (again)"]
    C4["clean utf8 corruption"]
  end

  subgraph Web["Web client"]
    W1["normalize tool args (AI SDK version drift)"]
    W2["strip thinking for context view"]
  end

  subgraph iOS["iOS client"]
    I1["parse SSE chunks"]
    I2["parse/strip thinking blocks"]
    I3["assemble tool args by index"]
  end

  Providers --> LiteLLM --> Controller --> Web
  Providers --> LiteLLM --> Controller --> iOS
```

Takeaway:
- We have no single source of truth for normalization.
- Fixes are scattered and partially redundant.

---

## D2) Data contracts (ideal)

Define a small number of canonical artifacts:

```mermaid
flowchart LR
  Input["UserInput\n(text, attachments, settings)"]
  Run["AgentRun\n(id, session_id, created_at, model, system)"]
  Events["RunEvents (append-only)\n(step_start, delta, tool_call, tool_result, usage, error, step_end)"]
  Messages["Derived Messages\n(user/assistant/tool)"]
  UI["Clients render from Events + Derived Messages"]

  Input --> Run --> Events --> Messages --> UI
  Events --> UI
```

Rule:
- "Messages" are a projection. The event log is the source of truth.

---

## Q1) "Where did my data change?" checklist map

When debugging a bad interaction, check in this order:

1) Provider output: did the model actually emit `tool_calls`, or did it emit tool XML in `content`?
2) LiteLLM callback: did it convert MCP tool calls -> `server__tool`? Did it strip XML? Did it touch `<think>`?
3) Controller proxy: did `createProxyStream()` rewrite `reasoning`/`tool_calls` or inject prompts?
4) Client parser:
   - Web: AI SDK parts and `onToolCall` args normalization
   - iOS: SSE decoding and tool buffer assembly
5) Persistence: what exactly got written to `data/chats.db`:
   - does the assistant message have `tool_calls[]`?
   - do we have the tool results trace (and is it linked)?

