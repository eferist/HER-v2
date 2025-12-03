# Session Memory: Implementation Guide for V2 Port

## Overview

This document answers two questions:
1. **How does the current session memory work?**
2. **How to implement it in V2?**

---

## Part 1: How Current Session Memory Works

### Architecture Summary

The current implementation uses a **token-based sliding window** approach:

```
User Request
     │
     ▼
┌──────────────────────────┐
│ SessionMemory            │
│ (stores conversation     │
│  turns with token count) │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ get_context(token_limit) │
│ → Returns recent turns   │
│   within token budget    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Inject context into      │
│ Router/Planner prompts   │
└──────────────────────────┘
```

### Key Components

#### 1. Data Structures

**Turn (Single Message)**
```python
@dataclass
class Turn:
    role: str      # "user" or "assistant"
    content: str   # message content
    tokens: int    # pre-computed token count
```

**SessionMemory (Conversation Container)**
```python
class SessionMemory:
    session_id: str
    _turns: List[Turn]  # chronological list of turns
    _encoder            # tiktoken encoder for counting
```

#### 2. Core Operations

**Adding a Turn**
```python
def add_turn(self, role: str, content: str) -> None:
    tokens = len(self._encoder.encode(content))
    self._turns.append(Turn(role=role, content=content, tokens=tokens))
```

**Getting Context (Sliding Window)**
```python
def get_context(self, token_limit: int) -> str:
    selected = []
    total_tokens = 0

    # Walk backwards from most recent
    for turn in reversed(self._turns):
        if total_tokens + turn.tokens <= token_limit:
            selected.insert(0, turn)
            total_tokens += turn.tokens
        elif total_tokens == 0:
            # Always include at least one turn
            selected.insert(0, turn)
            break
        else:
            break  # Stop, older turns are discarded

    return self._format_turns(selected)
```

**Format Output**
```
User: What's the weather in Jakarta?
Assistant: The weather in Jakarta is sunny, 32°C.
User: How about Tokyo?
```

#### 3. Where Sessions Are Stored

```python
class JITOrchestrator:
    _sessions: Dict[str, SessionMemory] = {}

    def _get_session(self, user_id: str) -> SessionMemory:
        if user_id not in self._sessions:
            self._sessions[user_id] = SessionMemory(session_id=user_id)
        return self._sessions[user_id]
```

#### 4. How Context Is Injected

**In the Router call:**
```python
session_context = session.get_context(token_limit=500)
route_decision = self.router.route(request, context=session_context)
```

**In the Planner call:**
```python
gen_context = session.get_context(token_limit=1000)
plan = generate_execution_plan(request, context=gen_context)
```

### Request Flow

```
1. User sends message
2. Add user message to SessionMemory
3. Get context (recent turns within token limit)
4. Inject context into Router prompt → get route decision
5. Inject context into Planner prompt → get execution plan
6. Execute plan
7. Add assistant response to SessionMemory
8. Return response to user
```

### Token Limits (Configurable)

| Component | Token Limit | Purpose |
|-----------|-------------|---------|
| Router    | 500 tokens  | Quick classification decision |
| Planner   | 1000 tokens | More context for planning |

---

## Part 2: How to Implement in V2

### V2 Architecture Reminder

```
Router → Planner → Executor → Synthesizer
```

Your V2 uses AGNO framework with MCP integration. The session memory should be added **around** this pipeline, not inside individual components.

### Implementation Plan

#### Step 1: Create Session Memory Module

**File: `src/orchestrator/session.py`**

```python
"""Token-based session memory for conversation context."""

from dataclasses import dataclass
from typing import List
import tiktoken


@dataclass
class Turn:
    """A single conversation turn."""
    role: str      # "user" or "assistant"
    content: str
    tokens: int


class SessionMemory:
    """Token-based sliding window conversation memory."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self._turns: List[Turn] = []
        self._encoder = tiktoken.get_encoding("cl100k_base")

    def add_turn(self, role: str, content: str) -> None:
        """Add a conversation turn."""
        tokens = len(self._encoder.encode(content))
        self._turns.append(Turn(role=role, content=content, tokens=tokens))

    def get_context(self, token_limit: int = 500) -> str:
        """Get recent conversation context within token limit."""
        if not self._turns:
            return ""

        selected: List[Turn] = []
        total_tokens = 0

        for turn in reversed(self._turns):
            if total_tokens + turn.tokens <= token_limit:
                selected.insert(0, turn)
                total_tokens += turn.tokens
            elif total_tokens == 0:
                # Always include at least one turn (even if over limit)
                selected.insert(0, turn)
                break
            else:
                break

        return self._format_turns(selected)

    def _format_turns(self, turns: List[Turn]) -> str:
        """Format turns as readable context string."""
        lines = []
        for turn in turns:
            role_label = "User" if turn.role == "user" else "Assistant"
            lines.append(f"{role_label}: {turn.content}")
        return "\n".join(lines)

    def clear(self) -> None:
        """Clear all turns."""
        self._turns.clear()

    @property
    def turn_count(self) -> int:
        return len(self._turns)
```

#### Step 2: Create Session Manager

**File: `src/orchestrator/session_manager.py`**

