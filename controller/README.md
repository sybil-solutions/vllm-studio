# vLLM Studio Controller

TypeScript backend for vLLM Studio, built on **Bun** + **Hono** + **SQLite**. Manages model lifecycle (launch/evict/preempt) across vLLM, SGLang, llama.cpp, and TabbyAPI backends, with real-time monitoring, agent runtime, and OpenAI-compatible API proxying.

## Quick Start

```bash
# Install dependencies
bun install

# Run (development with auto-reload)
bun --watch src/main.ts

# Run (production)
bun src/main.ts

# Type check
npx tsc --noEmit

# Lint + format
bun run lint:fix && bun run format

# Tests
bun test
```

> **Important**: Use native bun (`~/.bun/bin/bun`), not snap bun. Snap bun has sandbox restrictions that block `nvidia-smi`, breaking GPU monitoring. Use `./start.sh` from the project root which handles this automatically.

## Architecture

```
main.ts                    Entry point, Bun.serve(), shutdown handlers
  └── app-context.ts       Dependency injection container (AppContext)
        ├── config/env.ts   Environment config (.env cascade)
        ├── core/           Logger, errors, AsyncLock, log files
        ├── http/app.ts     Hono app, CORS, route registration
        ├── routes/         HTTP endpoints (16 route modules)
        ├── services/       Business logic (process mgmt, backends, GPU, metrics, agent runtime)
        └── stores/         SQLite persistence (recipes, chats, MCP, metrics, downloads)
```

### Request Flow

```
HTTP Request → Hono middleware (CORS, auth, error handling)
  → Route handler (routes/*.ts)
    → Service layer (services/*.ts)
      → Store layer (stores/*.ts) → SQLite
      → Process manager → spawn/kill inference processes
      → Event manager → SSE broadcast to connected clients
```

### Dependency Injection

All components receive `AppContext`, created once in `app-context.ts`:

```typescript
interface AppContext {
  config: RuntimeConfig;
  logger: Logger;
  eventManager: EventManager;
  launchState: LaunchState;
  metrics: ControllerMetrics;
  metricsRegistry: MetricsRegistry;
  processManager: ProcessManager;
  downloadManager: DownloadManager;
  runManager: ChatRunManager;
  stores: {
    recipeStore: RecipeStore;
    chatStore: ChatStore;
    downloadStore: DownloadStore;
    peakMetricsStore: PeakMetricsStore;
    lifetimeMetricsStore: LifetimeMetricsStore;
    mcpStore: McpStore;
  };
}
```

### Route Registration

All routes follow the same pattern and are wired in `http/app.ts`:

```typescript
registerSystemRoutes(app, context);
registerLifecycleRoutes(app, context);
registerMonitoringRoutes(app, context);
// ...etc
```

## Source Structure

