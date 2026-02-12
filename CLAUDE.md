<!-- CRITICAL -->
# CLAUDE.md

## Project Overview

vLLM Studio - Model lifecycle management for vLLM, SGLang, llama.cpp, and TabbyAPI inference servers, with LiteLLM as the API gateway. Features a Next.js frontend with real-time SSE updates, MCP tool integration, agent runtime, and comprehensive analytics.

## Architecture

The controller is a **TypeScript application** running on **Bun** with the **Hono** web framework and **SQLite** for persistence. It is NOT Python/FastAPI.

```
                    ┌─────────────────────────────────────────┐
                    │              Frontend (3000)             │
                    │  Next.js + React + TypeScript            │
                    └─────────────────┬───────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  Controller (8080)  │  │   LiteLLM (4100)    │  │  Prometheus (9090)  │
│  Bun + Hono + SQLite│  │   API Gateway       │  │  Grafana (3100)     │
└──────────┬──────────┘  └──────────┬──────────┘  └─────────────────────┘
           │                        │
           │                        ▼
           │             ┌─────────────────────┐
           │             │ vLLM / SGLang /     │
           │             │ llama.cpp (8000)    │
           │             └─────────────────────┘
           │
           ├────────────────────────────────────┐
           │                                    │
           ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│   PostgreSQL (5432) │              │    Redis (6379)     │
│   Usage Analytics   │              │   Response Cache    │
└─────────────────────┘              └─────────────────────┘
```

## Commands

```bash
# Run controller (IMPORTANT: use start.sh or native bun, NOT snap bun)
./start.sh                                    # Recommended - uses native bun
./start.sh --dev                              # Development with auto-reload
~/.bun/bin/bun run controller/src/main.ts     # Direct with native bun

# DO NOT use snap bun directly - it has sandbox restrictions that block nvidia-smi
# If you see "nvidia-smi not found" errors, you're using snap bun

# Install native bun if needed:
curl -fsSL https://bun.sh/install | bash

# Install controller dependencies
cd controller && bun install

# Type check controller
cd controller && npx tsc --noEmit

# Run all services (Postgres, Redis, LiteLLM, Prometheus, Grafana, Temporal)
docker compose up -d

# Run frontend
cd frontend && npm run dev
```

## Configuration

Environment variables (prefix `VLLM_STUDIO_`):
- `PORT` - Controller port (default: 8080)
- `INFERENCE_PORT` - vLLM/SGLang/llama.cpp port (default: 8000)
- `API_KEY` - Optional authentication
- `DATA_DIR` - Data directory (default: ./data)
- `DB_PATH` - SQLite database path (default: ./data/controller.db)
- `MODELS_DIR` - Model weights directory (default: /models)
- `SGLANG_PYTHON` - Python path for SGLang venv
- `TABBY_API_DIR` - TabbyAPI installation directory
- `NVIDIA_SMI_PATH` - Path to nvidia-smi binary (default: nvidia-smi)

## Project Structure

