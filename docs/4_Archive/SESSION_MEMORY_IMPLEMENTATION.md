# Session Memory Implementation Plan

## Goal

Add token-based sliding window session memory to V2 orchestrator so the AI can maintain context across conversation turns.

---

## Current V2 State

```
main.py
  └── orchestrate(request, mcp_manager, mcp_command)
          │
          ├── route(request)              ← No context
          ├── plan(request, available_tools)  ← No context
          ├── execute(plan, request, ...)
          └── return result
```

**Problem**: Each request is stateless. The AI forgets everything after each turn.

---

## Target State

```
main.py
  └── orchestrate(request, mcp_manager, session)
          │
          ├── session.add_turn("user", request)
          ├── context = session.get_context(token_limit)
          ├── route(request, context)         ← Has context
          ├── plan(request, available_tools, context)  ← Has context
          ├── execute(plan, request, ...)
          ├── session.add_turn("assistant", result)
          └── return result
```

---

## Implementation Steps

### Step 1: Create `session.py`

**File**: `src/orchestrator/session.py`

Contains:
- `Turn` dataclass - stores role, content, token count
- `SessionMemory` class - manages turns with sliding window

Key methods:
- `add_turn(role, content)` - adds message, computes tokens
- `get_context(token_limit)` - returns recent turns within budget
- `clear()` - resets session

Token counting: Use `tiktoken` with `cl100k_base` encoding (same as GPT-4/Claude).

### Step 2: Modify `router.py`

Change function signature:
```python
# Before
def route(request: str) -> RouteDecision:

# After
def route(request: str, context: str = "") -> RouteDecision:
```

Update prompt building:
- If context exists, prepend it to the classification prompt
- Format: "Previous conversation:\n{context}\n\n{base_prompt}"

### Step 3: Modify `planner.py`

Change function signature:
```python
# Before
def plan(request: str, available_tools: list[str]) -> ExecutionPlan:

# After
def plan(request: str, available_tools: list[str], context: str = "") -> ExecutionPlan:
```

Update prompt building:
- If context exists, include it so planner understands follow-up requests
- Format: "Conversation context:\n{context}\n\n{base_prompt}"

### Step 4: Modify `main.py`

Changes to `orchestrate()`:
1. Accept `session: SessionMemory` parameter
2. Call `session.add_turn("user", request)` at start
3. Get context: `context = session.get_context(token_limit)`
4. Pass context to `route()` and `plan()`
5. Call `session.add_turn("assistant", result)` at end

Changes to `run_terminal_async()`:
1. Create `SessionMemory` instance at startup
2. Pass session to `orchestrate()` for each request
3. Add command `memory:clear` to reset session
4. Add command `memory:status` to show turn count

### Step 5: Update `requirements.txt`

Add:
```
tiktoken>=0.5.0
```

---

## Token Budget Configuration

| Component | Token Limit | Rationale |
|-----------|-------------|-----------|
| Router    | 500 tokens  | Only needs recent context for classification |
| Planner   | 1000 tokens | Needs more context to understand follow-ups |

These can be constants in `main.py` or a separate config:
```python
ROUTER_TOKEN_LIMIT = 500
PLANNER_TOKEN_LIMIT = 1000
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/orchestrator/session.py` | **NEW** | Turn + SessionMemory classes |
| `src/orchestrator/router.py` | MODIFY | Add context parameter |
| `src/orchestrator/planner.py` | MODIFY | Add context parameter |
| `src/orchestrator/main.py` | MODIFY | Integrate session management |
| `requirements.txt` | MODIFY | Add tiktoken |

---

## New Terminal Commands

| Command | Action |
|---------|--------|
| `memory:clear` | Reset current session |
| `memory:status` | Show turns count / token usage |

---

## Session Flow Example

```
> What's the weather in Jakarta?
  → Session: [User: "What's the weather in Jakarta?"]
  → Route with context: "" (first turn)
  → Execute: gets weather
  → Session: [User: "...", Assistant: "32°C sunny..."]
  → Output: "The weather in Jakarta is 32°C and sunny."

> How about Tokyo?
  → Session: [User: "...", Assistant: "...", User: "How about Tokyo?"]
  → Route with context: "User: What's the weather in Jakarta?\nAssistant: 32°C..."
  → Router understands "How about Tokyo?" = weather query (from context)
  → Planner understands to get Tokyo weather
  → Execute: gets Tokyo weather
  → Session: [..., Assistant: "Tokyo is 18°C..."]
  → Output: "Tokyo is currently 18°C with cloudy skies."
```

---

## Edge Cases

1. **Very long responses**: If assistant response exceeds reasonable size, consider truncating before storing
2. **First turn**: Context will be empty string, functions should handle gracefully
3. **Token overflow**: Sliding window ensures old turns are dropped automatically

---

## Testing Checklist

- [ ] Basic conversation memory works
- [ ] Follow-up questions resolve correctly ("How about X?", "What about Y?")
- [ ] `memory:clear` resets context
- [ ] `memory:status` shows accurate count
- [ ] Token limits respected (old messages dropped)
- [ ] Empty context doesn't break router/planner

---

## Implementation Order

1. Create `session.py` (standalone, no dependencies on existing code)
2. Add `tiktoken` to requirements
3. Modify `router.py` (backward compatible with default `context=""`)
4. Modify `planner.py` (backward compatible with default `context=""`)
5. Modify `main.py` (wire everything together)
6. Test end-to-end

---

## Notes

- Single session per terminal instance (V2 is single-user CLI)
- In-memory only (no persistence across restarts)
- Can add persistence later if needed (pickle/json dump)
