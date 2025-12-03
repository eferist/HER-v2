# Refactoring Strategy: Domain-Based Territories

## Context

**Team Roles:**
| Person | Codename | Territory | Focus |
|--------|----------|-----------|-------|
| Ahimsa | The Brain | Orchestrator Logic | Router, Planner, Synthesizer - decision-making |
| Risang | The Memory | State & Context | Session memory → future Cognee Graph RAG |
| You | The Hands | Tools & Interfaces | MCP integration, Terminal UI, future Streamlit |

**Current Pain Point:**
Everything lives in a flat `src/orchestrator/` folder. No clear ownership boundaries.

---

## Approach 1: The "Anatomy" Structure

```
src/
├── core/                    # Shared foundation (everyone uses, rarely changes)
│   ├── __init__.py
│   ├── schemas.py           # Pydantic models (RouteDecision, ExecutionPlan, Subtask)
│   ├── models.py            # LLM configuration & fallback chains
│   └── config.py            # Centralized settings, env loading
│
├── brain/                   # AHIMSA'S TERRITORY
│   ├── __init__.py
│   ├── router.py            # Intent classification
│   ├── planner.py           # Execution plan generation
│   ├── synthesizer.py       # Result combination
│   └── executor/            # Execution strategy (runs the plan)
│       ├── __init__.py
│       ├── single.py
│       ├── parallel.py
│       └── sequential.py
│
├── memory/                  # RISANG'S TERRITORY
│   ├── __init__.py
│   ├── session.py           # Current: sliding window memory
│   ├── base.py              # Abstract interface for memory backends
│   └── (future: cognee.py)  # Graph RAG integration
│
├── tools/                   # YOUR TERRITORY (MCP Connections)
│   ├── __init__.py
│   ├── manager.py           # MCPManager class
│   ├── connection.py        # Server connection logic
│   └── config.py            # MCP config loading
│
└── interface/               # YOUR TERRITORY (UI Layer)
    ├── __init__.py
    ├── terminal.py          # Current: terminal REPL
    ├── orchestrate.py       # Main orchestration loop (extracted from main.py)
    └── (future: streamlit/)
```

**Pros:**
- Intuitive naming (everyone immediately knows where to look)
- Clear "this is MY folder" ownership
- Risang can swap `memory/session.py` for `memory/cognee.py` without touching Brain or Tools

**Cons:**
- "Anatomy" metaphor may feel gimmicky to future contributors

---

## Approach 2: The "Feature Module" Structure

```
src/
├── shared/                  # Common types & utilities
│   ├── __init__.py
│   ├── schemas.py
│   ├── models.py
│   └── config.py
│
├── reasoning/               # AHIMSA'S TERRITORY
│   ├── __init__.py
│   ├── router.py
│   ├── planner.py
│   ├── synthesizer.py
│   └── executor/            # Execution strategy
│       ├── __init__.py
│       ├── single.py
│       ├── parallel.py
│       └── sequential.py
│
├── context/                 # RISANG'S TERRITORY
│   ├── __init__.py
│   ├── session.py
│   ├── base.py
│   └── providers/           # Different memory backends
│       └── sliding_window.py
│
├── mcp/                     # YOUR TERRITORY (Tools)
│   ├── __init__.py
│   ├── manager.py
│   ├── connection.py
│   └── config.py
│
└── ui/                      # YOUR TERRITORY (Interfaces)
    ├── __init__.py
    ├── terminal.py
    ├── app.py               # Orchestration loop
    └── (future: web/)
```

**Pros:**
- More "professional" / standard Python project layout
- Scales well with more features

**Cons:**
- Less intuitive for quick onboarding ("where's the brain?")

---

## Recommendation: Hybrid "Anatomy" Approach

For a 3-person vibe-coding team prioritizing **speed and intuition**, I recommend **Approach 1** with one refinement:

```
src/
├── core/                    # SHARED: schemas, models, config
├── brain/                   # AHIMSA: router, planner, synthesizer, executor
│   ├── router.py
│   ├── planner.py
│   ├── synthesizer.py
│   └── executor/
├── memory/                  # RISANG: session management
├── hands/                   # YOU: MCP connections only
│   └── mcp/
└── eyes/                    # YOU: all interface layers
    ├── terminal.py
    └── orchestrate.py
```

