<!-- CRITICAL -->
## 7) Dead/legacy/unintegrated code summary (actionable inventory)

### 7.1 Cleared

- Legacy side-panel + sandbox artifacts removed (Feb 2026 cleanup).

### 7.2 Remaining duplication

- Artifact extraction still exists in both `extractArtifacts()` and `MessageParsingService` (external).

### 7.3 Unintegrated feature toggles (UI exists, pipeline doesn’t change)

- TTS toggle (`isTTSEnabled`) does not change output rendering.

- Queued context (`queuedContext`) is writable while streaming but has no auto-send path in this directory.

- Agent file system: panel is wired to controller; no inline editor yet.

---

## 8) Suggested re-organization targets (no code changes here)

These are *organizational* recommendations to reduce confusion:

1) **Split `chat-page.tsx`** into hooks/modules:
   - `use-run-stream.ts` (send + SSE event handling)
   - `use-session-restore.ts` (URL params + loading + setMessages)
   - `use-artifacts.ts` (artifact extraction + modal selection)
   - `use-context-stats.ts` (token counting + compaction)

2) **Unify artifact preview components**
   - Today there are 2 experiences:
     - `ArtifactPreviewPanel` (sidebar simple iframe)
     - `ArtifactModal` + `ArtifactViewer` (full featured)

3) **Unify artifact extraction logic**
   - Artifact extraction exists twice:
     - `extractArtifacts()` (artifact-renderer.tsx)
     - `MessageParsingService` artifacts parser (external)

4) **Make attachments “real” or drop them**
   - Current send path uses text placeholders; it does not pass binary parts to the controller run.

---

## 9) Quick debugging checklist (chat-focused)

- If the model stops after tool calls:
  - Check controller logs for tool execution errors.
  - Confirm `tool_execution_end` events reach the client.
  - Ensure the run ends with `run_end` (not aborted).

- If session reload loses tool results:
  - Check controller persistence (`tool_calls[].result` + `chat_tool_executions`).

- If SSE stream stalls:
  - Verify `/chats/:id/turn` response headers and proxy setup.
  - Check `api.streamChatRun` parsing (event/data framing).

- If hydration errors occur:
  - Check for invalid HTML nesting (e.g., button inside button).

---

If you want, next step can be: generate a **“delete/merge plan”** as a concrete checklist that keeps the UI identical while reducing files and removing dead code.

---

## Codex Skills

- `skills/vllm-studio` — ops/deploy/env keys.
- `skills/vllm-studio-backend` — backend architecture + OpenAI compatibility.
