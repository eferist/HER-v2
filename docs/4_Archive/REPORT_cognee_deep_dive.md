# Cognee Deep Dive Research Report

**Date:** December 4, 2025
**Status:** Critical Gaps Identified
**Severity:** HIGH - Memory not persisting correctly

---

## Executive Summary

After deep research into the Cognee framework (via your `cluster/cognee` folder and official docs), I've identified **several critical gaps** in our implementation that explain why "NAMAKU NOEL, TOLONG INGAT DALAM MEMORY" was not remembered.

**Root Causes:**
1. We're not using the full Cognee API correctly
2. We're missing `SearchType` parameter in searches
3. We have no way to list/fetch all memories
4. The 422 error is a symptom of incomplete implementation

---

## What Cognee Actually Is

Cognee is **NOT a simple key-value memory store**. It's a full **Knowledge Graph + Vector Database** system that:

1. **Ingests** raw data (`cognee.add()`)
2. **Processes** into knowledge graph via LLM (`cognee.cognify()`)
3. **Optionally adds memory algorithms** (`cognee.memify()`)
4. **Searches** using multiple strategies (`cognee.search()` with `SearchType`)

```
Raw Text → add() → cognify() → Knowledge Graph → search() → Results
                        ↓
              Entity Extraction (LLM)
              Relationship Building
              Vector Embeddings
              Summaries Generation
```

---

## Our Current Implementation vs Correct Usage

### Gap 1: Missing SearchType Parameter

**Our Code (`cognee_memory.py:95`):**
```python
results = await self._cognee.search(query)
```

**Correct Usage:**
```python
from cognee.api.v1.search import SearchType

results = await self._cognee.search(
    query_text=query,
    query_type=SearchType.CHUNKS,  # or GRAPH_COMPLETION
    datasets=[self.dataset_name]
)
```

**Impact:** Without `SearchType`, Cognee defaults to `GRAPH_COMPLETION` which requires LLM processing. For simple memory retrieval, `CHUNKS` is faster and more direct.

---

### Gap 2: No Dataset Scoping

**Our Code:**
```python
await self._cognee.search(query)  # Searches ALL datasets
```

**Correct Usage:**
```python
await self._cognee.search(
    query_text=query,
    query_type=SearchType.CHUNKS,
    datasets=[self.dataset_name]  # Scope to our dataset
)
```

**Impact:** Searches may return irrelevant data from other datasets or fail if no datasets exist.

---

### Gap 3: No "Get All Memories" Method

Cognee doesn't have a simple "get all" endpoint. But it **does** provide:

```python
# List all datasets
datasets = await cognee.datasets.list_datasets()

# List data in a dataset
data = await cognee.datasets.list_data(dataset_id)
```

**Impact:** Our frontend tries to call `/api/memory/search?q=` with empty query, which fails the `min_length=1` validation. We need a separate endpoint to list memories.

---

### Gap 4: Missing Initialization/Configuration

**Cognee requires environment variables:**
```bash
LLM_API_KEY=your_openai_key      # REQUIRED for cognify & GRAPH_COMPLETION
LLM_PROVIDER=openai              # Optional, defaults to openai
VECTOR_DB_PROVIDER=lancedb       # Optional, defaults to lancedb
GRAPH_DATABASE_PROVIDER=kuzu     # Optional, defaults to kuzu
```

**Our Code:** We set `COGNEE_DATA_DIR` but not the LLM key configuration.

**Impact:** If `LLM_API_KEY` isn't set, `cognify()` fails silently and no knowledge graph is created.

---

### Gap 5: Incorrect Result Parsing

**Cognee Search Results Format (depends on SearchType):**

| SearchType | Returns |
|------------|---------|
| `CHUNKS` | List of text chunks with metadata |
| `GRAPH_COMPLETION` | List of AI-generated responses |
| `SUMMARIES` | List of hierarchical summaries |
| `INSIGHTS` | Entity relationships |

**Our Code** tries to handle all formats generically, which may miss structured data:

```python
if hasattr(result, 'content'):
    content = result.content
elif hasattr(result, 'text'):
    content = result.text
# ...
```

**Better Approach:** Use `SearchType.CHUNKS` for predictable structure.

---

## Available SearchTypes (from source code)

```python
class SearchType(Enum):
    SUMMARIES = "SUMMARIES"              # Pre-generated summaries
    CHUNKS = "CHUNKS"                    # Raw text segments (fastest)
    RAG_COMPLETION = "RAG_COMPLETION"    # Traditional RAG
    GRAPH_COMPLETION = "GRAPH_COMPLETION"  # Full graph + LLM (default)
    GRAPH_SUMMARY_COMPLETION = "GRAPH_SUMMARY_COMPLETION"
    CODE = "CODE"                        # Code-specific search
    CYPHER = "CYPHER"                    # Direct graph queries
    NATURAL_LANGUAGE = "NATURAL_LANGUAGE"
    GRAPH_COMPLETION_COT = "GRAPH_COMPLETION_COT"  # Chain of thought
    GRAPH_COMPLETION_CONTEXT_EXTENSION = "GRAPH_COMPLETION_CONTEXT_EXTENSION"
    FEELING_LUCKY = "FEELING_LUCKY"      # Auto-selects best type
    FEEDBACK = "FEEDBACK"
    TEMPORAL = "TEMPORAL"                # Time-aware filtering
    CODING_RULES = "CODING_RULES"
    CHUNKS_LEXICAL = "CHUNKS_LEXICAL"    # Lexical/token matching
```

---

## Cognee Datasets API (Key Discovery!)

