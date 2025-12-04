# PLAN: Remove Cognee While Maintaining Functionality

## Overview

Cognee was integrated as a long-term memory solution using a knowledge graph. However, it has introduced bugs and instability. This plan outlines how to **completely remove Cognee** while keeping the application fully functional with session-only memory.

---

## Current State Analysis

### Files That Use Cognee Directly

| File | Cognee Usage | Impact |
|------|-------------|--------|
| `backend/src/context/cognee_memory.py` | **Core Cognee wrapper** | DELETE entirely |
| `backend/src/context/manager.py` | Imports `CogneeMemory`, uses long-term methods | SIMPLIFY |
| `backend/src/context/__init__.py` | Exports `CogneeMemory`, `Memory` | CLEAN UP exports |
| `backend/src/core/config.py` | Cognee settings (`COGNEE_DATA_DIR`, etc.) | REMOVE Cognee settings |
| `backend/src/api/terminal.py` | Imports Cognee config, long-term memory commands | SIMPLIFY commands |
| `backend/src/engine/main_loop.py` | Uses `LONGTERM_MEMORY_LIMIT` | REMOVE long-term context |
| `backend/requirements.txt` | `cognee` dependency | REMOVE line |

### Frontend Components (Memory Page)

| File | Status |
|------|--------|
| `frontend/js/pages/MemoryPage.js` | Calls API for memories (will return empty) |
| `frontend/js/services/api.js` | Memory API methods (getMemories, searchMemories) |
| `frontend/js/core/config.js` | Memory endpoints defined |

**Decision:** Keep the Memory Page UI as a placeholder for future use. The API calls will gracefully return empty results.

---

## Step-by-Step Removal Plan

### Phase 1: Backend - Remove Cognee Core

#### Step 1.1: Delete `cognee_memory.py`
- **Action:** Delete `/backend/src/context/cognee_memory.py`
- **Reason:** This is the Cognee wrapper - remove entirely

#### Step 1.2: Simplify `manager.py`
- **Remove:** All `CogneeMemory` imports and instantiation
- **Remove:** `cognee_data_dir`, `cognee_dataset`, `enable_longterm` parameters
- **Remove:** Methods: `persist()`, `search_longterm()`, `longterm_available`
- **Simplify:** `get_context()` to only use session memory
- **Simplify:** `clear_all()` to just clear session
- **Simplify:** `status()` to remove longterm section

**New `manager.py` structure:**
```python
class MemoryManager:
    def __init__(self, session_id: str = "default"):
        self.session = SessionMemory(session_id=session_id)

    async def initialize(self) -> None:
        pass  # No async init needed anymore

    def add_turn(self, role: str, content: str) -> None:
        self.session.add_turn(role, content)

    def get_context(self, token_limit: int = 500) -> str:
        return self.session.get_context(token_limit)

    def clear(self) -> None:
        self.session.clear()

    def status(self) -> dict:
        return {
            "turns": self.session.turn_count,
            "tokens": self.session.total_tokens,
        }
```

#### Step 1.3: Update `__init__.py`
- **Remove:** `CogneeMemory`, `Memory` from exports
- **Keep:** `SessionMemory`, `MemoryManager`

### Phase 2: Backend - Clean Up Config

#### Step 2.1: Simplify `config.py`
- **Remove:** `LONGTERM_MEMORY_ENABLED`
- **Remove:** `COGNEE_DATA_DIR`
- **Remove:** `COGNEE_DATASET_NAME`
- **Remove:** `LONGTERM_MEMORY_LIMIT`
- **Keep:** `ROUTER_TOKEN_LIMIT`, `PLANNER_TOKEN_LIMIT`

### Phase 3: Backend - Update Consumers

#### Step 3.1: Simplify `terminal.py`
- **Remove imports:**
  - `LONGTERM_MEMORY_ENABLED`, `COGNEE_DATA_DIR`, `COGNEE_DATASET_NAME`
