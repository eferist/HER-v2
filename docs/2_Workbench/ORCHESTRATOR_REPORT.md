# JIT Orchestrator - Comprehensive Technical Report

> **UPDATE:** This system now uses **Dynamic Workflow Generation**. The Planner outputs arbitrary DAGs (Directed Acyclic Graphs) instead of fixed modes. See `PLAN_dynamic_workflows.md` for the design rationale.

## Executive Summary

The JIT (Just-In-Time) Orchestrator is a modular AI orchestration system built on the AGNO framework with MCP (Model Context Protocol) integration. It implements a **Router → Planner → Graph Executor → Synthesizer** pipeline that dynamically generates both agents AND workflows on-the-fly based on user requests.

---

## Core Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      ENGINE                             │
                    │                   (main_loop.py)                        │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │              orchestrate()                       │   │
                    │  │  - Entry point for all requests                  │   │
                    │  │  - Coordinates all components                    │   │
                    │  │  - Manages session memory                        │   │
                    │  │  - Emits UI events                               │   │
                    │  └─────────────────────────────────────────────────┘   │
                    └───────────────────────┬─────────────────────────────────┘
                                            │
          ┌─────────────────────────────────┼─────────────────────────────────┐
          │                                 │                                 │
          ▼                                 ▼                                 ▼
┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│     ROUTER       │            │     PLANNER      │            │    EXECUTOR      │
│   (router.py)    │            │   (planner.py)   │            │  (executor/)     │
│                  │            │                  │            │                  │
│  Classifies:     │            │  Creates:        │            │  Modes:          │
│  - direct        │──────────▶ │  - single        │──────────▶ │  - single        │
│  - agent         │            │  - parallel      │            │  - parallel      │
│                  │            │  - sequential    │            │  - sequential    │
└──────────────────┘            └──────────────────┘            └────────┬─────────┘
                                                                         │
                                                                         ▼
                                                              ┌──────────────────┐
                                                              │   SYNTHESIZER    │
                                                              │ (synthesizer.py) │
                                                              │                  │
                                                              │  Combines multi- │
                                                              │  ple results     │
                                                              └──────────────────┘
```

---

## Component Deep Dive

### 1. Router (`src/orchestration/router.py`)

**Purpose:** Intent classification - determines if a request needs tools or can be answered directly.

**Key Design:**
- Uses AGNO's `Agent` with `output_schema=RouteDecision` for structured output
- Injects conversation context for follow-up understanding
- Implements automatic fallback chain on model failures

**Classification Logic:**
| Path | Triggers |
|------|----------|
| `direct` | Greetings, general knowledge, clarifications, questions not requiring live data |
| `agent` | Real-time data, actions, multi-step tasks, external API calls |

**Fallback Strategy:**
```
Gemini 2.5 Flash → Kimi K2 → Default to "direct" (safe fallback)
```

**Code Pattern - Agent Generation on the Fly:**
```python
def create_router(model, context: str = "") -> Agent:
    """Create router agent with given model."""
    return Agent(
        name="Router",
        model=model,
        output_schema=RouteDecision,  # Forces structured JSON output
        instructions=instructions,
    )
```

---

### 2. Planner (`src/orchestration/planner.py`)

**Purpose:** Generates execution plans that define how to fulfill a request.

**Key Design:**
- Receives list of available MCP tools for context-aware planning
- Injects conversation history (up to 1000 tokens)
- Creates structured `ExecutionPlan` with `Subtask` objects

**Execution Modes:**

| Mode | Description | Example |
|------|-------------|---------|
| `single` | One tool call | "What's the weather in Tokyo?" |
| `parallel` | Independent concurrent calls | "Compare weather in Tokyo and NYC" |
| `sequential` | Chained calls with dependencies | "Get weather, then send to Telegram" |

**Subtask Schema:**
```python
class Subtask(BaseModel):
    id: str                  # e.g., "get_weather"
    tools: List[str]         # MCP tool names needed
    instructions: str        # Agent instructions
    depends_on: List[str]    # Dependencies for sequential mode