```python
# List all datasets for current user
datasets = await cognee.datasets.list_datasets()

# List all data in a specific dataset
data = await cognee.datasets.list_data(dataset_id)

# Check if dataset has data
has_data = await cognee.datasets.has_data(dataset_id)

# Delete a dataset
await cognee.datasets.delete_dataset(dataset_id)
```

**This is how we should implement "get all memories"!**

---

## Correct Cognee Workflow (from examples)

```python
import cognee
from cognee.api.v1.search import SearchType

async def main():
    # 1. Reset (optional, for testing)
    await cognee.prune.prune_data()

    # 2. Add data to a dataset
    await cognee.add("My name is Noel", dataset_name="her_memory")

    # 3. Process into knowledge graph (REQUIRES LLM_API_KEY)
    await cognee.cognify(datasets=["her_memory"])

    # 4. Search with specific type
    results = await cognee.search(
        query_text="What is my name?",
        query_type=SearchType.GRAPH_COMPLETION,
        datasets=["her_memory"]
    )

    # 5. Or get raw chunks
    chunks = await cognee.search(
        query_text="name",
        query_type=SearchType.CHUNKS,
        datasets=["her_memory"]
    )
```

---

## Why "NAMAKU NOEL" Wasn't Remembered

| Step | What Should Happen | What Actually Happened |
|------|-------------------|----------------------|
| 1. User says "NAMAKU NOEL..." | `memory:save` triggered | Probably worked |
| 2. `CogneeMemory.add()` called | `cognee.add()` runs | Probably worked |
| 3. `cognee.cognify()` runs | LLM extracts entities | **LIKELY FAILED** (no LLM key?) |
| 4. User opens Memory page | Frontend calls `/api/memory/search?q=` | **FAILED - 422 error** |
| 5. Search with query | `cognee.search()` runs | Never reached |

**The 422 error (`min_length=1`) blocked the initial load, but even if it worked, the data may not have been cognified properly.**

---

## Recommended Fixes

### Fix 1: Add Proper Search Implementation

```python
# cognee_memory.py

from cognee.api.v1.search import SearchType

async def search(self, query: str, limit: int = 5) -> List[Memory]:
    if not self._initialized or not self._cognee:
        return []

    try:
        results = await self._cognee.search(
            query_text=query,
            query_type=SearchType.CHUNKS,  # Use CHUNKS for raw memory retrieval
            datasets=[self.dataset_name],
            top_k=limit
        )
        # Parse results...
```

### Fix 2: Add "List All" Method

```python
async def list_all(self) -> List[Memory]:
    """List all memories in the dataset."""
    if not self._initialized or not self._cognee:
        return []

    try:
        # Get dataset info
        datasets = await self._cognee.datasets.list_datasets()
        our_dataset = next((d for d in datasets if d.name == self.dataset_name), None)

        if not our_dataset:
            return []

        # Get all data from dataset
        data = await self._cognee.datasets.list_data(our_dataset.id)

        return [Memory(content=str(d)) for d in data]
    except Exception as e:
        print(f"[CogneeMemory] Error listing: {e}")
        return []
```

### Fix 3: Add Backend Endpoint for Listing

```python
# web.py

@app.get("/api/memory")
async def list_memories():
    """List all memories (no query required)."""
    if not memory or not memory.longterm_available:
        return {"memories": [], "error": "Long-term memory not available"}

    memories = await memory.list_all()
    return {
        "memories": [{"text": m.content, "id": str(uuid.uuid4())} for m in memories],
        "total_count": len(memories)
    }
```

### Fix 4: Update Frontend to Use List Endpoint

```javascript
// MemoryPage.js

async _loadMemories() {
    try {
        // Use list endpoint for initial load (no query)
        const response = await api.listMemories();  // New method
        this.memories = response.memories || [];
        this._spawnParticles();
    } catch (error) {
        console.error('[MemoryPage] Failed to load memories:', error);
    }
}
```

### Fix 5: Verify LLM Configuration

```python
# Check in startup
import os

if not os.environ.get("LLM_API_KEY"):
    print("[WARNING] LLM_API_KEY not set - Cognee cognify will fail!")
```

---

## Environment Variables Needed

```bash
# .env file
LLM_API_KEY=sk-your-openai-key
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# Optional but recommended
VECTOR_DB_PROVIDER=lancedb
GRAPH_DATABASE_PROVIDER=kuzu
```

---

## Architecture Comparison

### Current (Broken):
```
User → /api/memory/search?q= → 422 ERROR (empty query)
```

### Correct:
```
User opens Memory page
    → GET /api/memory → list_all() → cognee.datasets.list_data()
    → Returns all memories

User searches
    → GET /api/memory/search?q=... → search() → cognee.search(SearchType.CHUNKS)
    → Returns matching memories
```

---

## Conclusion

The implementation has structural issues:

1. **Missing `SearchType`** in search calls
2. **No dataset scoping** - searches may fail or return wrong data
3. **No list endpoint** - can't get all memories without a query
4. **Possible missing LLM config** - cognify may be silently failing
5. **422 error** is just a symptom of missing list endpoint

**Priority Fixes:**
1. Add `/api/memory` GET endpoint using `cognee.datasets.list_data()`
2. Update `CogneeMemory.search()` to use `SearchType.CHUNKS`
3. Verify `LLM_API_KEY` is configured
4. Add proper error handling and logging

---

## Sources

- [Cognee Documentation](https://docs.cognee.ai/examples/getting-started)
- [Search Types in Cognee](https://dev.to/chinmay_bhosale_9ceed796b/search-types-in-cognee-1jo7)
- [Cognee GitHub](https://github.com/topoteretes/cognee)
- Local source code: `cluster/cognee/cognee/api/v1/`
