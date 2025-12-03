# JIT Orchestrator - Current State

## Overview

A JIT (Just-In-Time) orchestrator built with AGNO framework + MCP integration. Features both terminal and HER-inspired web interfaces. Designed for end-user friendly interactions.

## Architecture

```
Startup
   │
   ▼
┌─────────────────────┐
│ Load mcp_config.json │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Connect enabled     │
│ MCP servers         │
└──────────┬──────────┘
           │
           ▼
      Ready for requests
           │
           ▼
┌─────────┐
│ Router  │  → Classify: direct | agent
└────┬────┘
     │
     ▼
┌─────────┐
│ Planner │  → Generate dynamic workflow graph (DAG of subtasks)
└────┬────┘
     │
     ▼
┌───────────────┐
│ Graph Executor│  → Walk DAG, run subtasks (auto parallel/sequential)
└───────┬───────┘
        │
        ▼
┌─────────────┐
│ Synthesizer │  → Combine results into final response
└─────────────┘
```

## File Structure

```
HER_V2/
├── docs/                        # Documentation (shared)
│   ├── 1_Constitution/          # Core project docs
│   ├── 2_Workbench/             # Active planning docs
│   ├── 3_Reference/             # Reference materials
│   └── 4_Archive/               # Completed plans
├── venv/                        # Python virtual environment
│
├── backend/                     # Python API Server
│   ├── mcp_config.json          # MCP server configurations
│   ├── .env                     # API keys
│   ├── .env.example             # API keys template
│   ├── requirements.txt         # Python dependencies
│   ├── CLAUDE.md                # AI assistant instructions
│   ├── agno/                    # AGNO framework
│   ├── logs/                    # Log files
│   └── src/
│       ├── main.py              # Entry point
│       ├── core/                # SHARED: schemas, models, config
│       │   ├── schemas.py       # Pydantic models
│       │   ├── models.py        # LLM configuration
│       │   └── config.py        # Environment & settings
│       ├── engine/              # Core application logic
│       │   └── main_loop.py     # Main orchestration loop
│       ├── orchestration/       # AHIMSA: decision logic
│       │   ├── router.py        # Intent classification
│       │   ├── planner.py       # Dynamic workflow graph generation
│       │   ├── graph_executor.py # Unified DAG executor (replaces executor/)
│       │   └── synthesizer.py   # Result synthesis
│       ├── context/             # RISANG: session management
│       │   └── session.py       # Token-based sliding window
│       ├── tools/               # MCP tool connections
│       │   └── mcp/
│       │       ├── config.py
│       │       ├── manager.py
│       │       └── connection.py
│       └── api/                 # API entrypoints
│           ├── terminal.py      # Terminal REPL
│           └── web.py           # FastAPI + WebSocket (CORS enabled)
│
└── frontend/                    # Standalone Web UI
    ├── index.html               # Main HTML
    ├── css/
    │   └── styles.css           # HER-inspired styling
    └── js/
        ├── config.js            # API configuration
        ├── app.js               # Main controller
        ├── websocket.js         # WebSocket client
        ├── chat.js              # Chat module
        ├── sidebar.js           # Sidebar module
        └── activity.js          # Activity stream module
```

## Team Ownership

| Folder | Owner | Responsibility |
|--------|-------|----------------|
| `backend/src/core/` | Everyone | Shared types, models, config (stable) |
| `backend/src/engine/` | Everyone | Core application loop |
| `backend/src/orchestration/` | Ahimsa | Router, Planner, Executor, Synthesizer |
| `backend/src/context/` | Risang | Session management (future: Cognee Graph RAG) |
| `backend/src/tools/` | You | MCP server connections |
| `backend/src/api/` | You | API entrypoints |
| `frontend/` | You | Web UI |

## MCP Servers

| Server | Status | Setup | What You Get |
|--------|--------|-------|--------------|
| brave-search | ✅ Enabled | API key | Web search, news, local places |
| filesystem | ✅ Enabled | None | Read/write local files |
| weather | ✅ Enabled | None | Weather, air quality, timezone data |
| telegram | ⏸️ Disabled | API ID, Hash, Session | Messages, contacts, groups via Telethon |

