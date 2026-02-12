<!-- CRITICAL -->
## 2) Core runtime loops (state machines)

### 2.1 Chat streaming + tool loop (controller-run)

```mermaid
stateDiagram-v2
  [*] --> Ready

  Ready --> Submitted: sendMessage()
  Submitted --> Streaming: open SSE run

  Streaming --> ToolExec: tool_execution_*\n(server-side)
  ToolExec --> Streaming: tool result events

  Streaming --> Ready: run_end

  Ready --> [*]: user leaves page
```

Notes:
- Tool calls are executed **on the controller** by the Pi agent runtime.
- The client only renders `message_*`, `tool_execution_*`, and `plan_updated` events from the run stream.

### 2.2 End-to-end sequence diagram (user message)

```mermaid
sequenceDiagram
  participant User
  participant ToolBelt as ToolBelt UI
  participant ChatPage as ChatPage (client)
  participant Controller as Controller (/api/proxy)
  participant Agent as Pi agent runtime
  participant LLM as Inference (/v1)

  User->>ToolBelt: Type message / attach / record
  ToolBelt->>ChatPage: onSubmit(text, attachments)

  ChatPage->>Controller: create session if needed\nPOST /chats
  ChatPage->>Controller: POST /chats/:id/turn (SSE run)

  Controller->>Agent: start run (Pi agent core)
  Agent->>LLM: chat/completions

  Agent-->>Controller: message_*\n tool_execution_*\n plan_updated\n run_end
  Controller-->>ChatPage: SSE events (stream)

  ChatPage->>Controller: abort run (optional)
```

### 2.3 Agent Plan state machine

```mermaid
stateDiagram-v2
  [*] --> NoPlan

  NoPlan --> Planned: create_plan(tasks)
  Planned --> Executing: update_plan(step, running)
  Executing --> Planned: update_plan(step, done)\n(next step becomes current)

  Executing --> Blocked: update_plan(step, blocked)
  Blocked --> Planned: update_plan(next step, running)

  Planned --> Done: all steps done
  Done --> NoPlan: clearPlan()
```

Where it lives:
- Tool definitions + execution: controller `services/agent-runtime/tool-registry.ts` (out of scope).
- UI: `src/app/chat/_components/agent/agent-plan-drawer.tsx` + `chat-page.tsx` event handling.

### 2.4 Session lifecycle state machine

```mermaid
stateDiagram-v2
  [*] --> NoSession

  NoSession --> SessionSelected: URL has ?session=...\n(loadSession)
  NoSession --> PendingCreate: first user send\n(createSessionWithMessage)

  PendingCreate --> ActiveSession: controller returns session id

  SessionSelected --> LoadingMessages: controller returns stored messages
  LoadingMessages --> ActiveSession: ChatPage.setMessages(mapped)

  ActiveSession --> Forking: forkChatSession(messageId)
  Forking --> ActiveSession: navigate to /chat?session=newId

  ActiveSession --> NewSession: ?new=1 OR user starts new
  NewSession --> NoSession

  ActiveSession --> Deleted: deleteSession
  Deleted --> NoSession
```

### 2.5 Attachments lifecycle (UI)

```mermaid
stateDiagram-v2
  [*] --> Empty

  Empty --> Picking: user opens file/image picker
  Picking --> Selected: file(s) chosen\n(attachments[] in Zustand)

  Selected --> Selected: add more
  Selected --> Empty: remove last attachment

  Selected --> Submitting: user hits Send
  Submitting --> Empty: ToolBelt clears attachments

  note right of Selected
    Current send pipeline
    does NOT pass binary files
    to the model. It only adds
    text placeholders.
  end note
```

### 2.6 Voice recording + transcription lifecycle

```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> Recording: startRecording()\n(MediaRecorder.start)
  Recording --> Stopping: stopRecording()
  Stopping --> Transcribing: POST /api/voice/transcribe

  Transcribing --> Idle: success\nappend transcript to input
  Transcribing --> Error: failure\nshow transcriptionError
  Error --> Idle: dismiss or timeout
```

### 2.7 Artifact lifecycle (extraction → preview → modal)

```mermaid
graph TD
  A["Assistant ChatMessage parts - type:text"] --> B["ChatPage: extractArtifacts"]
  B --> C["sessionArtifacts + artifactsByMessage Map"]

  C --> D["UnifiedSidebar: ArtifactPreviewPanel"]
  C --> E["ChatMessageItem: MiniArtifactCard chips"]

  E -->|"click"| F["Zustand: activeArtifactId"]
  F --> G["ArtifactModal"]
  G --> H["ArtifactViewer - iframe runner"]
```

### 2.8 Context compaction lifecycle (auto)

```mermaid
stateDiagram-v2
  [*] --> Normal

  Normal --> High: utilization >= threshold
  High --> Compacting: runAutoCompaction

  Compacting --> Normal: success - setMessages
  Compacting --> Normal: failure - compactionError
```

### 2.9 Intra-chat component graph (in-scope)

```mermaid
graph TD
  ChatRoutePage["page.tsx"] --> ChatPage["chat-page.tsx"]

  ChatPage --> useChatSessions["use-chat-sessions"]
  ChatPage --> useChatTools["use-chat-tools"]
  ChatPage --> useChatDerived["use-chat-derived"]
  ChatPage --> useChatUsage["use-chat-usage"]
  ChatPage --> useAgentFiles["use-agent-files"]
  ChatPage --> useAgentState["use-agent-state"]

  ChatPage --> UnifiedSidebar["unified-sidebar"]
  UnifiedSidebar --> ChatConversation["chat-conversation"]
  ChatConversation --> ChatMessageList["chat-message-list"]
  ChatMessageList --> ChatMessageItem["chat-message-item"]
  ChatMessageItem --> MessageRenderer["message-renderer"]
  MessageRenderer --> EnhancedCodeBlock["enhanced-code-block"]

  ChatPage --> ChatToolbeltDock["chat-toolbelt-dock"]
  ChatToolbeltDock --> ToolBelt["tool-belt"]
  ToolBelt --> ToolBeltToolbar["tool-belt-toolbar"]
  ToolBeltToolbar --> ToolDropdown["tool-dropdown"]
  ToolBeltToolbar --> AgentModeToggle["agent-mode-toggle"]

  ChatPage --> ChatModals["chat-modals"]
  ChatModals --> ChatSettingsModal["chat-settings-modal"]
  ChatModals --> MCPSettingsModal["mcp-settings-modal"]
  ChatModals --> UsageModal["usage-modal"]
  ChatModals --> ExportModal["export-modal"]

  ChatPage --> ArtifactModal["artifact-modal"]
  ArtifactModal --> ArtifactViewer["artifact-viewer"]

  UnifiedSidebar --> ArtifactPreviewPanel["artifact-preview-panel"]
  UnifiedSidebar --> ActivityPanel["ActivityPanel - from chat-side-panel"]
  UnifiedSidebar --> ContextPanel["ContextPanel - from chat-side-panel"]
  UnifiedSidebar --> AgentFilesPanel["agent-files-panel"]
  ToolBelt --> AgentPlanDrawer["agent-plan-drawer"]
```

