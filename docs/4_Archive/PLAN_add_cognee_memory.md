# PLAN: Add Cognee Long-Term Memory

## Overview

Integrate Cognee as the long-term memory system for JIT Orchestrator. This will complement the existing `SessionMemory` (short-term) with a persistent knowledge graph that survives across sessions.

## Goals

1. Enable cross-session memory recall ("What did we discuss yesterday?")
2. Build a knowledge graph of user preferences, entities, and relationships
3. Maintain the modular architecture (Risang's sandbox)
4. Support local-first deployment (no cloud dependencies required)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MemoryManager                          │
│                   (Unified Interface)                       │
├─────────────────────────┬───────────────────────────────────┤
│   SessionMemory         │        CogneeMemory               │
│   (Short-Term)          │        (Long-Term)                │
├─────────────────────────┼───────────────────────────────────┤
│ • Token-based sliding   │ • Knowledge graph storage         │
│   window                │ • Entity/relationship extraction  │
│ • Current conversation  │ • Semantic search                 │
│ • Ephemeral             │ • Persistent across sessions      │
└─────────────────────────┴───────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         Cognee Engine         │
              ├───────────────────────────────┤
              │  Vector DB   │   Graph DB     │
              │  (LanceDB)   │  (NetworkX)    │
              └───────────────────────────────┘
```

## Implementation Phases

---

### Phase 1: Basic Setup & Integration

**Files to Create/Modify:**

| File | Action | Description |
|------|--------|-------------|
| `backend/requirements.txt` | Modify | Add `cognee>=0.3.5` |
| `backend/.env.example` | Modify | Add Cognee config vars |
| `backend/src/context/cognee_memory.py` | Create | Cognee wrapper class |
| `backend/src/context/manager.py` | Modify | Integrate CogneeMemory |
| `backend/src/context/__init__.py` | Modify | Export new class |

**Step 1.1: Install Cognee**

```bash
# In requirements.txt, add:
cognee>=0.3.5
```

**Step 1.2: Environment Configuration**

```bash
# In .env.example, add:

# Cognee Configuration
COGNEE_LLM_PROVIDER=openai          # or "ollama" for local
COGNEE_LLM_MODEL=gpt-4o-mini        # or "llama3" for local
COGNEE_VECTOR_DB=lancedb            # default, local
COGNEE_GRAPH_DB=networkx            # default, local
```

**Step 1.3: Create CogneeMemory Wrapper**

```python
# backend/src/context/cognee_memory.py
"""Long-term memory powered by Cognee knowledge graphs."""

import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

import cognee


@dataclass
class Memory:
    """A retrieved memory from long-term storage."""
    content: str
    relevance: float
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class CogneeMemory:
    """Long-term memory using Cognee's knowledge graph.

    Provides:
    - Persistent storage across sessions
    - Entity and relationship extraction
    - Semantic search with graph traversal
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize Cognee (call once at startup)."""
        if self._initialized:
            return

        # Cognee auto-configures from environment
        # Can add custom config here if needed
        self._initialized = True

    async def store(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Store content in long-term memory.

        Args:
            content: Text content to store
            metadata: Optional metadata (timestamp, type, etc.)
        """
        await self.initialize()

        # Add metadata prefix for context
        enriched = self._enrich_content(content, metadata)

        # Add to Cognee
        await cognee.add(enriched)

        # Build/update knowledge graph
        await cognee.cognify()

    async def recall(
        self,
        query: str,
        limit: int = 5
    ) -> List[Memory]:
        """Retrieve relevant memories for a query.

        Args:
            query: Search query
            limit: Maximum number of results

        Returns:
            List of relevant memories
        """
        await self.initialize()

        results = await cognee.search(query)

        # Convert to Memory objects
        memories = []
        for i, result in enumerate(results[:limit]):
            memories.append(Memory(
                content=str(result),
                relevance=1.0 - (i * 0.1),  # Simple relevance decay
                metadata={"source": "cognee"}
            ))

        return memories

    async def recall_formatted(
        self,
        query: str,
        limit: int = 5
    ) -> str:
        """Retrieve memories as formatted string for LLM context.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            Formatted string of relevant memories
        """
        memories = await self.recall(query, limit)

        if not memories:
            return ""

        lines = ["[Relevant memories from past conversations:]"]
        for mem in memories:
            lines.append(f"- {mem.content}")

        return "\n".join(lines)

    def _enrich_content(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]]
    ) -> str:
        """Add metadata context to content before storage."""
        if not metadata:
            return content

        # Add timestamp if present
        if "timestamp" in metadata:
            return f"[{metadata['timestamp']}] {content}"

        return content

    async def clear(self) -> None:
        """Clear all memories (use with caution)."""
        await cognee.prune.prune_data()
        await cognee.prune.prune_system(metadata=True)
```

**Step 1.4: Update MemoryManager**

```python
# backend/src/context/manager.py
"""Unified memory manager - session + long-term memory."""

from typing import Optional

from .session import SessionMemory
from .cognee_memory import CogneeMemory


class MemoryManager:
    """Unified interface for memory systems.

    Provides:
    - SessionMemory: Short-term sliding window (current conversation)
    - CogneeMemory: Long-term knowledge graph (cross-session)

    This is the single point of access for memory in the orchestration engine.
    """

    def __init__(self, session_id: str = "default", user_id: str = "default"):
        self.session = SessionMemory(session_id=session_id)
        self.long_term = CogneeMemory(user_id=user_id)
        self._long_term_enabled = True

    def add_turn(self, role: str, content: str) -> None:
        """Add a conversation turn to session memory.

        Args:
            role: "user" or "assistant"
            content: The message content
        """
        self.session.add_turn(role, content)

    async def store_memory(self, content: str, metadata: dict = None) -> None:
        """Store content in long-term memory.

        Args:
            content: Content to remember
            metadata: Optional metadata
        """
        if self._long_term_enabled:
            await self.long_term.store(content, metadata)

    async def recall_memories(self, query: str, limit: int = 5) -> str:
        """Recall relevant long-term memories.

        Args:
            query: Search query
            limit: Max results

        Returns:
            Formatted memory string
        """
        if not self._long_term_enabled:
            return ""
        return await self.long_term.recall_formatted(query, limit)

    def get_context(self, token_limit: int = 500) -> str:
        """Get session conversation context within token limit.

        Args:
            token_limit: Maximum tokens

        Returns:
            Session context string
        """
        return self.session.get_context(token_limit)

    async def get_hybrid_context(
        self,
        query: str,
        session_tokens: int = 300,
        memory_limit: int = 3
    ) -> str:
        """Get hybrid context: session + long-term memories.

        Args:
            query: Current query for memory recall
            session_tokens: Token budget for session context
            memory_limit: Max long-term memories to include

        Returns:
            Combined context string
        """
        session_ctx = self.session.get_context(session_tokens)
        memory_ctx = await self.recall_memories(query, memory_limit)

        parts = []
        if memory_ctx:
            parts.append(memory_ctx)
        if session_ctx:
            parts.append(f"[Current conversation:]\n{session_ctx}")

        return "\n\n".join(parts)

    def clear(self) -> None:
        """Clear session memory only."""
        self.session.clear()

    async def clear_all(self) -> None:
        """Clear both session and long-term memory."""
        self.session.clear()
        await self.long_term.clear()

    def status(self) -> dict:
        """Get status of memory systems.

        Returns:
            Dictionary with memory stats
        """
        return {
            "session": {
                "turns": self.session.turn_count,
                "tokens": self.session.total_tokens,
            },
            "long_term": {
                "enabled": self._long_term_enabled,
                "provider": "cognee"
            }
        }
```

---

### Phase 2: Orchestration Integration

**Files to Modify:**

| File | Action | Description |
|------|--------|-------------|
| `backend/src/engine/main_loop.py` | Modify | Use hybrid context |
| `backend/src/api/terminal.py` | Modify | Add memory commands |
| `backend/src/api/web.py` | Modify | Add memory endpoints |

**Step 2.1: Update Main Loop**

Key changes to `orchestrate()`:

```python
# In main_loop.py

# Before routing - recall relevant memories
if memory and memory._long_term_enabled:
    long_term_ctx = await memory.recall_memories(request, limit=3)
    if long_term_ctx:
        router_context = f"{long_term_ctx}\n\n{router_context}"

# After successful response - store important interactions
if memory and should_store_memory(request, result):
    await memory.store_memory(
        f"User asked: {request}\nAssistant answered: {result[:500]}",
        metadata={"timestamp": datetime.now().isoformat()}
    )
```

**Step 2.2: Memory Selection Logic**

```python
def should_store_memory(request: str, response: str) -> bool:
    """Determine if an interaction is worth storing long-term.

    Store if:
    - User shares preferences ("I prefer...", "I like...")
    - User shares facts ("My name is...", "I work at...")
    - Significant task completion
    - User explicitly asks to remember

    Skip if:
    - Simple greetings
    - One-word responses
    - Error responses
    """
    # Keywords indicating memorable content
    memory_triggers = [
        "remember", "don't forget", "my name", "i prefer",
        "i like", "i work", "i live", "always", "never"
    ]

    request_lower = request.lower()

    # Check for explicit memory triggers
    for trigger in memory_triggers:
        if trigger in request_lower:
            return True

    # Skip very short interactions
    if len(request) < 20 or len(response) < 50:
        return False

    # Skip error responses
    if "error" in response.lower() or "apologize" in response.lower():
        return False

    return False  # Conservative: don't store by default
```

**Step 2.3: New Terminal Commands**

```python
# Add to terminal.py command handling

elif user_input == "memory:recall":
    query = input("Search query: ")
    memories = await memory.recall_memories(query)
    print(memories if memories else "No memories found.")

elif user_input == "memory:store":
    content = input("What to remember: ")
    await memory.store_memory(content)
    print("Stored in long-term memory.")

elif user_input == "memory:clear-all":
    confirm = input("Clear ALL memory (session + long-term)? [y/N]: ")
    if confirm.lower() == "y":
        await memory.clear_all()
        print("All memory cleared.")
```

---

### Phase 3: Advanced Features

**Step 3.1: Intelligent Memory Routing**

Create a dedicated memory agent that decides what to store:

```python
# backend/src/context/memory_agent.py
"""Intelligent memory management using LLM."""

from agno.agent import Agent
from src.core.models import get_model


class MemoryAgent:
    """Uses LLM to determine memory operations."""

    def __init__(self):
        self.model = get_model("router")  # Use lightweight model

    def should_remember(self, interaction: str) -> tuple[bool, str]:
        """Determine if interaction should be stored.

        Returns:
            (should_store, summary_if_yes)
        """
        agent = Agent(
            name="MemoryFilter",
            model=self.model,
            instructions="""Analyze this interaction. Determine if it contains:
            1. User preferences or personal info
            2. Important facts or decisions
            3. Requests to remember something

            Respond with JSON:
            {"store": true/false, "summary": "one-line summary if storing"}
            """
        )

        result = agent.run(interaction)
        # Parse and return
        ...
```

**Step 3.2: Memory UI Page**

Update the frontend Memory page (currently placeholder):

```javascript
// frontend/js/pages/MemoryPage.js
class MemoryPage extends BasePage {
    async mount() {
        // Display memory stats
        // Search memories
        // View knowledge graph visualization
        // Manual store/delete
    }
}
```

**Step 3.3: Periodic Memory Maintenance**

```python
# backend/src/context/maintenance.py
"""Memory maintenance tasks."""

async def prune_old_memories(days: int = 30):
    """Remove memories older than N days."""
    ...

async def consolidate_memories():
    """Merge similar/redundant memories."""
    await cognee.memify()  # Uses Cognee's built-in optimization

async def export_memories(path: str):
    """Export memories for backup."""
    ...
```

---

## Testing Plan

### Unit Tests

```python
# tests/test_cognee_memory.py

import pytest
from src.context.cognee_memory import CogneeMemory

@pytest.mark.asyncio
async def test_store_and_recall():
    memory = CogneeMemory(user_id="test")

    await memory.store("User prefers Python over JavaScript")
    results = await memory.recall("programming language preference")

    assert len(results) > 0
    assert "Python" in results[0].content

@pytest.mark.asyncio
async def test_empty_recall():
    memory = CogneeMemory(user_id="test_empty")
    results = await memory.recall("nonexistent topic")
    assert results == []
```

### Integration Tests

```python
# tests/test_memory_integration.py

@pytest.mark.asyncio
async def test_orchestrator_with_memory():
    """Test that memory persists across orchestration calls."""
    memory = MemoryManager(user_id="integration_test")

    # First interaction
    await orchestrate(
        "My favorite color is blue",
        memory=memory
    )

    # Second interaction should recall
    result = await orchestrate(
        "What's my favorite color?",
        memory=memory
    )

    assert "blue" in result.lower()
```

---

## Rollout Strategy

### Week 1: Foundation
- [ ] Add Cognee dependency
- [ ] Create `CogneeMemory` wrapper
- [ ] Update `MemoryManager`
- [ ] Basic unit tests

### Week 2: Integration
- [ ] Update `main_loop.py` for hybrid context
- [ ] Add terminal commands
- [ ] Add memory selection logic
- [ ] Integration tests

### Week 3: Polish
- [ ] Update Memory UI page
- [ ] Add maintenance scripts
- [ ] Performance testing
- [ ] Documentation

---

## Configuration Reference

### Environment Variables

```bash
# .env

# === Cognee Configuration ===

# LLM Provider (openai, anthropic, ollama)
COGNEE_LLM_PROVIDER=openai
COGNEE_LLM_MODEL=gpt-4o-mini

# For local Ollama setup:
# COGNEE_LLM_PROVIDER=ollama
# COGNEE_LLM_MODEL=llama3
# OLLAMA_HOST=http://localhost:11434

# Vector Database (lancedb, qdrant, pgvector, weaviate)
COGNEE_VECTOR_DB=lancedb

# Graph Database (networkx, neo4j)
COGNEE_GRAPH_DB=networkx

# For Neo4j:
# COGNEE_GRAPH_DB=neo4j
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=password

# Storage path for local databases
COGNEE_DATA_DIR=./data/cognee
```

---

## Success Criteria

1. **Functional**: Can store and recall memories across sessions
2. **Performance**: Recall latency < 2 seconds for typical queries
3. **Accuracy**: Relevant memories returned for 80%+ of queries
4. **Stability**: No crashes or memory leaks in 24hr run
5. **UX**: Seamless integration - users don't need to manage memory manually

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cognee API changes | Pin version, wrap in abstraction layer |
| Storage growth | Implement pruning, set size limits |
| Slow cognify | Run async, batch updates |
| Privacy concerns | Add user isolation, data encryption |
| LLM costs | Use local Ollama, cache embeddings |

---

## References

- [Cognee Documentation](https://docs.cognee.ai)
- [Cognee GitHub](https://github.com/topoteretes/cognee)
- [Cognee MCP Integration](https://www.cognee.ai/blog/cognee-news/introducing-cognee-mcp)
