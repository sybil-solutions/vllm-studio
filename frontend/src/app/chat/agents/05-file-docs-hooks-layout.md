<!-- CRITICAL -->
## 6) File-by-file documentation (with “status”)

### src/app/chat/page.tsx (✅ ACTIVE)

**Role:** `/chat` page entry. Uses dynamic import:
- `dynamic(() => import("./_components/layout/chat-page"), { ssr:false })`

**Why:** avoids SSR/hydration problems for browser-only APIs (media recorder, localStorage, SSE, etc).

---

### src/app/chat/types.ts (✅ ACTIVE)

**Role:** Shared UI-level types.

Key exports:
- `Attachment` (UI attachment object)
- `ModelOption` (for model dropdown)
- `ActivityItem`, `ActivityGroup`, `ThinkingState` (for activity panel)

---

### src/app/chat/utils/index.ts (✅ ACTIVE)

**Active exports used in chat:**
- `stripThinkingForModelContext(text)` → used in `chat-page.tsx` when building model context.
- `tryParseNestedJsonString(raw)` → used when loading stored tool calls in `chat-page.tsx`.

## 6.1 Hooks

### hooks/use-chat-sessions.ts (✅ ACTIVE)

**Role:** Session list + current session metadata manager.

- Uses controller API: `api.getChatSessions()`, `api.getChatSession(id)`.
- Stores sessions + selection in Zustand.
- **Does not** load messages into UI; `chat-page.tsx` calls `setMessages()` after fetching.

---

### hooks/use-chat-tools.ts (✅ ACTIVE)

**Role:** MCP tool discovery + execution.

- `loadMCPServers()` → controller `/mcp/servers`
- `loadMCPTools()` → controller `/mcp/tools` (or per-server tools)
- `getToolDefinitions()` → formats tool names as `${server}__${tool}`
- `executeTool({ toolCallId, toolName, args })` → controller `/mcp/tools/{server}/{tool}`

Tracks ephemeral UI state:
- `executingTools: Set<toolCallId>`
- `toolResultsMap: Map<toolCallId, ToolResult>`

---

### hooks/use-chat-derived.ts (✅ ACTIVE)

**Role:** Derived UI data:
- Thinking extraction (reasoning parts + `<think>` tags)
- Activity timeline groups (per assistant message)

Depends on:
- `thinkingParser` from `src/lib/services/message-parsing` (external)

---

### hooks/use-chat-usage.ts (✅ ACTIVE)

**Role:** Fetch + store session usage.

Calls controller:
- `api.getChatUsage(sessionId)`

---

## 6.2 Layout

### _components/layout/chat-page.tsx (✅ ACTIVE, very large)

**Role:** The orchestrator (“god component”).

Major responsibilities:
- Owns controller run stream lifecycle:
  - `api.streamChatRun()` for SSE
  - `handleRunEvent()` for `message_*`, `tool_execution_*`, `plan_updated`, `run_end`
- Loads sessions and restores messages (`setMessages(mapStoredMessages(...))`).
- Loads models list and stores in Zustand.
- Builds `effectiveSystemPrompt` (system + agent-mode block).
- Builds context stats + auto-compaction.
- Extracts artifacts from assistant messages.
- Renders full UI via `UnifiedSidebar` + `ChatConversation` + `ToolBelt` + modals.

Known architectural smells:
- Mixes UI rendering, persistence, model IO, compaction, artifact parsing, and sidebar behavior.

---

### _components/layout/unified-sidebar.tsx (✅ ACTIVE)

**Role:** Desktop-only right sidebar with resize.

Tabs:
- Activity
- Context
- Preview (artifacts)
- Files (agent mode)

Agent toggle exists here too.

---

### _components/layout/chat-conversation.tsx (✅ ACTIVE)

**Role:** Scroll container + empty-state splash + message list.

- Empty state shows splash canvas + tool belt on desktop.
- Non-empty state shows `ChatMessageList`.

---

### _components/layout/chat-toolbelt-dock.tsx (✅ ACTIVE)

**Role:** Places `ToolBelt` at bottom on mobile, inline on desktop.

---

### _components/layout/chat-top-controls.tsx (✅ ACTIVE)

**Role:** Mobile-only top-left menu + top-right settings buttons.

---

### _components/layout/chat-action-buttons.tsx (✅ ACTIVE)

**Role:** Desktop floating action buttons (open activity/context/settings/mcp/usage/export).

---

### _components/layout/chat-modals.tsx (✅ ACTIVE)

**Role:** Simple aggregator that renders modals:
- `ChatSettingsModal`
- `MCPSettingsModal`
- `UsageModal`
- `ExportModal`

---

### _components/layout/chat-splash-canvas.tsx (✅ ACTIVE but cosmetic)

**Role:** Decorative canvas animation for the empty chat state.

---

### _components/layout/chat-side-panel.tsx (✅ ACTIVE)

**Exports:**
- `ActivityPanel` (USED)
- `ContextPanel` (USED)

Legacy `ChatSidePanel` was removed after `UnifiedSidebar` adoption.