```python
"""Session manager for handling multiple user sessions."""

from typing import Dict, Optional
from .session import SessionMemory


class SessionManager:
    """Manages multiple user sessions."""

    def __init__(self):
        self._sessions: Dict[str, SessionMemory] = {}

    def get_session(self, user_id: str) -> SessionMemory:
        """Get or create session for user."""
        if user_id not in self._sessions:
            self._sessions[user_id] = SessionMemory(session_id=user_id)
        return self._sessions[user_id]

    def clear_session(self, user_id: str) -> None:
        """Clear a specific user's session."""
        if user_id in self._sessions:
            self._sessions[user_id].clear()

    def remove_session(self, user_id: str) -> None:
        """Remove a user's session entirely."""
        self._sessions.pop(user_id, None)
```

#### Step 3: Add Configuration

**File: `src/orchestrator/config.py`** (add these constants)

```python
# Session Memory Configuration
SESSION_TOKEN_LIMIT_ROUTER = 500      # Tokens for routing decision
SESSION_TOKEN_LIMIT_PLANNER = 1000    # Tokens for execution planning
```

#### Step 4: Integrate into Main Pipeline

**File: `src/orchestrator/main.py`** (modify your existing main)

```python
from .session_manager import SessionManager
from .config import SESSION_TOKEN_LIMIT_ROUTER, SESSION_TOKEN_LIMIT_PLANNER

class Orchestrator:
    def __init__(self):
        self.session_manager = SessionManager()
        self.router = Router()
        self.planner = Planner()
        self.mcp = MCPManager()
        self.synthesizer = Synthesizer()

    def process(self, message: str, user_id: str = "default") -> str:
        # 1. Get user's session
        session = self.session_manager.get_session(user_id)

        # 2. Add user message to session
        session.add_turn("user", message)

        # 3. Get context for router
        router_context = session.get_context(SESSION_TOKEN_LIMIT_ROUTER)

        # 4. Route with context
        route = self.router.route(message, context=router_context)

        # 5. Handle based on route
        if route.classification == "direct":
            response = route.response
        else:
            # Get context for planner (more tokens)
            planner_context = session.get_context(SESSION_TOKEN_LIMIT_PLANNER)

            # Plan with context
            plan = self.planner.plan(message, context=planner_context)

            # Execute
            results = self.executor.execute(plan)

            # Synthesize
            response = self.synthesizer.synthesize(message, results)

        # 6. Add response to session
        session.add_turn("assistant", response)

        return response
```

#### Step 5: Modify Router to Accept Context

**File: `src/orchestrator/router.py`**

```python
def route(self, request: str, context: str = "") -> RouteDecision:
    """Classify request with optional conversation context."""

    # Build prompt with context
    prompt = self._build_prompt(request, context)

    # Call LLM
    response = self.llm.invoke(prompt)

    return self._parse_response(response)

def _build_prompt(self, request: str, context: str) -> str:
    base_prompt = f"""Classify this request...

Request: {request}"""

    if context:
        return f"""Previous conversation:
{context}

{base_prompt}"""

    return base_prompt
```

#### Step 6: Modify Planner to Accept Context

**File: `src/orchestrator/planner.py`**

```python
def plan(self, request: str, context: str = "") -> ExecutionPlan:
    """Generate execution plan with conversation context."""

    prompt = self._build_prompt(request, context)
    response = self.llm.invoke(prompt)

    return self._parse_plan(response)

def _build_prompt(self, request: str, context: str) -> str:
    base_prompt = f"""Create execution plan for: {request}"""

    if context:
        return f"""Conversation context:
{context}

{base_prompt}"""

    return base_prompt
```

### Dependency

Add to your `requirements.txt`:
```
tiktoken>=0.5.0
```

### File Structure After Implementation

```
HER_V2/
├── src/
│   └── orchestrator/
│       ├── main.py            # Modified: integrate session
│       ├── router.py          # Modified: accept context
│       ├── planner.py         # Modified: accept context
│       ├── session.py         # NEW: SessionMemory class
│       ├── session_manager.py # NEW: SessionManager class
│       ├── config.py          # Modified: add token limits
│       ├── mcp.py
│       ├── synthesizer.py
│       └── executor/
```

---

## Quick Reference: What Goes Where

| Current V1 File | V2 Equivalent | Action |
|-----------------|---------------|--------|
| `memory/session.py` | `src/orchestrator/session.py` | Port the class |
| `agents/orchestrator.py` | `src/orchestrator/main.py` | Integrate session management |
| N/A | `src/orchestrator/session_manager.py` | Create new |
| `config.py` | `src/orchestrator/config.py` | Add token constants |

---

## Summary

**Current V1 Session Memory:**
- Token-based sliding window
- Pre-computed token counts per turn
- Injected as context string to Router/Planner
- Stored in-memory per user_id

**V2 Implementation Steps:**
1. Create `session.py` with `Turn` + `SessionMemory`
2. Create `session_manager.py` with `SessionManager`
3. Add token limit constants to config
4. Modify `main.py` to manage sessions
5. Modify `router.py` to accept context
6. Modify `planner.py` to accept context
7. Install `tiktoken` dependency

The implementation is straightforward - it's a **wrapper pattern** that adds context injection around your existing pipeline without modifying the core Router/Planner/Executor/Synthesizer architecture.