```

**Fallback Strategy:**
```
Gemini 2.5 Flash → GPT-4o → Fallback plan with no tools
```

---

### 3. Executor (`src/orchestration/executor/`)

**Purpose:** Executes the plan using dynamically generated agents with MCP tools.

#### 3.1 Executor Dispatcher (`__init__.py`)

**Key Features:**
- Normalizes tool input (single MCPTools or list)
- Filters tools per subtask for efficiency
- Dispatches to appropriate execution mode

**Tool Filtering Logic:**
```python
def filter_tools_for_subtask(subtask, all_tools, mcp_manager):
    """
    Only pass relevant tools to each subtask agent.
    This reduces context bloat and improves accuracy.
    """
    if mcp_manager:
        return mcp_manager.get_tools_for_subtask(subtask.tools)
    # Manual fallback filtering...
```

#### 3.2 Single Executor (`single.py`)

**Purpose:** Executes one subtask with one tool call.

**Key Pattern - JIT Agent Creation:**
```python
async def execute_single(subtask, request, mcp_tools) -> str:
    for get_model in MODEL_CHAINS["agent"]:
        try:
            model = get_model()
            agent = Agent(
                name=f"Agent_{subtask.id}",  # Dynamic naming
                model=model,
                tools=mcp_tools,             # Filtered tools
                instructions=subtask.instructions + "\n\nComplete in ONE tool call.",
            )
            result = await agent.arun(request)
            return result.content
        except ModelProviderError:
            continue  # Try next model in chain
```

#### 3.3 Parallel Executor (`parallel.py`)

**Purpose:** Executes independent subtasks concurrently using `asyncio.gather()`.

**Flow:**
```
                      ┌─────────────────────┐
                      │   User Request      │
                      └──────────┬──────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  Agent_task1  │   │  Agent_task2  │   │  Agent_task3  │
    │  (weather_ny) │   │ (weather_tok) │   │ (weather_lon) │
    └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │    SYNTHESIZER      │
                      │  (combine results)  │
                      └─────────────────────┘
```

**Key Pattern:**
```python
async def execute_parallel(subtasks, request, mcp_tools, mcp_manager):
    tasks = [
        execute_subtask(subtask, request, mcp_tools, mcp_manager)
        for subtask in subtasks
    ]
    results_list = await asyncio.gather(*tasks, return_exceptions=True)
    results = {subtask_id: content for subtask_id, content in results_list}
    return synthesize(request, results)
```

#### 3.4 Sequential Executor (`sequential.py`)

**Purpose:** Executes subtasks in dependency order, passing results forward.

**Key Features:**
- **Topological Sort:** Orders subtasks by `depends_on` field
- **Result Injection:** Previous results injected into next agent's instructions

**Flow:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Agent_step1    │────▶│  Agent_step2    │────▶│  Agent_step3    │
│  (get_weather)  │     │ (format_data)   │     │ (send_telegram) │
│                 │     │                 │     │                 │
│  Result: {...}  │     │  Uses step1's   │     │  Uses step2's   │
│                 │     │  result         │     │  result         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Result Injection Pattern:**
```python
# Inject previous results into instructions
dep_results = "\n".join(
    f"[Result from {dep}]: {context[dep]}"
    for dep in subtask.depends_on
    if dep in context
)
enhanced_instructions = subtask.instructions + f"\n\nPrevious results:\n{dep_results}"
```

---

### 4. Synthesizer (`src/orchestration/synthesizer.py`)

**Purpose:** Combines multiple agent results into one coherent natural language response.

**Key Design:**
- Used only for parallel/multi-result execution
- Creates unified, conversational response
- No mechanical listing ("Result 1:", "Result 2:")

**Fallback Strategy:**
```
Gemini 2.5 Flash → Kimi K2 → Simple concatenation
```

---

## The Three Execution Workflows

### Workflow 1: Direct Response (No Tools)

```
User: "What is machine learning?"
          │
          ▼
    ┌───────────┐
    │  ROUTER   │  → path: "direct"
    └─────┬─────┘
          │
          ▼
    ┌───────────────┐
    │ Direct Agent  │  → No MCP tools, just LLM response
    └───────────────┘
