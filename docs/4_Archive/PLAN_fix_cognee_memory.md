# PLAN: Fix Cognee Long-Term Memory Integration

## Problem Statement

The Cognee long-term memory is **not working** because:

1. **Missing LLM/Embedding Provider Configuration** - Cognee defaults to OpenAI when not configured, but we use Gemini
2. **No EMBEDDING_PROVIDER set** - Causes fallback to OpenAI embeddings (fails without OpenAI key)
3. **Environment variables not passed to Cognee** - The `.env` has `GOOGLE_API_KEY` but Cognee expects `LLM_API_KEY`

## Solution Overview

Configure Cognee to use **Gemini 2.5 Flash** for both LLM and embeddings by:
1. Adding Cognee-specific env vars to `.env`
2. Updating `cognee_memory.py` to properly initialize configuration
3. Testing the integration

---

## Implementation Steps

### Step 1: Update Environment Variables

**File:** `backend/.env`

Add the following Cognee configuration section:

```env
# === COGNEE MEMORY CONFIGURATION ===
LLM_PROVIDER=gemini
LLM_MODEL=gemini/gemini-2.5-flash
LLM_API_KEY=${GOOGLE_API_KEY}

EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini/text-embedding-004
EMBEDDING_DIMENSIONS=768
EMBEDDING_API_KEY=${GOOGLE_API_KEY}

# Storage (file-based defaults, no external DB needed)
GRAPH_DATABASE_PROVIDER=kuzu
VECTOR_DB_PROVIDER=lancedb
```

**Note:** We can either use `${GOOGLE_API_KEY}` reference or duplicate the key directly. The safer approach is to set `LLM_API_KEY` to the same value as `GOOGLE_API_KEY`.

---

### Step 2: Update CogneeMemory Initialization

**File:** `backend/src/context/cognee_memory.py`

Update the `initialize()` method to:
1. Map `GOOGLE_API_KEY` to Cognee's expected env vars
2. Set provider configuration before importing Cognee internals
3. Add proper error handling with clear messages

**Changes:**

```python
async def initialize(self) -> None:
    """Initialize Cognee with project settings."""
    if self._initialized:
        return

    try:
        import os

        # === CONFIGURE COGNEE BEFORE IMPORT ===
        google_key = os.environ.get("GOOGLE_API_KEY")

        if google_key:
            # LLM Configuration (Gemini 2.5 Flash)
            os.environ.setdefault("LLM_PROVIDER", "gemini")
            os.environ.setdefault("LLM_MODEL", "gemini/gemini-2.5-flash")
            os.environ.setdefault("LLM_API_KEY", google_key)

            # Embedding Configuration (Gemini)
            os.environ.setdefault("EMBEDDING_PROVIDER", "gemini")
            os.environ.setdefault("EMBEDDING_MODEL", "gemini/text-embedding-004")
            os.environ.setdefault("EMBEDDING_DIMENSIONS", "768")
            os.environ.setdefault("EMBEDDING_API_KEY", google_key)

            # Storage (file-based defaults)
            os.environ.setdefault("GRAPH_DATABASE_PROVIDER", "kuzu")
            os.environ.setdefault("VECTOR_DB_PROVIDER", "lancedb")
        else:
            print("[CogneeMemory] Warning: GOOGLE_API_KEY not set. Cognee may fail.")

        # Now import Cognee (after env is configured)
        import cognee
        from cognee.api.v1.search import SearchType

        self._cognee = cognee
        self._search_type = SearchType

        # Configure data directory if specified
        if self.data_dir:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            os.environ["COGNEE_DATA_DIR"] = str(self.data_dir)

        self._initialized = True
        print(f"[CogneeMemory] Initialized with Gemini 2.5 Flash")
        print(f"[CogneeMemory] Dataset: {self.dataset_name}")

    except ImportError as e:
        print(f"[CogneeMemory] Warning: cognee not installed. {e}")
        self._initialized = False
    except Exception as e:
        print(f"[CogneeMemory] Initialization error: {e}")
        self._initialized = False
```

---

### Step 3: Add Multiple Search Type Support

**File:** `backend/src/context/cognee_memory.py`

Enhance the `search()` method to support different search strategies:

