<!-- CRITICAL -->
# methods.md - Methods that Touch Conversation Data (and how)

This document is a "map of mutators": every important function/method that reads, writes, transforms, or persists:
- chat messages
- tool calls/results
- session state
- streaming chunks
- configuration that affects any of the above

Date: 2026-02-01

Legend:
- Read = consumes data (DB, request payload, stream)
- Write = persists or emits transformed data (DB, response, events)
- Transform = rewrites shape/semantics (parsing, normalization)

---

## 1) Controller (Bun/TypeScript)

### 1.1 Session + message persistence

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `controller/src/routes/chats.ts` | `registerChatsRoutes()` | HTTP JSON bodies | `data/chats.db` via ChatStore | light (JSON parse + defaults) | Drops `tool_call_id` and `name` fields from tool messages (not read/stored). |
| `controller/src/stores/chat-store.ts` | `ChatStore.migrate()` | schema | schema | N/A | DB schema lacks tool result linkage (`tool_call_id`). |
| `controller/src/stores/chat-store.ts` | `ChatStore.addMessage()` | parameters | `chat_messages` row | JSON stringify (`tool_calls`, `parts`, `metadata`) | Upserts by message id; updates session `updated_at`. |
| `controller/src/stores/chat-store.ts` | `ChatStore.getSession()` | `chat_sessions`, `chat_messages` | response object | JSON parse (`tool_calls`, `parts`, `metadata`, `agent_state`) | Returns untyped `Record<string, unknown>`; consumers must guess shape. |
| `controller/src/stores/chat-store.ts` | `ChatStore.getUsage()` | chat_messages token columns | usage aggregate | transform totals | Uses `request_total_input_tokens` when present; else prompt tokens. |
| `controller/src/services/chat-compaction.ts` | `compactChatSession()` | session+messages (DB) | new session+messages (DB) | builds summary prompt; formats tool calls; clones messages | Calls inference backend directly on `:8000`, not LiteLLM. |

### 1.2 Tool execution (MCP)

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `controller/src/routes/mcp.ts` | `registerMcpRoutes()` | HTTP JSON bodies | tool result JSON + controller events | sanitize args | Emits `mcp_tool_called` events (success/fail + duration). |
| `controller/src/services/mcp-runner.ts` | `runMcpCommand()` | server config + stdio stream | tool result | JSON-RPC framing | Executes MCP servers via `spawn()`, `initialize`, `tools/list`, `tools/call`. |
| `controller/src/stores/mcp-store.ts` | `McpStore.save()/list()/get()` | `controller.db` | `controller.db` | JSON stringify/parse (`args`, `env`) | Seeds default Exa server using env `EXA_API_KEY`. |

### 1.3 Agent filesystem (AgentFS)

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `controller/src/services/agent-fs-store.ts` | `getAgentFs()` | session id | opens/creates sqlite file | path mapping | Creates `data/agentfs/<sessionId>.db`. |
| `controller/src/routes/agent-files.ts` | `registerAgentFilesRoutes()` | HTTP path/query + JSON | AgentFS db | normalize path; build directory tree | Publishes events: read/write/delete/move/list. |

