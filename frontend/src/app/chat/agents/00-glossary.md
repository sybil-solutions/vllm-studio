## 0) Glossary

- **ChatMessage**: UI message shape (`role` + `parts[]`) used in the browser and stored by the controller.
- **Run stream**: Controller-owned SSE stream from `POST /chats/:sessionId/turn` emitting `run_start`, `message_*`, `tool_execution_*`, `plan_updated`, and `run_end`.
- **Pi agent runtime**: Controller-owned agent loop built on `@mariozechner/pi-agent-core` + `@mariozechner/pi-ai` that executes tools server-side.
- **Controller**: vLLM Studio backend that stores sessions/messages, MCP config, runs tools, etc. Accessed from browser via `/api/proxy/...` (not in scope, but critical dependency).
- **Inference backend**: OpenAI-compatible `/v1` endpoint (vLLM/LiteLLM/etc) called **by the controller**, not by Next.js.
- **Artifacts**: Code/UI snippets extracted from assistant text (` ```artifact-* ``` ` or `<artifact ...>`), shown in preview UI.
- **Agent Plan**: Synthetic tools `create_plan` + `update_plan` that let the model maintain a checklist in agent mode.

