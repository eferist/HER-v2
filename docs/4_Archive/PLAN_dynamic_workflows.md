# PLAN: Dynamic Workflow Generation

## The Big Idea

**Current:** Planner picks from 3 fixed workflows (single, parallel, sequential)
**New:** Planner generates arbitrary workflow graphs on-the-fly

No more predefined patterns. The AI designs the workflow structure based on what the request actually needs.

---

## What Changes (High-Level)

### Before vs After

```
BEFORE:                              AFTER:
┌─────────┐                          ┌─────────┐
│ Planner │                          │ Planner │
└────┬────┘                          └────┬────┘
     │                                    │
     ▼                                    ▼
┌─────────────────┐                  ┌─────────────────┐
│ mode = ?        │                  │ Here's a graph  │
│ - single        │                  │ of subtasks     │
│ - parallel      │                  │ with deps &     │
│ - sequential    │                  │ conditions      │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│ executor/           │              │ graph_executor.py   │
│ ├── single.py       │              │ (ONE smart executor │
│ ├── parallel.py     │              │  that walks any     │
│ └── sequential.py   │              │  graph)             │
└─────────────────────┘              └─────────────────────┘
```

---

## New Project Structure

```
src/orchestration/
├── router.py           # Same - classifies direct vs agent
├── planner.py          # UPGRADED - outputs workflow graphs
├── graph_executor.py   # NEW - replaces entire executor/ folder
└── synthesizer.py      # Same - combines results

# DELETED:
# executor/
# ├── __init__.py
# ├── single.py
# ├── parallel.py
# └── sequential.py
```

**Why this is cleaner:**
- One file instead of a folder with 4 files
- No more "which executor mode?" logic
- The graph executor handles ALL patterns (and more!)

---

## How The Graph Executor Works (Vibes Edition)

Think of it like a **task manager** that keeps asking:

> "What can I run right now?"

```
┌─────────────────────────────────────────────────────────┐
│                    GRAPH EXECUTOR                        │
│                                                          │
│   1. Look at all subtasks                               │
│   2. Find ones with NO blockers (dependencies done)     │
│   3. Run them (in parallel if multiple are ready)       │
│   4. Store results                                       │
│   5. Check conditions for branching                     │
│   6. Repeat until nothing left                          │
│   7. Return final result                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**It automatically handles:**
- Single task? Just runs it
- Multiple independent tasks? Runs them in parallel
- Dependencies? Waits for them first
- Conditions? Evaluates and picks the right path

---

## New Workflow Capabilities

### 1. Fan-Out Then Aggregate
```
"Compare weather in 5 cities and summarize"

        ┌──→ city1 ──┐
        ├──→ city2 ──┤
start ──┼──→ city3 ──┼──→ summarize
        ├──→ city4 ──┤
        └──→ city5 ──┘
```

### 2. Conditional Branching
```
"If it's raining, find indoor activities, else outdoor"

get_weather ──→ [rainy?] ──yes──→ indoor_search ──┐
                   │                               ├──→ respond
                   └──no───→ outdoor_search ──────┘
```

### 3. Sequential with Fan-Out
```
"Get my calendar, then send reminders to all attendees"

get_calendar ──→ ┌──→ notify_person1 ──┐
                 ├──→ notify_person2 ──┼──→ confirm
                 └──→ notify_person3 ──┘
```

### 4. Multi-Stage Pipeline
```
"Research topic, write draft, review, then publish"

research ──→ write_draft ──→ review ──→ publish
```

---

## The Planner's New Output

Instead of:
```
{
  "mode": "parallel",
  "subtasks": [...]
}
```

Now:
```
{
  "subtasks": [
    { "id": "weather_tokyo", "depends_on": [] },
    { "id": "weather_nyc", "depends_on": [] },
    { "id": "compare", "depends_on": ["weather_tokyo", "weather_nyc"] },
    { "id": "send_msg", "depends_on": ["compare"] }
  ]
}
```

The **graph structure is implicit** in the `depends_on` relationships. No need for explicit "mode" anymore!

---

## Bonus: Conditions (Phase 2)

After the basic graph works, we can add conditions:

```
{
  "id": "indoor_search",
  "depends_on": ["check_weather"],
  "condition": "check_weather.result contains 'rain'"
}
```

The executor only runs this subtask if the condition is true. This enables branching without hardcoding it.

---

## Migration Path

### Phase 1: Unified Graph Executor
1. Create `graph_executor.py` that handles any DAG
2. Update Planner to output graphs (remove `mode` field)
3. Delete `executor/` folder
4. Update `engine/main_loop.py` to use new executor

### Phase 2: Add Conditions
1. Add `condition` field to Subtask schema
2. Teach Planner when to use conditions
3. Executor evaluates conditions before running

### Phase 3: Reactive Mode (Optional Future)
1. Add Controller Agent for complex/ambiguous requests
2. Planner can choose: "graph" or "reactive" strategy
3. Reactive = step-by-step decision making

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Workflow types | 3 fixed patterns | Infinite (any DAG) |
| Executor code | 4 files in folder | 1 smart file |
| Planner output | `mode` + subtasks | Just subtasks with deps |
| Branching | Not possible | Condition field |
| Complexity | Simple but limited | Flexible but still clean |

---

## Vibe Check

This change is **philosophically aligned** with your JIT approach:

> "If we generate agents on-the-fly, why not workflows too?"

The executor/ folder with predefined patterns was the last piece of "hardcoded" logic. Removing it means the entire orchestration is dynamic - from intent classification, to workflow design, to agent spawning.

**True JIT Orchestration.** 🔥

---

## Next Steps

1. You approve this plan?
2. I build Phase 1 (graph executor + planner upgrade)
3. We test with some complex queries
4. Then we iterate on Phase 2 (conditions) if needed

Let me know when you're ready to roll bro!