## Example Queries

```
> Search for Python tutorials              # brave-search
> List all files in docs folder            # filesystem
> Read the contents of README.md           # filesystem
> Search for latest news about AI          # brave-search
> What's the weather in Tokyo?             # weather
> Get air quality in Jakarta               # weather
> Search my Telegram contacts for John     # telegram
> Get my unread Telegram messages          # telegram
```

## LLM Configuration

| Component   | Primary          | Fallback 1      | Fallback 2     |
|-------------|------------------|-----------------|----------------|
| Router      | gemini-2.5-flash | -               | kimi-k2        |
| Planner     | gemini-2.5-flash | gpt-4o          | -              |
| Agent       | gemini-2.5-flash | gpt-4o          | -              |
| Synthesizer | gemini-2.5-flash | -               | kimi-k2        |

## Environment Variables

```bash
# Required - LLM APIs (in backend/.env)
GOOGLE_API_KEY=<gemini-key>
OPENROUTER_API_KEY=<openrouter-key>

# MCP Servers
BRAVE_API_KEY=<brave-search-api-key>

# Telegram (disabled by default - requires setup)
TELEGRAM_API_ID=<from my.telegram.org/apps>
TELEGRAM_API_HASH=<from my.telegram.org/apps>
TELEGRAM_SESSION_STRING=<generated via session_string_generator.py>
```

## Running

```bash
# Backend (API Server)
cd backend
source ../venv/bin/activate
python -m src.main           # Terminal mode (default)
python -m src.main web       # Web API server (port 8000)

# Frontend (separate terminal)
cd frontend
# Use any static file server:
python -m http.server 5500   # Python's built-in server
# Or use VS Code Live Server, etc.
# Then open http://localhost:5500
```

## Terminal Commands

- Type any request to process
- `mcp:status` - Show connected MCP servers
- `mcp:reload` - Reload MCP configuration
- `memory:status` - Show session memory stats (turns, tokens)
- `memory:clear` - Clear conversation memory
- `quit` / `exit` / `q` - Stop

## Status

**Implementation: Dynamic Workflow Orchestration + Session Memory + Decoupled Web UI**

- Router with fallback chain + context injection
- **Dynamic Planner**: Generates workflow graphs (DAGs) instead of fixed modes
  - Subtasks define dependencies via `depends_on` field
  - Optional `condition` field for branching logic
  - Supports: single, parallel, sequential, fan-out/fan-in, conditional branching
- **Unified Graph Executor**: Single executor that walks any DAG
  - Auto-detects execution pattern from graph structure
  - Runs independent subtasks in parallel automatically
  - Chains dependent subtasks sequentially
  - Evaluates conditions for branching workflows
- Synthesizer with fallback chain
- MCP multi-server manager (4 servers: brave-search, filesystem, weather, telegram)
- Raw MCP schemas passed to LLM (no intervention)
- **Session memory**: Token-based sliding window for conversation context
  - Router: 500 token context limit
  - Planner: 1000 token context limit
  - Enables follow-up queries ("How about Tokyo?" after weather query)
- **Web Interface**: HER-inspired UI with real-time activity stream
  - Warm coral gradient aesthetic with glassmorphism
  - WebSocket for real-time chat and activity updates
  - Modular JS architecture (chat, sidebar, activity modules)
  - Left sidebar: navigation (Chat, Memory views)
  - Right sidebar: activity stream showing routing/planning/execution events
- **Architecture**: Decoupled frontend/backend
  - Backend: FastAPI API server with CORS enabled
  - Frontend: Standalone static files (can be served separately)
  - Communication via WebSocket + REST API

## Known Limitations

Some MCP servers have schema compatibility issues with LLM providers:
- Servers using Pydantic may generate `anyOf` patterns that Gemini/OpenAI reject
- OAuth-based servers may output auth prompts that break JSON-RPC

Working servers (brave-search, filesystem) use clean JSON schemas that work out-of-the-box.

## Related Docs

- `docs/3_Reference/AGNO_FOR_ORCHESTRATOR.md` - AGNO framework reference
- `docs/4_Archive/` - Historical planning docs
