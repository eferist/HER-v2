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
│       │   ├── session.py       # Token-based sliding window
│       │   └── manager.py       # Unified memory interface
│       ├── tools/               # MCP tool connections
│       │   └── mcp/
│       │       ├── config.py
│       │       ├── manager.py
│       │       └── connection.py
│       └── api/                 # API entrypoints
│           ├── terminal.py      # Terminal REPL
│           └── web.py           # FastAPI + WebSocket (CORS enabled)
│
└── frontend/                    # Standalone Web UI (Modular Architecture)
    ├── index.html               # Shell: navigation + page container
    ├── css/
    │   ├── main.css             # CSS entry point (imports all)
    │   ├── base/
    │   │   ├── variables.css    # Design tokens (colors, spacing)
    │   │   ├── reset.css        # CSS reset & body styles
    │   │   └── animations.css   # Keyframe animations
    │   ├── components/
    │   │   ├── sidebar.css      # Left navigation
    │   │   ├── buttons.css      # Button styles
    │   │   ├── inputs.css       # Input fields
    │   │   ├── icons.css        # Icon styles
    │   │   ├── status.css       # Status indicators
    │   │   └── layout.css       # Main layout
    │   └── pages/
    │       ├── chat.css         # Chat page styles
    │       ├── memory.css       # Memory page styles
    │       └── tools.css        # Tools page styles
    └── js/
        ├── app.js               # Main controller + page lifecycle
        ├── core/
        │   ├── config.js        # API configuration
        │   ├── websocket.js     # WebSocket client
        │   ├── router.js        # Hash-based page routing
        │   └── state.js         # Global state management
        ├── components/
        │   └── sidebar.js       # Navigation component
        ├── pages/
        │   ├── BasePage.js      # Abstract page base class
        │   ├── ChatPage.js      # Chat page
        │   ├── MemoryPage.js    # Memory page (placeholder)
        │   └── ToolsPage.js     # Tools page
        └── services/
            └── api.js           # REST API service
```

## Team Ownership

| Folder | Owner | Responsibility |
|--------|-------|----------------|
| `backend/src/core/` | Everyone | Shared types, models, config (stable) |
| `backend/src/engine/` | Everyone | Core application loop |
| `backend/src/orchestration/` | Ahimsa | Router, Planner, Executor, Synthesizer |
| `backend/src/context/` | Risang | Session memory |
| `backend/src/tools/` | You | MCP server connections |
| `backend/src/api/` | You | API entrypoints |
| `frontend/` | You | Web UI |

## MCP Servers

### Core Servers (Enabled)
| Server | Status | Setup | What You Get |
|--------|--------|-------|--------------|
| brave-search | Enabled | API key | Web search, news, local places |
| filesystem | Enabled | None | Read/write local files |
| weather | Enabled | None | Weather, air quality, timezone data |
| telegram | Enabled | API ID, Hash, Session | Messages, contacts, groups via Telethon |

### Productivity Servers (Disabled - Requires Setup)
| Server | Status | Setup | What You Get |
|--------|--------|-------|--------------|
| google-workspace | Disabled | OAuth 2.0 | Gmail, Calendar, Drive, Docs, Sheets, Tasks |
| todoist | Disabled | API key | Task management with projects and labels |
| notion | Disabled | API key | Pages, databases, workspaces |
| slack | Disabled | Bot token | Channels, messages, threads |
| memory | Disabled | None | Knowledge graph persistent memory |

## Example Queries

```
# Search & Info
> Search for Python tutorials              # brave-search
> List all files in docs folder            # filesystem
> What's the weather in Tokyo?             # weather

# Communication
> Get my unread Telegram messages          # telegram
> Check unread messages in #general        # slack
> Send "Build complete" to #dev            # slack

# Productivity
> Check my unread emails                   # google-workspace
> What meetings do I have tomorrow?        # google-workspace
> Show my tasks for today                  # todoist
> Add task: Review PR #123                 # todoist
> Search Notion for meeting notes          # notion

# Memory
> Remember: project deadline is Dec 15     # memory
> What do you know about the deadline?     # memory
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

# Core MCP Servers
BRAVE_API_KEY=<brave-search-api-key>
TELEGRAM_API_ID=<from my.telegram.org/apps>
TELEGRAM_API_HASH=<from my.telegram.org/apps>
TELEGRAM_SESSION_STRING=<generated via session_string_generator.py>

# Productivity MCP Servers (optional)
GOOGLE_CLIENT_ID=<from console.cloud.google.com>
GOOGLE_CLIENT_SECRET=<from console.cloud.google.com>
TODOIST_API_TOKEN=<from todoist.com/app/settings/integrations>
NOTION_API_KEY=<from notion.so/my-integrations>
SLACK_BOT_TOKEN=<xoxb-from api.slack.com/apps>
SLACK_TEAM_ID=<T-team-id>
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
- `memory:status` - Show session memory stats
- `memory:clear` - Clear session memory
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
- MCP multi-server manager (9 servers: 4 core + 5 productivity)
- Raw MCP schemas passed to LLM (no intervention)
- **Memory System**: Session-based sliding window
  - Token-based context management
  - Router: 500 token context limit
  - Planner: 1000 token context limit
  - Enables follow-up queries ("How about Tokyo?" after weather query)
- **Web Interface**: HER-inspired UI
  - Warm coral gradient aesthetic with glassmorphism
  - WebSocket for real-time chat updates
  - **Modular Page Architecture**: BasePage pattern with mount/unmount lifecycle
  - **Three Pages**: Chat, Memory (placeholder), Tools (hash-based routing: #/chat, #/memory, #/tools)
  - **Tools Page**: 3-column responsive grid showing MCP servers with status, description, tool count
    - **Configuration UI**: Click gear icon to configure API keys directly in browser
    - Shows "Needs Setup" status with missing env vars listed
    - Modal with form fields, help links, password toggle
    - Saves to `.env` and enables server automatically
  - **Modular CSS**: Split into base/, components/, pages/ for maintainability
  - Left sidebar: navigation with router integration
  - **Activity Feed**: Real-time status updates in chat showing background processes
    - Displays: routing, planning, executing stages
    - Shows subtask start/complete events during execution
    - Auto-clears when response arrives
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