```

**Characteristics:**
- Bypasses Planner entirely
- Single LLM call with conversation context
- Used for greetings, knowledge questions, clarifications

---

### Workflow 2: Single Tool Execution

```
User: "What's the weather in Tokyo?"
          │
          ▼
    ┌───────────┐
    │  ROUTER   │  → path: "agent"
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  PLANNER  │  → mode: "single"
    │           │    subtasks: [get_weather]
    └─────┬─────┘
          │
          ▼
    ┌───────────────┐
    │ Single Exec   │  → Calls weather MCP tool
    └───────────────┘
```

**Characteristics:**
- Most common workflow (~70% of requests)
- One subtask, one tool call
- Direct result return (no synthesis needed)

---

### Workflow 3: Parallel Execution + Synthesis

```
User: "Compare weather in Tokyo and NYC"
          │
          ▼
    ┌───────────┐
    │  ROUTER   │  → path: "agent"
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  PLANNER  │  → mode: "parallel"
    │           │    subtasks: [weather_tokyo, weather_nyc]
    └─────┬─────┘
          │
          ├──────────────┬──────────────┐
          ▼              ▼              │
    ┌───────────┐  ┌───────────┐        │
    │ Agent_tok │  │ Agent_nyc │        │
    └─────┬─────┘  └─────┬─────┘        │
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 ┌───────────────┐
                 │  SYNTHESIZER  │  → Unified comparison response
                 └───────────────┘
```

**Characteristics:**
- Concurrent execution with `asyncio.gather()`
- Each agent gets filtered tools (only what it needs)
- Synthesizer creates natural, flowing response

---

### Workflow 4: Sequential Execution (Chained Dependencies)

```
User: "Get Tokyo weather and send it to my Telegram"
          │
          ▼
    ┌───────────┐
    │  ROUTER   │  → path: "agent"
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  PLANNER  │  → mode: "sequential"
    │           │    subtasks: [
    │           │      {id: "get_weather", tools: ["get_current_weather"]},
    │           │      {id: "send_msg", tools: ["telegram_send"], depends_on: ["get_weather"]}
    │           │    ]
    └─────┬─────┘
          │
          ▼
    ┌───────────────────┐
    │ Topological Sort  │  → Orders by dependencies
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────┐
    │ Agent_weather │  → Result: "Tokyo: 22°C, Sunny"
    └───────┬───────┘
            │ (result injected)
            ▼
    ┌───────────────┐
    │ Agent_telegram│  → Sends message with weather data
    └───────────────┘
```

**Characteristics:**
- Dependency-aware execution order
- Results passed forward via instruction injection
- Final step's result returned to user

---

## JIT Agent Generation Philosophy

The orchestrator **never pre-creates agents**. Every agent is generated just-in-time:

```python
# Every subtask spawns a fresh agent
agent = Agent(
    name=f"Agent_{subtask.id}",   # Unique name per task
    model=model,                   # Model from fallback chain
    tools=filtered_mcp_tools,      # Only relevant tools
    instructions=subtask.instructions,
)
```

**Benefits:**
1. **No wasted resources** - Agents only exist when needed
2. **Tool isolation** - Each agent sees only its required tools
3. **Model flexibility** - Can use different models per subtask
4. **Error isolation** - One agent's failure doesn't affect others

---

## Model Fallback Architecture

Each component has its own fallback chain:

| Component | Primary | Fallback 1 | Fallback 2 |
|-----------|---------|------------|------------|
| Router | Gemini 2.5 Flash | Kimi K2 | Default to "direct" |
| Planner | Gemini 2.5 Flash | GPT-4o | Empty plan |
| Agent | Gemini 2.5 Flash | GPT-4o | Error message |
| Synthesizer | Gemini 2.5 Flash | Kimi K2 | Simple concat |

**Fallback Pattern:**
```python
for get_model in MODEL_CHAINS[component]:
    try:
        model = get_model()
        result = agent.run(request)
        return result.content
    except ModelProviderError:
        continue  # Try next
