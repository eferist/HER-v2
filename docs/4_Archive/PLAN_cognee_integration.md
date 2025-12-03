# Implementation Plan: Cognee Long-Term Memory Integration

## Goal

Integrate Cognee as the **long-term memory system** for HER_V2, giving the AI persistent knowledge across sessions.

---

## Constitution Compliance

This plan adheres to the three principles from `REFACTORING.md`:

| Principle | How We Comply |
|-----------|---------------|
| **Sandbox Ownership** | All Cognee code lives in `src/context/` (Risang's sandbox) |
| **Headless Engine** | Memory is accessed via the engine, no UI code in memory module |
| **Utilitarian Mandate** | We're adding this to enable persistent memory, not just to refactor |

---

## Architecture Overview

### Current State (Short-Term Only)

```
User Query → Router → Planner → Executor → Response
                ↑
          SessionMemory
         (sliding window)
         (forgets after session)
```

### Future State (Short-Term + Long-Term)

```
User Query → Router → Planner → Executor → Response
                ↑         ↑
          SessionMemory   │
         (sliding window) │
                ↑         │
                └─────────┤
                          │
                    MemoryManager
                     ┌────┴────┐
                     │         │
              SessionMemory  CogneeMemory
              (short-term)   (long-term)
              (this session) (forever)
```

---

## Project Structure (Updated)

```
backend/src/
├── context/                    # RISANG'S SANDBOX - Memory Systems
│   ├── __init__.py            # Exports MemoryManager
│   ├── session.py             # EXISTING - Short-term sliding window
│   ├── cognee_memory.py       # NEW - Long-term Cognee wrapper
│   └── manager.py             # NEW - Unified memory interface
│
├── core/                       # Shared (no changes)
│   ├── config.py              # ADD: Cognee settings
│   └── ...
│
├── engine/                     # Core loop
│   └── main_loop.py           # UPDATE: Use MemoryManager
│
├── orchestration/              # Ahimsa's sandbox (minimal changes)
│   ├── router.py              # UPDATE: Receive long-term context
│   └── planner.py             # UPDATE: Receive long-term context
│
├── api/                        # Noel's sandbox
│   ├── terminal.py            # UPDATE: Memory commands
│   └── web.py                 # UPDATE: Memory API endpoints
│
└── tools/                      # Noel's sandbox (no changes)
```

---

## New Files

### 1. `src/context/cognee_memory.py`

**Purpose:** Wrapper around Cognee for long-term memory operations.

**Responsibilities:**
- Initialize Cognee with project settings
- Add information to knowledge graph
- Search/retrieve relevant memories
- Handle Cognee lifecycle

**Interface:**
```python
class CogneeMemory:
    async def initialize() -> None
    async def add(content: str, metadata: dict) -> None
    async def search(query: str, limit: int) -> List[Memory]
    async def clear() -> None
```

### 2. `src/context/manager.py`

**Purpose:** Unified interface combining short-term and long-term memory.

**Responsibilities:**
- Coordinate between SessionMemory and CogneeMemory
- Provide single `get_context()` that merges both
- Decide what to persist to long-term memory

**Interface:**
```python
class MemoryManager:
    session: SessionMemory      # Short-term
    cognee: CogneeMemory        # Long-term

    async def get_context(token_limit: int) -> str
    async def add_turn(role: str, content: str) -> None
    async def persist_important(content: str) -> None
```

---

## Integration Points

### 1. Engine (`main_loop.py`)

**Current:**
```python
session: Optional[SessionMemory] = None
```

**Updated:**
```python
memory: Optional[MemoryManager] = None
```

The engine calls `memory.get_context()` which returns combined short+long term context.

### 2. Router & Planner

**Current:** Receive `context` string from SessionMemory only.

**Updated:** Receive enriched context that includes:
- Recent conversation (SessionMemory)
- Relevant long-term memories (CogneeMemory)

No code changes needed in router/planner - they just receive a richer context string.

### 3. Config (`core/config.py`)

**Add:**
```python
# Cognee Settings
COGNEE_DATA_DIR = ".cognee_data"
COGNEE_LLM_PROVIDER = "openai"  # or use existing provider
LONG_TERM_MEMORY_ENABLED = True
```

---

## Memory Flow

### On User Message

```
1. User sends message
2. SessionMemory.add_turn("user", message)
3. CogneeMemory.search(message) → relevant memories
4. Merge: session context + long-term memories
5. Pass merged context to Router/Planner
```

### On Assistant Response

```
1. Assistant generates response
2. SessionMemory.add_turn("assistant", response)
3. Analyze if response contains important info
4. If important → CogneeMemory.add(info)
```

### What Gets Persisted?

Not everything should go to long-term memory. Persist:
- User preferences ("I prefer dark mode")
- Facts about user ("I live in Tokyo")
- Important decisions made
- Key information from tool results

---

## Terminal Commands (Updated)

| Command | Action |
|---------|--------|
| `memory:status` | Show session + Cognee stats |
| `memory:clear` | Clear session only |
| `memory:clear-all` | Clear session + Cognee |
| `memory:search <query>` | Search long-term memory |
| `memory:save <info>` | Manually save to long-term |

---

## Web API Endpoints (New)

| Endpoint | Method | Action |
|----------|--------|--------|
| `/memory/status` | GET | Memory stats |
| `/memory/search` | POST | Search long-term |
| `/memory/save` | POST | Save to long-term |
| `/memory/clear` | DELETE | Clear memories |

---

## Dependencies

Add to `requirements.txt`:
```
cognee
```

Cognee brings its own dependencies (LanceDB, Kuzu, etc.).

---

## Implementation Phases

### Phase 1: Foundation
- Install Cognee
- Create `cognee_memory.py` with basic add/search
- Create `manager.py` to wrap both memory types
- Update `config.py` with Cognee settings

### Phase 2: Integration
- Update `main_loop.py` to use MemoryManager
- Context now includes long-term memories
- Test with basic queries

### Phase 3: Persistence Logic
- Add logic to decide what to persist
- Implement automatic extraction of important info
- Test memory retention across sessions

### Phase 4: Commands & API
- Add terminal commands
- Add web API endpoints
- Test full flow

### Phase 5: UI (Future)
- Add Knowledge Graph visualization to frontend
- Memory management UI

---

## Testing Checklist

- [ ] Cognee initializes without errors
- [ ] Can add information to Cognee
- [ ] Can search and retrieve from Cognee
- [ ] Session memory still works as before
- [ ] Combined context is properly formatted
- [ ] Router receives enriched context
- [ ] Planner receives enriched context
- [ ] Terminal commands work
- [ ] Web API endpoints work
- [ ] Memory persists after restart

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cognee adds latency | Make long-term search async, cache results |
| Context gets too long | Set token limits for long-term portion |
| What to persist is unclear | Start simple, iterate based on usage |
| Cognee DB corruption | Store in dedicated `.cognee_data/` folder |

---

## Success Criteria

1. AI remembers user preferences across sessions
2. AI can recall past conversations relevantly
3. No degradation in response time (< 500ms added)
4. Clean separation of concerns maintained
5. All existing functionality works unchanged

---

## Summary

This plan adds Cognee as the long-term memory layer while:
- Keeping all memory code in `src/context/` (Risang's sandbox)
- Maintaining the headless engine principle
- Minimizing changes to existing orchestration code
- Providing a clean unified interface via MemoryManager

The existing SessionMemory becomes the "short-term" layer, and Cognee becomes the "long-term" layer, working together seamlessly.
