# Ralph State

- iteration: 4
- task: "Phase 2: Fix tool-call streaming (qwen3_xml + bypass LiteLLM) and verify"
- completion_criteria:
  - Intellect-3 tool_call_parser set to qwen3_xml and model relaunched
  - Streaming tool_calls include names + args from vLLM
  - Controller bypasses LiteLLM for streaming tool calls
  - Backend deployed on server with new proxy logic
  - Tool executions observed in SSE runs