# All failed - use safe default
```

---

## Session Memory Integration

**Purpose:** Enables follow-up queries and contextual understanding.

**Token Limits:**
- Router: 500 tokens of context
- Planner: 1000 tokens of context

**Sliding Window Algorithm:**
```python
def get_context(self, token_limit: int = 500) -> str:
    # Walk backwards from most recent
    for turn in reversed(self._turns):
        if total_tokens + turn.tokens <= token_limit:
            selected.insert(0, turn)
            total_tokens += turn.tokens
```

**Example - Follow-up Query:**
```
Turn 1: "What's the weather in Jakarta?"  → Response with Jakarta weather
Turn 2: "How about Tokyo?"                 → System understands context
        Context injected: "User asked about Jakarta weather..."
        Planner knows to get Tokyo weather
```

---

## MCP Tool Management

**MCPManager Responsibilities:**
1. Holds multiple MCP server connections
2. Maps tool names to servers
3. Provides filtered tool sets per subtask

**Optimization:**
```python
def get_tools_for_subtask(self, tool_names: List[str]) -> List[MCPTools]:
    """Return only servers that have the requested tools."""
    needed_servers = []
    for tool_name in tool_names:
        server = self.get_server_for_tool(tool_name)
        if server not in needed_servers:
            needed_servers.append(server)
    return needed_servers
```

---

## Event System for UI

The orchestrator emits events for real-time UI updates:

| Event | Trigger | Data |
|-------|---------|------|
| `routing` | Before classification | `message` |
| `routed` | After classification | `path`, `reasoning` |
| `planning` | Before planning | `message` |
| `planned` | After planning | `mode`, `subtasks` |
| `executing` | Before execution | `message` |
| `responding` | Before direct response | `message` |

**Pattern:**
```python
async def emit(event_type: str, **data):
    if on_event:
        await on_event({"event": event_type, **data})
```

---

## File Reference

| File | Purpose | Owner |
|------|---------|-------|
| `engine/main_loop.py` | Main orchestration entry point | Shared |
| `orchestration/router.py` | Intent classification | Ahimsa |
| `orchestration/planner.py` | Execution plan generation | Ahimsa |
| `orchestration/executor/__init__.py` | Executor dispatcher + tool filtering | Ahimsa |
| `orchestration/executor/single.py` | Single subtask execution | Ahimsa |
| `orchestration/executor/parallel.py` | Concurrent execution + synthesis | Ahimsa |
| `orchestration/executor/sequential.py` | Dependency-ordered execution | Ahimsa |
| `orchestration/synthesizer.py` | Multi-result combination | Ahimsa |
| `core/schemas.py` | Pydantic models | Shared |
| `core/models.py` | LLM configuration + fallback chains | Shared |
| `context/session.py` | Token-based session memory | Risang |
| `tools/mcp/manager.py` | Multi-server MCP management | Noel |

---

## Summary

The JIT Orchestrator is a **flexible, fault-tolerant** AI orchestration system that:

1. **Classifies requests** dynamically (Router)
2. **Plans execution strategies** based on available tools (Planner)
3. **Spawns agents on-demand** with filtered tool access (Executor)
4. **Synthesizes results** into natural responses (Synthesizer)

Key architectural decisions:
- **No pre-built agents** - Everything is JIT
- **Fallback chains** on every component
- **Token-aware context** for conversation continuity
- **Tool isolation** for accuracy and efficiency
- **Event-driven** for real-time UI updates

This architecture enables handling anything from simple greetings to complex multi-step workflows with external tool calls, all while maintaining resilience through graceful degradation.