```python
async def search(
    self,
    query: str,
    limit: int = 5,
    search_type: str = "CHUNKS"
) -> List[Memory]:
    """Search long-term memory for relevant information.

    Args:
        query: The search query
        limit: Maximum number of results
        search_type: One of CHUNKS, INSIGHTS, GRAPH_COMPLETION, RAG_COMPLETION

    Returns:
        List of relevant memories
    """
    if not self._initialized or not self._cognee:
        return []

    try:
        # Map string to SearchType enum
        type_map = {
            "CHUNKS": self._search_type.CHUNKS,
            "INSIGHTS": self._search_type.INSIGHTS,
            "SUMMARIES": self._search_type.SUMMARIES,
            "GRAPH_COMPLETION": self._search_type.GRAPH_COMPLETION,
            "RAG_COMPLETION": self._search_type.RAG_COMPLETION,
        }

        query_type = type_map.get(search_type.upper(), self._search_type.CHUNKS)

        results = await self._cognee.search(
            query_text=query,
            query_type=query_type,
            datasets=[self.dataset_name],
            top_k=limit
        )

        memories = []
        for i, result in enumerate(results[:limit]):
            content = self._extract_content(result)
            score = getattr(result, 'score', 1.0 - (i * 0.1))
            metadata = self._extract_metadata(result)
            memories.append(Memory(content=content, score=score, metadata=metadata))

        return memories

    except Exception as e:
        print(f"[CogneeMemory] Error searching: {e}")
        return []
```

---

### Step 4: Update Manager to Pass Search Type

**File:** `backend/src/context/manager.py`

Update `search_longterm()` to accept search type:

```python
async def search_longterm(
    self,
    query: str,
    limit: int = 5,
    search_type: str = "CHUNKS"
) -> List[Memory]:
    """Search long-term memory directly.

    Args:
        query: Search query
        limit: Maximum results
        search_type: CHUNKS, INSIGHTS, or GRAPH_COMPLETION

    Returns:
        List of relevant memories
    """
    if not self.cognee or not self._longterm_initialized:
        return []

    return await self.cognee.search(query, limit, search_type)
```

---

### Step 5: Create Test Script

**File:** `backend/test_cognee.py`

```python
#!/usr/bin/env python3
"""Test Cognee integration standalone."""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Load .env
from dotenv import load_dotenv
load_dotenv()

async def test_cognee():
    """Test Cognee memory operations."""
    from context.cognee_memory import CogneeMemory

    print("=" * 50)
    print("COGNEE MEMORY TEST")
    print("=" * 50)

    # Initialize
    memory = CogneeMemory(dataset_name="test_memory")
    await memory.initialize()

    if not memory.is_available:
        print("FAILED: Cognee not available")
        return False

    print("\n[1] Clearing previous test data...")
    await memory.clear()

    print("\n[2] Adding test memories...")
    await memory.add("The user's favorite color is blue.")
    await memory.add("The user works as a software developer in Jakarta.")
    await memory.add("The user has a cat named Whiskers.")

    print("\n[3] Searching memories...")

    # Test CHUNKS search
    print("\n--- CHUNKS Search: 'favorite color' ---")
    results = await memory.search("What is the favorite color?", limit=3, search_type="CHUNKS")
    for r in results:
        print(f"  - {r.content}")

    # Test INSIGHTS search
    print("\n--- INSIGHTS Search: 'user information' ---")
    results = await memory.search("Tell me about the user", limit=3, search_type="INSIGHTS")
    for r in results:
        print(f"  - {r.content}")

    print("\n[4] Listing all memories...")
    all_memories = await memory.list_all()
    print(f"  Total memories: {len(all_memories)}")
    for m in all_memories:
        print(f"  - {m.content[:50]}...")

    print("\n" + "=" * 50)
    print("TEST COMPLETE")
    print("=" * 50)
    return True

if __name__ == "__main__":
    success = asyncio.run(test_cognee())
    sys.exit(0 if success else 1)
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/.env` | EDIT | Add Cognee LLM/Embedding configuration |
| `backend/src/context/cognee_memory.py` | EDIT | Update initialize() with proper config |
| `backend/src/context/manager.py` | EDIT | Add search_type parameter |
| `backend/test_cognee.py` | CREATE | Standalone test script |

---

## Testing Plan

1. **Run standalone test:**
   ```bash
   cd backend
   source ../venv/bin/activate
   python test_cognee.py
   ```

2. **Verify in terminal mode:**
   ```bash
   python -m src.main
   > memory:save The user loves Python programming
   > memory:search What does the user love?
   ```

3. **Verify in web mode:**
   - Start backend: `python -m src.main web`
   - Open Memory page in frontend
   - Save and search memories

---

## Success Criteria

- [ ] `test_cognee.py` runs without errors
- [ ] `memory:save` successfully adds to knowledge graph
- [ ] `memory:search` returns relevant results
- [ ] Memory page in web UI shows saved memories
- [ ] No OpenAI API errors (all using Gemini)

---

## Rollback Plan

If the fix doesn't work:
1. Revert changes to `cognee_memory.py` and `manager.py`
2. Remove Cognee env vars from `.env`
3. Long-term memory will be disabled (graceful fallback already exists)

---

*Plan ready for implementation via `/build PLAN_fix_cognee_memory.md`*