### 1.4 Inference proxy + parsing

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `controller/src/routes/proxy.ts` | `registerProxyRoutes()` | OpenAI request body | OpenAI response (JSON or SSE) | model rewrite; prompt injection; fallback parse | Proxies to LiteLLM at `http://localhost:4100/v1/chat/completions`. |
| `controller/src/routes/proxy.ts` | `ensureModelRunning()` | recipe store + process manager | process launch/evict | N/A | Side effects: starts/stops model processes. |
| `controller/src/services/proxy-streamer.ts` | `createProxyStream()` | upstream SSE bytes | downstream SSE bytes | many per-chunk rewrites | Secondary parser layer (duplicates LiteLLM callback). |
| `controller/src/services/proxy-parsers.ts` | `parseToolCallsFromContent()` | raw content text | tool_calls array | regex parsing | MCP parsing drops server name (produces `tool_name`, not `server__tool`). |
| `controller/src/services/proxy-parsers.ts` | `parseThinkTagsFromContent()` | SSE payload | updated SSE payload | move `<think>` -> reasoning_content | Duplicates LiteLLM and clients. |
| `controller/src/services/proxy-parsers.ts` | `fixMalformedToolCalls()` | SSE payload + buffer | updated SSE payload | fill missing function names | Uses `buffer.content` regex to recover `"name"`. |
| `controller/src/services/proxy-parsers.ts` | `cleanUtf8StreamContent()` | content chunks | cleaned chunk | remove U+FFFD patterns | Model-specific streaming workaround (GLM). |

### 1.5 Token accounting and titles

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `controller/src/routes/tokenization.ts` | `/v1/tokenize-chat-completions` handler | request messages/tools | token count JSON | heuristic token counting | Falls back to `:8000/tokenize` or approximations; overhead hack. |
| `controller/src/routes/tokenization.ts` | `/api/title` handler | user+assistant excerpt | title string | prompt construction | Uses LiteLLM (`:4100`) for title generation. |

---

## 2) Frontend (Next.js + React + AI SDK)

### 2.1 Inference + streaming

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `frontend/src/app/api/chat/route.ts` | `POST()` | `UIMessage[]` | AI SDK UIMessage stream | `convertToModelMessages`; `jsonSchema` tools | Uses `stopWhen: stepCountIs(1)`; tools are definitions only (no server execution). |
| `frontend/src/app/chat/_components/layout/chat-page.tsx` | `useChat({ onToolCall })` | tool call events | `addToolOutput()` | arg normalization | Must handle AI SDK protocol drift (input/args/arguments). |
| `frontend/src/app/chat/_components/layout/chat-page.tsx` | post-tool persistence effect | `messages` state | controller message update | locate mutated tool part | Fixes AI SDK timing: tool output gets injected after `onFinish`. |

### 2.2 Session persistence mapping

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `frontend/src/app/chat/hooks/use-chat-transport.ts` | `persistMessage()` | `UIMessage` | `POST /chats/:id/messages` | parts -> `content` + `tool_calls[]` + `result` | Stores raw `parts` + `metadata` to preserve tool trace. |
| `frontend/src/app/chat/hooks/use-chat-transport.ts` | `createSessionWithMessage()` | initial UIMessage | `POST /chats` then `persistMessage()` | N/A | Creates session before first user message is stored. |

### 2.3 Tools (MCP + synthetic agent tools)

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `frontend/src/app/chat/hooks/use-chat-tools.ts` | `loadMCPTools()` | `/mcp/tools` | Zustand tool list | server filtering + name mapping | Renames to `server__tool` function names. |
| `frontend/src/app/chat/hooks/use-chat-tools.ts` | `executeTool()` | toolCallId + args | `/mcp/tools/:server/:tool` | args stringify | Stores results in `toolResultsMap` for UI + persistence. |
| `frontend/src/app/chat/hooks/use-agent-tools.ts` | synthetic tools | UI state | UI state | local execution | Plan management tools (`create_plan`, `update_plan`) live only in browser. |

### 2.4 Proxy to controller

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `frontend/src/app/api/proxy/[...path]/route.ts` | `handleRequest()` | client request | controller response | header mapping | Supports streaming pass-through; allows `X-Backend-Url` override. |
| `frontend/src/hooks/use-controller-events.ts` | `useControllerEvents()` | controller `/events` SSE | browser events + store updates | event routing | Provides visibility into controller-side changes (sessions, MCP, logs). |

---

## 3) swift-client (iOS)

