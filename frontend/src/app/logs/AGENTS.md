<!-- CRITICAL -->
# frontend/src/app/logs/AGENTS.md

Log viewer - inference server logs.

## Structure

```
logs/
└── page.tsx    # Log viewer component
```

## Features

### Session Overview
- List available log sessions (from `/logs`)
- Select session to view tail content

### Log Filtering
- Search within logs (client-side)
- Session filter by model/id

### Log History
- Load last N lines via `/logs/:sessionId`
- Auto-refresh streaming via `/logs/:sessionId/stream` (SSE; preferred)
- Download log file (client-side)

## API Integration

| Endpoint | Purpose |
|----------|---------|
| `GET /logs` | List log sessions |
| `GET /logs/:sessionId?limit=N` | Tail last N lines |
| `DELETE /logs/:sessionId` | Remove log file |
| `GET /logs/:sessionId/stream?tail=N` | SSE stream (replay last N lines, then stream new lines) |
| `GET /events` | Global SSE stream |

## Retention (Controller)

Logs are stored durably under the controller `data_dir` (`$VLLM_STUDIO_DATA_DIR/logs/`) with best-effort cleanup to prevent unbounded disk growth.

Environment overrides:
- `VLLM_STUDIO_LOG_RETENTION_DAYS` (default `30`, `0` disables age expiry)
- `VLLM_STUDIO_LOG_MAX_FILES` (default `200`, `0` disables file cap)
- `VLLM_STUDIO_LOG_MAX_TOTAL_BYTES` (default `1000000000`, `0` disables size cap)

## Log Sources

Logs come from:
1. vLLM/SGLang stdout/stderr
2. Controller operations
3. Model loading progress
4. Request/response traces

## UI Components

- **LogViewer** - Main scrollable log display
- **LogLine** - Individual log entry with level coloring
- **LogFilter** - Level and search filters
- **LogControls** - Auto-scroll, download, clear

---

## Codex Skills

- `skills/vllm-studio` — ops/deploy/env keys.
- `skills/vllm-studio-backend` — backend architecture + OpenAI compatibility.