```
lmvllm/
├── controller/              # TypeScript backend (Bun + Hono)
│   ├── src/
│   │   ├── main.ts          # Entry point, server startup, shutdown
│   │   ├── app-context.ts   # Dependency injection container
│   │   ├── metrics-collector.ts  # Background metrics collection (5s interval)
│   │   ├── config/
│   │   │   ├── env.ts       # Runtime config, .env loading
│   │   │   └── persisted-config.ts  # Persistent settings
│   │   ├── core/
│   │   │   ├── logger.ts    # Logger with disk + SSE output
│   │   │   ├── errors.ts    # HttpStatus error class
│   │   │   ├── async.ts     # AsyncLock, AsyncQueue, delay
│   │   │   └── log-files.ts # Log file rotation/cleanup
│   │   ├── types/
│   │   │   ├── models.ts    # Backend, Recipe, ProcessInfo, LaunchResult
│   │   │   ├── context.ts   # AppContext interface
│   │   │   └── schemas.ts   # Zod validation schemas
│   │   ├── http/
│   │   │   ├── app.ts       # Hono app, CORS, route registration
│   │   │   └── sse.ts       # SSE streaming utilities
│   │   ├── routes/
│   │   │   ├── system.ts    # /health, /status, /gpus, /config
│   │   │   ├── lifecycle.ts # /recipes, /launch/{id}, /evict
│   │   │   ├── models.ts    # /v1/models, model discovery
│   │   │   ├── chats.ts     # /chats CRUD
│   │   │   ├── openai.ts    # OpenAI-compatible proxy
│   │   │   ├── logs.ts      # /logs, /events (SSE stream)
│   │   │   ├── monitoring.ts # /metrics, /peak-metrics, /benchmark
│   │   │   ├── usage.ts     # /usage analytics
│   │   │   ├── mcp.ts       # /mcp/servers, /mcp/tools
│   │   │   ├── downloads.ts # Model download management
│   │   │   ├── runtime.ts   # Runtime info endpoints
│   │   │   ├── studio.ts    # Studio-specific endpoints
│   │   │   └── tokenization.ts  # /tokenize
│   │   ├── services/
│   │   │   ├── process-manager.ts  # Process spawn, lifecycle, eviction
│   │   │   ├── backends.ts  # vLLM/SGLang/llama.cpp command builders
│   │   │   ├── event-manager.ts    # SSE publish/subscribe
│   │   │   ├── gpu.ts       # GPU detection via nvidia-smi
│   │   │   ├── metrics.ts   # Prometheus metrics registry
│   │   │   ├── model-browser.ts    # Local model discovery
│   │   │   ├── download-manager.ts # Model downloads
│   │   │   ├── launch-state.ts     # Launch state tracking
│   │   │   ├── llamacpp-runtime.ts # llama.cpp runtime handling
│   │   │   ├── vllm-runtime.ts     # vLLM runtime handling
│   │   │   └── agent-runtime/      # Agent orchestration (13 files)
│   │   │       ├── run-manager.ts  # Chat run orchestration
│   │   │       ├── tool-registry.ts # Tool integration
│   │   │       └── ...
│   │   └── stores/
│   │       ├── recipe-store.ts     # Recipe CRUD
│   │       ├── chat-store.ts       # Chat sessions/messages
│   │       ├── mcp-store.ts        # MCP server config
│   │       ├── metrics-store.ts    # Peak/lifetime metrics
│   │       └── download-store.ts   # Download tracking
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Next.js frontend
│   └── src/
│       ├── app/             # Pages (chat, recipes, configs, logs, discover, usage)
│       ├── components/      # React components
│       ├── hooks/           # Custom hooks (useSSE, useContextManager)
│       └── lib/             # API client, types, utilities
├── config/                  # Service configurations
│   ├── litellm.yaml         # LiteLLM routing config
│   ├── prometheus.yml       # Prometheus scrape config
│   └── grafana/             # Grafana provisioning + dashboards
├── docs/                    # Documentation
│   ├── RECIPE_SYSTEM.md     # Recipe system guide
│   └── production-topology.md
├── data/                    # Runtime data (SQLite DBs, logs)
└── docker-compose.yml       # Service orchestration
```

## Controller Architecture

### Dependency Injection
All services receive an `AppContext` object created in `app-context.ts`. This contains all stores, services, logger, event manager, and configuration as singletons.

### Route Registration
Routes follow the pattern `registerXXXRoutes(app: Hono, context: AppContext)`, all wired in `http/app.ts`.

### Key Patterns
- **Hono** web framework with Zod-based validation
- **SQLite** via Bun's built-in driver (two DBs: `controller.db`, `chats.db`)
- **SSE** for real-time updates (status, GPU, metrics, launch progress)
- **prom-client** for Prometheus metrics (prefix: `vllm_studio_`)
- **Background metrics collector** runs every 5s, scrapes inference backend metrics

## Database Schema

