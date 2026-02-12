<!-- CRITICAL -->
## 6.3 Input

### _components/input/tool-belt.tsx (✅ UI ACTIVE, 🟡 attachment sending partial)

**Role:** Main input component (textarea + attachments + recording + toolbar).

Implements:
- File/image attachment selection (stores `attachments[]` in Zustand)
- Image base64 conversion (currently unused by send pipeline)
- Voice recording (MediaRecorder) + transcription via `/api/voice/transcribe`
- “Queued context” UI while streaming
- Renders optional `planDrawer` header (agent mode)

**Important:** actual sending of binary attachments to the model is not implemented here; only stored.

---

### _components/input/tool-belt-toolbar.tsx (✅ ACTIVE)

**Role:** Buttons row: attachments dropdown, mic, tools, agent toggle, system prompt, model dropdown, send/stop.

**DeepResearch + TTS:** toggles exist but behavior is not implemented in this directory.

---

### _components/input/tool-dropdown.tsx (✅ ACTIVE)

**Role:** Generic dropdown used by toolbar.

---

### _components/input/attachments-preview.tsx (✅ ACTIVE)

**Role:** Displays selected attachments with remove button.

---

### _components/input/recording-indicator.tsx (✅ ACTIVE)

**Role:** “Recording…” pill + stop button.

---

### _components/input/transcription-status.tsx (✅ ACTIVE)

**Role:** “Transcribing…” status + errors.

---

## 6.4 Messages

### _components/messages/chat-message-list.tsx (✅ ACTIVE)

**Role:** Iterates `messages[]` and renders `ChatMessageItem`.

Also:
- Copy-to-clipboard handling
- Per-message markdown export

---

### _components/messages/chat-message-item.tsx (✅ ACTIVE)

**Role:** Renders one user/assistant message.

Key behaviors:
- Extracts text parts, tool parts, reasoning parts.
- Parses thinking tags via `thinkingParser`.
- Mobile inline “Reasoning” collapsible.
- Mobile inline tool list collapsible.
- Desktop tool-call summary line.
- Renders mini artifact chips that open `ArtifactModal`.

Note:
- Context token indicator opens the `UnifiedSidebar` context tab.

---

### _components/messages/message-renderer.tsx (✅ ACTIVE)

**Role:** Markdown + code block rendering.

Features:
- Uses `MessageParsingService` to split markdown/code segments.
- Renders code blocks with `EnhancedCodeBlock`.
- Renders Mermaid diagrams with dynamic `import("mermaid")` and sanitization.

---

### _components/messages/typing-indicator.tsx (✅ ACTIVE)

**Role:** Animated dots + streaming cursor.

---

## 6.5 Artifacts

### _components/artifacts/artifact-renderer.tsx (✅ ACTIVE — extraction only)

**Export used by ChatPage:**
- `extractArtifacts(content, options)`

Note: Artifact parsing also exists in `src/lib/services/message-parsing` (external) → duplication.

---

### _components/artifacts/artifact-preview-panel.tsx (✅ ACTIVE)

**Role:** Sidebar artifact preview (simple iframe).

Provides:
- Preview/Code tab
- Multiple artifacts navigation
- Play/pause (stop iframe)

---

### _components/artifacts/artifact-modal.tsx (✅ ACTIVE)

**Role:** Fullscreen modal wrapper around `ArtifactViewer`.

---

### _components/artifacts/artifact-viewer.tsx (✅ ACTIVE)

**Role:** Advanced artifact execution preview.

Supports:
- HTML / React / JS execution in iframe
- SVG rendering via iframe template
- Run/stop/refresh
- Copy/download/open in new tab
- Fullscreen + zoom/pan for modal view

Pairs with `ArtifactPreviewPanel` for a lightweight sidebar view and `ArtifactModal` for full preview.

---

### _components/artifacts/mini-artifact-card.tsx (✅ ACTIVE)

**Role:** Small pill button representing an artifact (used in message items).

---

## 6.6 Agent mode

### _components/agent/agent-plan-drawer.tsx (✅ ACTIVE)

**Role:** Collapsible plan checklist UI.

- Displays progress + current step.
- Clear button calls `clearPlan()`.

---

### _components/agent/agent-files-panel.tsx (🟡 PARTIAL)

**Role:** Agent workspace tree viewer.

- Receives `files: AgentFileEntry[]` from ChatPage (loaded via `use-agent-files`).
- Read-only UI: no open/edit flow; edits happen through tools + backend.

---

### _components/agent/agent-mode-toggle.tsx (✅ ACTIVE)

**Role:** Small toggle button used in toolbar.

---

### _components/agent/agent-types.ts (✅ ACTIVE)

Defines plan types + normalization.

---

### _components/agent/index.ts (✅ ACTIVE)

Barrel exports.

---

## 6.7 Code

### _components/code/enhanced-code-block.tsx (✅ ACTIVE)

**Role:** Syntax highlighting + copy + expand/collapse for long code.

---

## 6.8 Modals

### _components/modals/chat-settings-modal.tsx (✅ ACTIVE)

Edits:
- Selected model
- System prompt
- Deep research toggle (config only)

---

### _components/modals/mcp-settings-modal.tsx (✅ ACTIVE)

Manages MCP servers:
- Add server (uses `McpServerForm` external component)
- Enable/disable
- Remove

---

### _components/modals/usage-modal.tsx (✅ ACTIVE)

Displays session usage stats from controller.

---

### _components/modals/export-modal.tsx (✅ ACTIVE)

Exports whole chat (JSON/Markdown).