```
src/
├── main.ts                  Server startup, nvidia-smi check, shutdown
├── app-context.ts           DI container creation
├── metrics-collector.ts     Background metrics loop (5s interval)
│
├── config/
│   ├── env.ts               RuntimeConfig, .env loading with cascade
│   └── persisted-config.ts  Persistent settings (SQLite-backed)
│
├── core/
│   ├── logger.ts            Log levels, disk + SSE output
│   ├── errors.ts            HttpStatus class (notFound, badRequest, etc.)
│   ├── async.ts             AsyncLock (mutex with timeout/cancellation), AsyncQueue, delay
│   └── log-files.ts         Log rotation, cleanup, path helpers
│
├── types/
│   ├── models.ts            Backend, Recipe, ProcessInfo, LaunchResult, GpuInfo
│   ├── context.ts           AppContext interface
│   ├── schemas.ts           Zod validation schemas
│   └── brand.ts             Branded types
│
├── http/
│   ├── app.ts               Hono app setup, middleware, route registration
│   └── sse.ts               SSE streaming helpers
│
├── routes/
│   ├── system.ts            /health, /status, /gpus, /config
│   ├── lifecycle.ts         /recipes CRUD, /launch/{id}, /evict, /wait-ready
│   ├── models.ts            /v1/models (OpenAI format), model discovery
│   ├── chats.ts             /chats CRUD, messages, forking
│   ├── openai.ts            OpenAI-compatible chat completions proxy
│   ├── logs.ts              /logs list/stream, /events SSE
│   ├── monitoring.ts        /metrics (Prometheus), /peak-metrics, /benchmark
│   ├── usage.ts             /usage analytics (Postgres-backed)
│   ├── mcp.ts               /mcp/servers, /mcp/tools
│   ├── downloads.ts         Model download endpoints
│   ├── runtime.ts           Runtime info (versions, paths)
│   ├── studio.ts            Studio-specific endpoints
│   ├── tokenization.ts      /tokenize endpoint
│   └── agent-files.ts       Agent filesystem operations
│
├── services/
│   ├── process-manager.ts   Process spawn, findInferenceProcess, eviction
│   ├── backends.ts          Command builders for vLLM, SGLang, llama.cpp, TabbyAPI
│   ├── event-manager.ts     SSE publish/subscribe with channels
│   ├── gpu.ts               nvidia-smi wrapper, memory estimation
│   ├── metrics.ts           Prometheus registry (prom-client)
│   ├── model-browser.ts     Local model directory scanning
│   ├── download-manager.ts  HuggingFace model downloads
│   ├── launch-state.ts      Launch state tracking (mutex, abort)
│   ├── llamacpp-runtime.ts  llama.cpp-specific runtime handling
│   ├── vllm-runtime.ts      vLLM-specific runtime handling
│   ├── runtime-info.ts      System/runtime info gathering
│   ├── chat-compaction.ts   Chat message compaction
│   ├── tool-call-core.ts    Tool call parsing/execution
│   ├── proxy-parsers.ts     Response stream parsing
│   ├── process-utilities.ts Process helper functions
│   ├── command/             Command building utilities
│   ├── downloads/           Download helpers (globs, math, paths, HF API)
│   └── agent-runtime/       Agent orchestration system
│       ├── run-manager.ts          Chat run orchestration
│       ├── agent-event-handler.ts  Event handling for agent runs
│       ├── message-mapper.ts       OpenAI <-> Agent message mapping
│       ├── run-manager-persistence.ts  Run persistence
│       ├── run-manager-sse.ts      Run SSE streaming
│       ├── system-prompt-builder.ts  System prompt construction
│       ├── tool-registry.ts        Tool registry interface
│       ├── tool-registry-common.ts Common tools (web search, etc.)
│       ├── tool-registry-agentfs.ts AgentFS integration
│       ├── tool-registry-mcp.ts    MCP tool integration
│       ├── tool-registry-plan.ts   Planning tool
│       ├── stream-openai-completions-safe.ts  Safe streaming
│       └── model-factory.ts        Model instance creation
│
└── stores/
    ├── recipe-store.ts      Recipe CRUD + migrations
    ├── chat-store.ts        Chat sessions/messages
    ├── chat-store-schema.ts Schema definitions
    ├── chat-store-hydration.ts Data hydration
    ├── chat-store-runs.ts   Run persistence
    ├── mcp-store.ts         MCP server configuration
    ├── download-store.ts    Download tracking
    ├── metrics-store.ts     PeakMetricsStore + LifetimeMetricsStore
    └── recipe-serializer.ts Recipe JSON serialization
```

## Key Services

### Process Manager (`services/process-manager.ts`)
Spawns inference backends as detached child processes. Monitors process health via PID liveness checks. Handles eviction with SIGTERM -> SIGKILL escalation.

### Backends (`services/backends.ts`)
Builds CLI commands for each backend. Handles:
- **vLLM**: tensor parallelism, quantization, tool/reasoning parser auto-detection
- **SGLang**: similar to vLLM with SGLang-specific flags
- **llama.cpp**: GGUF model loading, split modes (row/layer/graph), flash attention, KV cache quantization
- **TabbyAPI**: ExLlamaV2-based serving