### 3.1 Streaming + parsing

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `swift-client/sources/core/services/openai-chat-service.swift` | `streamChat()` | SSE bytes from `/v1/chat/completions` | in-memory streaming state | decode SSE -> StreamChunk; assemble tool args by index | Implements its own OpenAI SSE parser + tool-call reconstruction. |
| `swift-client/sources/core/services/openai-chat-service.swift` | `nonStreamingChat()` | JSON response | simulated streaming UI | reasoning/content fallback | Used as fallback when streaming decode fails. |
| `swift-client/sources/core/services/sse-parser.swift` | `SseParser` | raw lines | events | line framing | Critical to correctness; differs from AI SDK protocol. |
| `swift-client/sources/features/chat/chat-thinking-parser.swift` | `ThinkingParser` | assistant text | main vs thinking | regex parsing | Another reasoning normalization layer (in addition to controller/LiteLLM). |

### 3.2 iOS agent loop + persistence

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `swift-client/sources/features/chat/chat-detail-stream.swift` | `ChatDetailViewModel.streamTurn()` | current messages + tools list + settings | `/v1/chat/completions`, `/mcp/tools`, `/chats/:id/messages` | manual multi-round loop | Implements tool loop (max rounds=10) client-side. |
| `swift-client/sources/features/chat/mcp-tool-runner.swift` | `McpToolRunner.run()` | tool_calls list | tool result messages | parse `server__tool`; parse JSON args | Emits `role=tool` messages with `toolCallId`, but controller drops linkage. |
| `swift-client/sources/core/api/api-chat-sessions.swift` | `addMessage()` | StoredMessage | controller `/chats/:id/messages` | JSON encode snake_case | Controller currently ignores `tool_call_id` and `name`. |

### 3.3 Settings

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `swift-client/sources/core/services/settings-store.swift` | `SettingsStore` | UserDefaults | UserDefaults | N/A | Config affects agent loop (MCP enabled, plan mode, deep research). |

---

## 4) LiteLLM configuration + callback (Python)

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `config/litellm.yaml` | `litellm_settings.callbacks` | YAML | runtime behavior | N/A | Registers `tool_call_handler.proxy_handler_instance`. |
| `config/tool_call_handler.py` | `async_pre_call_hook()` | request payload | modified request payload | functions->tools; MCP models tools->prompt | Converts tool history back to MCP for certain models. |
| `config/tool_call_handler.py` | `async_post_call_success_hook()` | response object | modified response | parse think + parse tool calls + strip content | Duplicates controller parsing/normalization. |

---

## 4.5) CLI client (Bun/TypeScript)

The CLI is a client of the controller control-plane (status/recipes/lifecycle). It does not implement the chat agent loop, but it is part of "client surface area" and should remain compatible.

| File | Symbol | Read | Write | Transform | Notes |
|---|---|---|---|---|---|
| `cli/src/api.ts` | `fetchStatus()/fetchRecipes()/launchRecipe()` | controller endpoints | N/A | N/A | Uses `VLLM_STUDIO_URL` env var; defaults to `http://localhost:8080`. |
| `cli/src/main.ts` | CLI entry | stdin/terminal | terminal output | formatting | No session/message persistence. |

---

## 5) Standardized methods we should align to (external "blessed" APIs)

This repo already uses AI SDK heavily on web. The goal is to reduce custom parsing code by choosing a single standard per layer.

| Standard | Use where | Replace what |
|---|---|---|
| AI SDK `streamText()` + `toUIMessageStreamResponse()` | Next `/api/chat` OR controller agent runtime | custom SSE parsing for web; ad-hoc tool-loop glue |
| AI SDK tool calling conventions | web client + controller | tool argument normalization hacks; tool output persistence races |
| OpenAI Chat Completions/Responses specs | controller proxy + iOS | provider-specific chunk rewrites, duplicated reasoning/tool parsing |

References:
- AI SDK: https://ai-sdk.dev/docs/introduction
- OpenAI API reference: https://platform.openai.com/docs/api-reference/chat
