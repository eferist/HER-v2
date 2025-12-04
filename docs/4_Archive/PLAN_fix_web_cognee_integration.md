# Plan: Fix Web Interface Cognee Integration

## Problem

The web interface (`backend/src/api/web.py`) only uses `SessionMemory` for short-term memory, while the terminal interface uses `MemoryManager` which includes both short-term AND long-term (Cognee) memory.

**Current State (web.py:99):**
```python
session = SessionMemory()  # Only short-term!
```

**Expected:**
```python
memory = MemoryManager(...)  # Both short-term + long-term
```

---

## Implementation Steps

### Step 1: Update Global State in `web.py`

**File:** `backend/src/api/web.py`

Change:
```python
from src.context import SessionMemory
```

To:
```python
from src.context import MemoryManager
from src.core.config import (
    LONGTERM_MEMORY_ENABLED,
    COGNEE_DATA_DIR,
    COGNEE_DATASET_NAME,
)
```

Change global variable:
```python
session: Optional[SessionMemory] = None
```

To:
```python
memory: Optional[MemoryManager] = None
```

---

### Step 2: Update Startup Function

**File:** `backend/src/api/web.py` - `startup()` function

Change:
```python
@app.on_event("startup")
async def startup():
    global mcp_manager, session
    load_env()
    mcp_manager = await init_mcp()
    session = SessionMemory()
```

To:
```python
@app.on_event("startup")
async def startup():
    global mcp_manager, memory
    load_env()
    mcp_manager = await init_mcp()
    memory = MemoryManager(
        cognee_data_dir=COGNEE_DATA_DIR,
        cognee_dataset=COGNEE_DATASET_NAME,
        enable_longterm=LONGTERM_MEMORY_ENABLED,
    )
    await memory.initialize()
    print(f"  MCP servers: {len(mcp_manager.servers) if mcp_manager else 0}")
    print(f"  Memory initialized (long-term: {'enabled' if memory.longterm_available else 'disabled'})")
```

---

### Step 3: Update Status Endpoint

**File:** `backend/src/api/web.py` - `/api/status` endpoint

Change to return full memory status:
```python
@app.get("/api/status")
async def get_status():
    mem_status = memory.status() if memory else {"session": {"turns": 0, "tokens": 0}, "longterm": {"enabled": False, "available": False}}
    return {
        "mcp_connected": mcp_manager is not None and len(mcp_manager.servers) > 0,
        "mcp_servers": list(mcp_manager.servers.keys()) if mcp_manager else [],
        "mcp_tools": mcp_manager.get_all_tools() if mcp_manager else [],
        "memory": mem_status,
    }
```

---

### Step 4: Update Clear Memory Endpoint

**File:** `backend/src/api/web.py` - `/api/memory/clear` endpoint

```python
@app.post("/api/memory/clear")
async def clear_memory():
    """Clear session memory only."""
    if memory:
        memory.clear_session()
    return {"success": True, "cleared": "session"}


@app.post("/api/memory/clear-all")
async def clear_all_memory():
    """Clear both session and long-term memory."""
    if memory:
        await memory.clear_all()
    return {"success": True, "cleared": "all"}
```

---

### Step 5: Add Memory Search Endpoint

**File:** `backend/src/api/web.py`

Add new endpoint matching the schema in `COGNEE_MEMORY_SCHEMA.md`:

```python
from fastapi import Query
import uuid
import time

@app.get("/api/memory/search")
async def search_memory(q: str = Query(..., min_length=1)):
    """Search long-term memory.

    Returns memories matching the query from the Cognee knowledge graph.
    """
    if not memory or not memory.longterm_available:
        return {
            "memories": [],
            "query": q,
            "total_count": 0,
            "error": "Long-term memory not available"
        }

    results = await memory.search_longterm(q, limit=10)

    memories = []
    for i, mem in enumerate(results):
        memories.append({
            "id": str(uuid.uuid4()),
            "text": mem.content,
            "created_at": int(time.time()),  # Cognee doesn't provide timestamps yet
            "source_name": mem.metadata.get("source") if mem.metadata else None,
            "entities": mem.metadata.get("entities") if mem.metadata else None,
            "relevance_score": mem.score,
        })

    return {
        "memories": memories,
        "query": q,
        "total_count": len(memories),
    }
```

---

### Step 6: Add Memory Save Endpoint

**File:** `backend/src/api/web.py`

```python
from pydantic import BaseModel

class MemorySaveRequest(BaseModel):
    content: str

@app.post("/api/memory/save")
async def save_memory(request: MemorySaveRequest):
    """Save information to long-term memory."""
    if not memory or not memory.longterm_available:
        return {
            "success": False,
            "error": "Long-term memory not available"
        }

    success = await memory.persist(request.content)
    return {
        "success": success,
        "content": request.content[:50] + "..." if len(request.content) > 50 else request.content,
    }
```

---

### Step 7: Update WebSocket Handler

**File:** `backend/src/api/web.py` - `websocket_handler()` function

Change the orchestrate call to use `memory` instead of `session`:

```python
response = await orchestrate(
    user_input,
    mcp_manager=mcp_manager,
    memory=memory,  # Changed from session=session
    on_event=on_event,
)
```

---

### Step 8: Update Help Text

**File:** `backend/src/api/web.py` - `run_web()` function

```python
print("  API endpoints:")
print("    GET  /api/status           - System status")
print("    POST /api/mcp/reload       - Reload MCP config")
print("    POST /api/memory/clear     - Clear session memory")
print("    POST /api/memory/clear-all - Clear all memory")
print("    GET  /api/memory/search    - Search long-term memory")
print("    POST /api/memory/save      - Save to long-term memory")
print("    WS   /ws                   - WebSocket chat")
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `web.py` imports | Add `MemoryManager`, config imports |
| `web.py` globals | Replace `session` with `memory` |
| `startup()` | Initialize `MemoryManager` with Cognee |
| `/api/status` | Return full memory status |
| `/api/memory/clear` | Keep for session-only clear |
| `/api/memory/clear-all` | NEW - Clear all memory |
| `/api/memory/search` | NEW - Search Cognee |
| `/api/memory/save` | NEW - Persist to Cognee |
| WebSocket handler | Use `memory=` param |

---

## API Endpoints (Final)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Full system + memory status |
| POST | `/api/mcp/reload` | Reload MCP servers |
| POST | `/api/memory/clear` | Clear session only |
| POST | `/api/memory/clear-all` | Clear session + long-term |
| GET | `/api/memory/search?q=` | Search long-term memory |
| POST | `/api/memory/save` | Save to long-term memory |
| WS | `/ws` | WebSocket chat |

---

## Testing

After implementation:

1. Start web server: `python -m src.main web`
2. Check status: `curl http://localhost:8000/api/status`
3. Save memory: `curl -X POST http://localhost:8000/api/memory/save -H "Content-Type: application/json" -d '{"content": "Test memory"}'`
4. Search memory: `curl "http://localhost:8000/api/memory/search?q=test"`
5. Test WebSocket chat with context enrichment
