# JIT Orchestrator

A Just-In-Time orchestrator built with the AGNO framework + MCP integration. Features both terminal and HER-inspired web interfaces.

## What It Does

Ask questions in natural language, and the orchestrator will:
1. **Route** - Classify if it needs tools or can answer directly
2. **Plan** - Generate a dynamic workflow (DAG) of subtasks
3. **Execute** - Run subtasks (parallel/sequential as needed)
4. **Synthesize** - Combine results into a final response

**Example queries:**
```
> What's the weather in Tokyo?
> Search for Python tutorials
> List all files in docs folder
```

## Prerequisites

- Python 3.11+
- Node.js 18+ (for MCP servers)
- API keys (see below)

## Quick Start

### 1. Clone & Setup Environment

```bash
git clone <repo-url>
cd HER_V2

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
pip install -e ./agno/libs/agno
```

### 3. Configure API Keys

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your keys:

| Key | Required | Where to Get |
|-----|----------|--------------|
| `GOOGLE_API_KEY` | Yes | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `OPENROUTER_API_KEY` | Yes | [OpenRouter](https://openrouter.ai/keys) |
| `BRAVE_API_KEY` | Optional | [Brave Search API](https://brave.com/search/api/) (free 2000/month) |

### 4. Run

**Terminal Mode:**
```bash
cd backend
source ../venv/bin/activate
python -m src.main
```

**Web Mode (API + UI):**
```bash
# Terminal 1: Backend
cd backend
source ../venv/bin/activate
python -m src.main web

# Terminal 2: Frontend
cd frontend
python -m http.server 5500
# Open http://localhost:5500
```

## Project Structure

```
HER_V2/
├── backend/              # Python API Server
│   ├── src/
│   │   ├── main.py       # Entry point
│   │   ├── orchestration/# Router, Planner, Executor, Synthesizer
│   │   ├── tools/mcp/    # MCP server connections
│   │   └── api/          # Terminal & Web interfaces
│   ├── mcp_config.json   # MCP server configs
│   └── .env              # Your API keys (create from .env.example)
│
├── frontend/             # Web UI (vanilla JS)
│   ├── index.html
│   ├── css/
│   └── js/
│
└── docs/                 # Documentation
    ├── 1_Constitution/   # Core docs (CURRENT_STATE.md)
    ├── 2_Workbench/      # Active plans
    └── 4_Archive/        # Completed plans
```

## MCP Servers

Tool servers that provide capabilities:

| Server | What It Does | Setup |
|--------|--------------|-------|
| brave-search | Web search, news | Needs `BRAVE_API_KEY` |
| filesystem | Read/write local files | Works out of box |
| weather | Weather, air quality | Works out of box |
| telegram | Messages, contacts | Needs Telegram API setup |

Configure in `backend/mcp_config.json`. Set `"enabled": false` to disable a server.

## Terminal Commands

When running in terminal mode:
- Type any question to process
- `mcp:status` - Show connected servers
- `mcp:reload` - Reload MCP config
- `memory:status` - Show session stats
- `memory:clear` - Clear session
- `quit` / `exit` / `q` - Stop

## For Contributors

Read `CLAUDE.md` for AI-assisted development instructions.

Key docs:
- `docs/1_Constitution/CURRENT_STATE.md` - Current architecture
- `docs/1_Constitution/REFACTORING.md` - Code style guidelines
- `docs/2_Workbench/` - Active feature plans

## Tech Stack

- **Backend:** Python, FastAPI, WebSocket
- **Frontend:** Vanilla JS, CSS (glassmorphism)
- **LLMs:** Gemini 2.5 Flash (primary), GPT-4o (fallback)
- **Tools:** MCP (Model Context Protocol) servers