```sql
-- Recipes (model launch configurations)
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,  -- JSON-serialized Recipe
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    model TEXT,
    parent_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT,
    model TEXT,
    tool_calls TEXT,  -- JSON array
    request_prompt_tokens INTEGER,
    request_completion_tokens INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- MCP servers
CREATE TABLE mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    command TEXT NOT NULL,
    args TEXT DEFAULT '[]',
    env TEXT DEFAULT '{}',
    description TEXT,
    url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Peak metrics (benchmark results)
CREATE TABLE peak_metrics (
    model_id TEXT PRIMARY KEY,
    prefill_tps REAL,
    generation_tps REAL,
    ttft_ms REAL,
    total_tokens INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0
);

-- Lifetime metrics (cumulative)
CREATE TABLE lifetime_metrics (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL DEFAULT 0
);
```

## API Endpoints

### System
- `GET /health` - Health check with inference readiness
- `GET /status` - Detailed status + launching recipe
- `GET /gpus` - GPU list with memory/utilization
- `GET /config` - System topology and service discovery

### Model Lifecycle
- `GET /recipes` - List recipes with status
- `POST /recipes` - Create recipe
- `PUT /recipes/{id}` - Update recipe
- `DELETE /recipes/{id}` - Delete recipe
- `POST /launch/{recipe_id}` - Launch model (with SSE progress)
- `POST /evict` - Stop running model
- `GET /wait-ready` - Poll until model ready

### OpenAI Compatibility
- `GET /v1/models` - List models (OpenAI format)
- `GET /v1/studio/models` - Local model discovery

### Chat
- `GET /chats` - List sessions
- `POST /chats` - Create session
- `GET /chats/{id}` - Get session with messages
- `POST /chats/{id}/messages` - Add message
- `POST /chats/{id}/fork` - Fork session

### MCP
- `GET /mcp/servers` - List MCP servers
- `POST /mcp/servers` - Add server
- `GET /mcp/tools` - List all tools
- `POST /mcp/tools/{server}/{tool}` - Call tool

### Monitoring
- `GET /events` - SSE stream (status, gpu, metrics, logs, launch_progress)
- `GET /metrics` - Prometheus metrics (OpenMetrics format)
- `GET /peak-metrics` - Best observed throughput per model
- `GET /lifetime-metrics` - Cumulative tokens, energy, uptime
- `POST /benchmark` - Run throughput benchmark
- `GET /usage` - Usage analytics

### Downloads
- `GET /downloads` - List active downloads
- `POST /downloads` - Start model download

## Key Files

- `controller/src/services/backends.ts` - vLLM/SGLang/llama.cpp command construction with auto-detection of reasoning/tool parsers
- `controller/src/services/process-manager.ts` - Process detection, launch with stability checks, eviction
- `controller/src/routes/lifecycle.ts` - Launch state machine with preemption, cancellation, PID liveness checks, progress events
- `controller/src/services/event-manager.ts` - SSE event broadcasting to multiple subscribers
- `controller/src/stores/recipe-store.ts` - Recipe CRUD with SQLite
- `controller/src/metrics-collector.ts` - Background metrics collection, vLLM scraping, lifetime tracking
- `controller/src/core/async.ts` - AsyncLock mutex with timeout + cancellation support
- `config/litellm.yaml` - Model routing, callbacks, caching configuration

## Monitoring

Prometheus metrics (prefix `vllm_studio_`):
- `inference_server_up` - Whether inference is running (1/0)
- `gpu_memory_used_bytes`, `gpu_memory_total_bytes` - Per-GPU memory
- `gpu_utilization_percent`, `gpu_temperature_celsius` - Per-GPU stats
- `model_switches_total`, `model_launch_failures_total` - Lifecycle counters
- `model_switch_duration_seconds` - Switch latency histogram
- `sse_active_connections`, `sse_events_published_total` - SSE stats

Grafana dashboard at `http://localhost:3100` (default: admin/admin) with GPU, inference, and lifecycle panels.