**Why this works for your team:**

1. **Instant recognition**: Open the repo → see `brain/` → know exactly who owns it
2. **Risang's sandbox is isolated**: He can experiment with Cognee in `memory/` without any merge conflicts with Ahimsa's `brain/` work
3. **Clear boundary**: Ahimsa owns all decision-making (including *how* to execute), you own the tool connections and UI
4. **Low coupling**: The only shared dependency is `core/` which is stable

**The `core/` contract:**
```python
# Everyone imports from core, no one else
from src.core.schemas import RouteDecision, ExecutionPlan, Subtask
from src.core.models import get_model, MODEL_CHAINS
from src.core.config import load_env, get_settings
```

---

## Migration Checklist

### Phase 1: Create Structure (You - 1 PR)
- [ ] Create folder structure: `core/`, `brain/`, `memory/`, `hands/`, `eyes/`
- [ ] Create all `__init__.py` files
- [ ] Update `pyproject.toml` / import paths if needed

### Phase 2: Move Core (You - same PR)
- [ ] Move `schemas.py` → `core/schemas.py`
- [ ] Move `models.py` → `core/models.py`
- [ ] Extract config loading from `main.py` → `core/config.py`

### Phase 3: Move Brain (Ahimsa reviews)
- [ ] Move `router.py` → `brain/router.py`
- [ ] Move `planner.py` → `brain/planner.py`
- [ ] Move `synthesizer.py` → `brain/synthesizer.py`
- [ ] Move `executor/` → `brain/executor/`
- [ ] Update imports: `from src.core.schemas import ...`

### Phase 4: Move Memory (Risang reviews)
- [ ] Move `session.py` → `memory/session.py`
- [ ] Create `memory/base.py` with abstract interface (for future Cognee)
- [ ] Update imports

### Phase 5: Move Hands (You)
- [ ] Move `mcp.py` → split into `hands/mcp/manager.py`, `hands/mcp/connection.py`, `hands/mcp/config.py`
- [ ] Update imports

### Phase 6: Move Eyes (You)
- [ ] Extract terminal loop from `main.py` → `eyes/terminal.py`
- [ ] Extract `orchestrate()` function → `eyes/orchestrate.py`
- [ ] Create new `main.py` as thin entry point

### Phase 7: Cleanup & Test
- [ ] Delete old files
- [ ] Run full test (even manual)
- [ ] Update `CURRENT_STATE.md` with new structure

---

## Import Pattern After Migration

```python
# brain/router.py
from src.core.schemas import RouteDecision
from src.core.models import MODEL_CHAINS

# eyes/orchestrate.py
from src.brain.router import route
from src.brain.planner import plan
from src.brain.executor import execute
from src.memory.session import SessionMemory
from src.hands.mcp import MCPManager

# main.py (entry point)
from src.eyes.terminal import run_terminal
```

---

## Avoiding Circular Imports

The key rule: **Dependencies flow DOWN, never UP**

```
        main.py (entry point)
            ↓
        eyes/ (interface)
        ↓   ↓   ↓
    brain/ memory/ hands/
        ↓   ↓   ↓
         core/
```

- `core/` imports nothing from `src/`
- `brain/`, `memory/`, `hands/` only import from `core/`
- `eyes/` can import from all of them
- `main.py` only imports from `eyes/`

---

## Quick Reference: Who Owns What

| Folder | Owner | Files | Can Modify |
|--------|-------|-------|------------|
| `core/` | Everyone (stable) | schemas, models, config | With team review |
| `brain/` | Ahimsa | router, planner, synthesizer, executor/* | Freely |
| `memory/` | Risang | session, (future cognee) | Freely |
| `hands/` | You | mcp/* | Freely |
| `eyes/` | You | terminal, orchestrate | Freely |

---

## Next Steps

1. **Discuss this plan** with Ahimsa and Risang
2. **Agree on naming** (brain/memory/hands/eyes vs reasoning/context/mcp/ui)
3. **Create a tracking issue** with the checklist above
4. **Execute Phase 1-2** in a single PR (structure + core)
5. **Parallelize Phase 3-5** (each person migrates their territory)
6. **Merge & test**
