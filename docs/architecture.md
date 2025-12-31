# vLLM Studio Architecture

## Overview

vLLM Studio is a minimal model lifecycle management system for vLLM and SGLang inference servers. It provides a web UI for managing models, chatting, and monitoring performance.

## Architecture

```
                                    ┌─────────────────┐
                                    │   Frontend      │
                                    │   (Next.js)     │
                                    │   Port 3000     │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────────┐              ┌─────────────────────┐
│   Controller    │◄────────────►│      LiteLLM        │
│   Port 8080     │              │   Port 4000/4100    │
│                 │              │   (API Gateway)     │
└────────┬────────┘              └──────────┬──────────┘
         │                                  │
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────────┐
│   vLLM/SGLang   │◄─────────────│   Inference API     │
│   Port 8000     │              │   /v1/chat/...      │
│   (Inference)   │              │                     │
└─────────────────┘              └─────────────────────┘
```

## Components

### 1. Controller (Required)
**Port: 8080**

The controller manages the model lifecycle:
- Launches vLLM/SGLang processes with configured parameters
- Monitors GPU usage and process health
- Auto-evicts models when switching
- Stores recipes (launch configurations) in SQLite

```bash
# Start controller
./start.sh          # Production
./start.sh --dev    # Development with reload
```

### 2. LiteLLM (Required)
**Port: 4000 (internal) / 4100 (exposed)**

LiteLLM is the **required** API gateway. It is NOT optional because it provides:

#### Why LiteLLM is Required

1. **OpenAI API Compatibility**
   - Translates requests to OpenAI-compatible format
   - Handles streaming SSE responses properly
   - Normalizes tool calling across different models

2. **Request Routing**
   - Routes requests to the correct backend (vLLM/SGLang)
   - Handles model aliasing and fallbacks
   - Supports multiple inference backends simultaneously

3. **Format Translation**
   - Converts between different prompt formats
   - Handles vision/multimodal requests
   - Manages context window differences

4. **Cost Tracking & Logging**
   - Tracks token usage per request
   - Calculates estimated costs
   - Provides usage analytics

5. **Rate Limiting & Caching**
   - Redis-backed response caching
   - Per-user rate limiting
   - Request deduplication

6. **Authentication**
   - API key management
   - Per-key usage limits
   - Audit logging

#### LiteLLM Configuration

Config file: `config/litellm.yaml`

```yaml
model_list:
  - model_name: "*"
    litellm_params:
      model: openai/*
      api_base: http://localhost:8000/v1
      api_key: sk-placeholder

general_settings:
  master_key: sk-master
  database_url: postgresql://postgres:postgres@localhost:5432/litellm
```

### 3. vLLM/SGLang (Required)
**Port: 8000**

The actual inference backend. Started and managed by the Controller.

Supported backends:
- **vLLM**: Production-grade, best for most use cases
- **SGLang**: Better for some specific models, structured generation

### 4. Frontend (Required)
**Port: 3000**

Next.js web application providing:
- Model management dashboard
- Chat interface with streaming
- Tool calling (MCP integration)
- Deep research mode
- GPU monitoring

### 5. Supporting Services

#### PostgreSQL
- Stores LiteLLM cost tracking data
- User/API key management
- Request logs

#### Redis
- Response caching
- Rate limiting state
- Session storage

#### Prometheus + Grafana
- Metrics collection
- Performance dashboards
- Alerting

## Request Flow

### Chat Request

1. **Frontend** sends POST to `/api/chat`
2. **Next.js API route** forwards to Controller at `http://localhost:8080/v1/chat/completions`
3. **Controller** checks if model needs switching, then proxies to LiteLLM
4. **LiteLLM** at `http://localhost:4100`:
   - Authenticates request
   - Logs to PostgreSQL
   - Forwards to vLLM at `http://localhost:8000/v1/chat/completions`
5. **vLLM** generates response, streams back through the chain
6. **Frontend** parses SSE events and updates UI

### Model Switch

1. **Frontend** calls Controller `/api/switch`
2. **Controller**:
   - Evicts current model (kills vLLM process)
   - Loads recipe from SQLite
   - Spawns new vLLM/SGLang process
   - Waits for health check
3. **LiteLLM** automatically routes to new model

## Environment Variables

### Controller
```bash
VLLM_STUDIO_PORT=8080           # Controller port
VLLM_STUDIO_INFERENCE_PORT=8000 # vLLM/SGLang port
VLLM_STUDIO_API_KEY=            # Optional auth
```

### LiteLLM
```bash
LITELLM_MASTER_KEY=sk-master    # API key for auth
DATABASE_URL=postgresql://...    # PostgreSQL connection
INFERENCE_API_BASE=http://localhost:8000/v1
```

### Frontend
```bash
BACKEND_URL=http://localhost:8080    # Controller
LITELLM_URL=http://localhost:4100    # LiteLLM gateway
LITELLM_MASTER_KEY=sk-master
```

## Quick Start

```bash
# 1. Start supporting services
docker-compose up -d postgres redis

# 2. Start LiteLLM
docker-compose up -d litellm

# 3. Start Controller
./start.sh

# 4. Start Frontend (dev)
cd frontend && npm run dev

# Or start everything
docker-compose up -d
```

## Why Not Direct vLLM Access?

You might wonder: "Why not just call vLLM directly?"

1. **No cost tracking** - vLLM doesn't track token costs
2. **No caching** - Every request hits the GPU
3. **No rate limiting** - Can overload the server
4. **No authentication** - Anyone can access
5. **No logging** - No audit trail
6. **Format issues** - Some clients expect specific OpenAI behaviors

LiteLLM solves all of these. It's a thin proxy that adds enterprise features without slowing down inference.

## File Structure

```
lmvllm/
├── controller/           # Python backend
│   ├── app.py           # FastAPI routes
│   ├── process.py       # vLLM/SGLang process management
│   ├── store.py         # SQLite recipe storage
│   └── models.py        # Pydantic schemas
├── frontend/            # Next.js web UI
│   ├── src/app/         # Pages and API routes
│   └── src/components/  # React components
├── config/
│   ├── litellm.yaml     # LiteLLM configuration
│   └── prometheus.yml   # Metrics collection
├── docker-compose.yml   # Service orchestration
└── start.sh            # Controller startup script
```