- **Simplify MemoryManager instantiation:**
  ```python
  memory = MemoryManager()
  # Remove: await memory.initialize()  # No longer async
  ```
- **Remove commands:**
  - `memory:clear-all` (just use `memory:clear`)
  - `memory:save <info>`
  - `memory:search <query>`
- **Keep commands:**
  - `memory:status`
  - `memory:clear`
- **Update status output:** Remove long-term memory section

#### Step 3.2: Simplify `main_loop.py`
- **Remove imports:** `LONGTERM_MEMORY_LIMIT`
- **Simplify `get_context()` calls:**
  ```python
  # Before (async with long-term):
  router_context = await memory.get_context(
      query=request,
      session_token_limit=ROUTER_TOKEN_LIMIT,
      longterm_limit=LONGTERM_MEMORY_LIMIT,
  )

  # After (sync, session only):
  router_context = memory.get_context(ROUTER_TOKEN_LIMIT)
  ```
- **Update both router and planner context calls**

### Phase 4: Backend - Clean Up Dependencies

#### Step 4.1: Update `requirements.txt`
- **Remove line:** `cognee                  # Knowledge graph memory system`

### Phase 5: Backend API - Add Placeholder Endpoints

#### Step 5.1: Update `web.py`
- Keep `SessionMemory` (already uses it)
- Add placeholder memory endpoints that return empty results:

```python
@app.get("/api/memory")
async def get_memories():
    """Get memories (placeholder - returns empty)."""
    return {"memories": [], "message": "Long-term memory not configured"}

@app.get("/api/memory/search")
async def search_memories(q: str = ""):
    """Search memories (placeholder - returns empty)."""
    return {"memories": [], "query": q, "message": "Long-term memory not configured"}
```

This prevents frontend errors while keeping the Memory Page functional.

---

## Files Summary

### DELETE (1 file)
- `backend/src/context/cognee_memory.py`

### MODIFY (6 files)
1. `backend/src/context/manager.py` - Major simplification
2. `backend/src/context/__init__.py` - Remove exports
3. `backend/src/core/config.py` - Remove Cognee settings
4. `backend/src/api/terminal.py` - Remove long-term commands
5. `backend/src/engine/main_loop.py` - Simplify context calls
6. `backend/requirements.txt` - Remove cognee dependency

### ADD (optional)
- `backend/src/api/web.py` - Add placeholder memory endpoints

### KEEP UNCHANGED
- `backend/src/context/session.py` - Session memory works great
- `frontend/js/pages/MemoryPage.js` - UI placeholder
- `frontend/js/services/api.js` - API methods
- `frontend/js/core/config.js` - Endpoints

---

## Post-Removal Testing

1. **Terminal Mode:**
   - Start: `python -m src.main`
   - Test: Basic queries work
   - Test: `memory:status` shows session stats
   - Test: `memory:clear` clears session
   - Test: Removed commands show as unknown

2. **Web Mode:**
   - Start: `python -m src.main web`
   - Test: WebSocket chat works
   - Test: `/api/status` returns correctly
   - Test: Memory page loads (shows empty state)

3. **Session Memory:**
   - Test: Follow-up queries use context ("How about Tokyo?" after weather query)

---

## Optional: Future Long-Term Memory

If you want to add long-term memory later, the `MemoryManager` pattern allows easy extension:

1. Create a new memory backend (e.g., SQLite, Redis, simple JSON file)
2. Inject it into `MemoryManager`
3. Re-add the `persist()` and `search_longterm()` methods

The session memory foundation remains solid.

---

## Estimated Effort

- **Deletion:** 1 file
- **Major edits:** 2 files (manager.py, terminal.py)
- **Minor edits:** 4 files
- **Testing:** ~15 minutes

---

## Ready for Execution

When ready, use `/refactor PLAN_remove_cognee.md` to execute this plan.