### Launch Lifecycle (`routes/lifecycle.ts`)
State machine for model launches with:
- **Preemption**: launching a new model auto-evicts the current one
- **Cancellation**: abort via `/evict` during launch
- **PID liveness**: detects dead processes within one poll cycle (~2s)
- **Fatal pattern detection**: catches argparse errors, import failures, tracebacks
- **Progress events**: SSE updates during model loading
- **AsyncLock**: serialized access prevents concurrent launches

### Metrics Collector (`metrics-collector.ts`)
Background loop (5s interval) that:
- Scrapes inference backend `/metrics` endpoint (vLLM Prometheus metrics)
- Calculates token throughput from deltas
- Tracks GPU power consumption and energy (watt-hours)
- Updates peak metrics (best observed TPS per model)
- Publishes real-time SSE events (status, gpu, metrics)

### Agent Runtime (`services/agent-runtime/`)
Multi-turn agent system with:
- Tool calling (MCP servers, AgentFS, web search, planning)
- Streaming OpenAI completions with safe parsing
- System prompt construction with context
- Run persistence and resumption

## Databases

Two SQLite databases (via Bun's built-in driver):

| Database | Tables | Purpose |
|----------|--------|---------|
| `controller.db` | recipes, mcp_servers, peak_metrics, lifetime_metrics, downloads | Core app state |
| `chats.db` | chat_sessions, chat_messages, chat_runs | Chat persistence |

## Monitoring

### Prometheus Metrics (prefix: `vllm_studio_`)

| Metric | Type | Description |
|--------|------|-------------|
| `inference_server_up` | Gauge | 1 if inference is running |
| `gpu_memory_used_bytes` | Gauge | Per-GPU memory usage |
| `gpu_memory_total_bytes` | Gauge | Per-GPU total memory |
| `gpu_utilization_percent` | Gauge | Per-GPU compute utilization |
| `gpu_temperature_celsius` | Gauge | Per-GPU temperature |
| `model_switches_total` | Counter | Total model switches |
| `model_launch_failures_total` | Counter | Failed launches |
| `model_switch_duration_seconds` | Histogram | Switch latency |
| `sse_active_connections` | Gauge | Active SSE clients |
| `sse_events_published_total` | Counter | Total SSE events |

### SSE Events (GET /events)

| Event Type | Data | Interval |
|------------|------|----------|
| `status` | Process info, inference readiness | 5s |
| `gpu` | GPU list with memory/util/temp/power | 5s |
| `metrics` | Throughput, tokens, power, energy | 5s |
| `launch_progress` | Stage, percentage, message | During launch |
| `download_progress` | Download status, bytes, speed | During download |

## Configuration

Environment variables (all prefixed with `VLLM_STUDIO_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Controller HTTP port |
| `HOST` | 0.0.0.0 | Bind address |
| `INFERENCE_PORT` | 8000 | Inference backend port |
| `API_KEY` | _(none)_ | Optional auth key |
| `DATA_DIR` | ./data | Data directory |
| `DB_PATH` | ./data/controller.db | SQLite path |
| `MODELS_DIR` | /models | Model weights directory |
| `SGLANG_PYTHON` | _(auto)_ | Python path for SGLang |
| `TABBY_API_DIR` | _(none)_ | TabbyAPI installation |
| `NVIDIA_SMI_PATH` | nvidia-smi | nvidia-smi binary path |

## Development

```bash
# Watch mode (auto-reload on changes)
bun --watch src/main.ts

# Type check
npx tsc --noEmit

# Lint
bun run lint

# Format
bun run format

# Run tests
bun test

# Check for unused exports and duplicate code
bun run check
```

### Adding a New Route

1. Create `src/routes/my-feature.ts`
2. Export `registerMyFeatureRoutes(app: Hono, context: AppContext)`
3. Register in `src/http/app.ts`

### Adding a New Store

1. Create `src/stores/my-store.ts` extending the SQLite pattern
2. Initialize in `app-context.ts`
3. Add to `AppContext.stores` in `types/context.ts`
