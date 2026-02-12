## 1) High-level architecture (3 “planes”)

### 1.1 Runtime system diagram

```mermaid
graph TD
  subgraph Browser["Browser / Next.js Client"]
    ChatRoutePage["page.tsx - dynamic, ssr:false"]
    ChatPage["chat-page.tsx - GOD component"]
    Zustand["Zustand store - chat-slice.ts"]
  end

  subgraph NextServer["Next.js Server"]
    ApiProxy["/api/proxy/* - controller proxy"]
    ApiTitle["/api/title"]
    ApiTranscribe["/api/voice/transcribe"]
  end

  subgraph Controller["Controller Backend"]
    Runs["POST /chats/:id/turn (SSE run stream)"]
    Sessions[("Sessions + Messages DB")]
    MCP[("MCP servers + tools")]
    Compaction[("Compaction endpoint")]
  end

  subgraph Inference["Inference Backend"]
    OpenAICompat["/v1/chat/completions"]
  end

  ChatRoutePage --> ChatPage

  ChatPage -->|"api.* via /api/proxy"| ApiProxy
  ApiProxy --> Runs
  ApiProxy --> Sessions
  ApiProxy --> MCP
  ApiProxy --> Compaction
  Runs --> OpenAICompat

  ChatPage -->|"title generation"| ApiTitle
  ChatPage -->|"voice transcription"| ApiTranscribe
  ChatPage <--> Zustand
```

### 1.2 Single controller-owned chat backend (important)

There is now **one** network path for chat:

1) **Controller run stream**
- Client sends messages to `POST /chats/:sessionId/turn` (via `/api/proxy`).
- Controller persists messages, runs the agent loop, executes tools, and streams SSE events.

2) **Inference backend**
- Only the controller talks to `/v1` during the run.

This removes the previous split between streaming and persistence. Tool execution is server-side.

