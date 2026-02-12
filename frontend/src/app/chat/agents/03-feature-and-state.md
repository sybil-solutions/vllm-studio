## 3) Feature map (what’s implemented vs partial vs missing)

Legend:
- ✅ Implemented + integrated
- 🟡 Implemented but partial / missing wiring
- 🔴 Missing (UI stub or config only)

| Feature | Status | Primary files | Notes |
|---|---:|---|---|
| Basic chat with streaming | ✅ | `chat-page.tsx` | Uses controller run stream (`/chats/:id/turn`) via `api.streamChatRun`. |
| Session history (list/load/fork) | ✅ | `use-chat-sessions.ts`, `chat-page.tsx` | Uses controller `/chats`. Messages loaded into local state via `setMessages()`. |
| System prompt editing | ✅ | `chat-settings-modal.tsx`, `chat-page.tsx` | Stored in Zustand, sent in run payload to controller. |
| MCP tools execution | ✅ | `use-chat-tools.ts`, `chat-page.tsx` | Tools execute on the controller; UI renders `tool_execution_*` events. |
| Activity view (thinking + tools timeline) | ✅ | `use-chat-derived.ts`, `chat-side-panel.tsx` (ActivityPanel) | Groups by run (one user prompt), showing tool calls + thinking extraction. |
| Context stats + auto-compaction | ✅/🟡 | `chat-page.tsx` + `src/lib/services/context-management/*` | Auto-compaction is implemented and updates session/messages; heavy coupling in ChatPage. |
| Artifact extraction + preview UI | ✅/🟡 | `artifact-renderer.tsx` (extract), `artifact-preview-panel.tsx`, `artifact-modal.tsx`, `artifact-viewer.tsx` | Uses `extractArtifacts` + preview panel + modal viewer; legacy sandbox removed. |
| File attachments | 🟡 | `tool-belt.tsx` | UI supports adding files/images. **Sending to model is currently text placeholders** (not actual file parts). |
| Image attachments | 🟡 | `tool-belt.tsx` | Base64 is computed for images, but not passed to model in current send path. |
| Audio recording | 🟡 | `tool-belt.tsx`, `/api/voice/transcribe` (external) | Records audio, transcribes to text, appends to input. Not sent as audio part. |
| Deep Research | 🟡 | `chat-settings-modal.tsx`, `tool-belt-toolbar.tsx`, `chat-page.tsx` | Toggle is forwarded to the controller run (influences thinking level). |
| Agent Files / virtual filesystem | 🟡 | `agent-files-panel.tsx`, `use-agent-files.ts` | Wired to `/chats/:sessionId/files` via `use-agent-files`; panel lists the workspace tree but has no inline editor. |
| Agent planning tools (`create_plan`, `update_plan`) | ✅ | `agent-plan-drawer.tsx`, `chat-page.tsx`, `use-controller-events.ts` | Plan updates arrive from controller tools via run stream + SSE. |
| TTS | 🔴/🟡 | `tool-belt.tsx`, `tool-belt-toolbar.tsx`, store | Toggle exists; no speech synthesis in chat rendering here. |
| Queue next message while streaming | 🟡 | `tool-belt.tsx`, store `queuedContext` | UI supports entering `queuedContext` during streaming; no auto-submit logic found in this directory. |

---

## 4) State management model (Zustand)

**Important:** messages are NOT stored in Zustand.
- Messages live inside `chat-page.tsx` local state.
- Zustand stores UI state, sessions list/metadata, tool execution status, attachments, artifacts UI state, etc.

### 4.1 Zustand keys used directly by chat UI

Primary store file (external dependency): `src/store/chat-slice.ts`

Core keys used by ChatPage:
- Input: `input`, `setInput`
- Model: `selectedModel`, `availableModels`
- System prompt: `systemPrompt`
- Feature toggles: `mcpEnabled`, `artifactsEnabled`, `deepResearch`, `agentMode`
- Timing: `streamingStartTime`, `elapsedSeconds`
- Context queue: `queuedContext`
- Artifacts: `activeArtifactId`
- Session metadata: `currentSessionId`, `currentSessionTitle`, `sessions[]`
- Tool execution: `executingTools`, `toolResultsMap`
- Agent plan: `agentPlan`

### 4.2 Legacy state cleanup (done)

Legacy panel + artifact renderer keys were removed (`toolPanelOpen`, `activePanel`,
`artifactPanelSelectedId`, `artifactRendererState`, `codeSandboxState`) to align with `UnifiedSidebar`.

