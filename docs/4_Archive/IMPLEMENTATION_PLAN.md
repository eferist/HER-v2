# JIT ORCHESTRATOR IMPLEMENTATION PLAN

**Purpose**: Lean implementation guide for the JIT Orchestrator using AGNO + MCP. Build only what you need, when you need it.

**Philosophy**: Just-In-Time. No abstractions until they're needed. MCP-first for tools.

**LLM Stack**: See `LLM_STACKS.md` for detailed model configuration.

---

## LLM Configuration

### Environment Variables

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Model Chains per Component

| Component | Primary | Fallback | Reason |
|-----------|---------|----------|--------|
| **Router** | `gemini-2.5-flash` | `kimi-k2` | Fast classification |
| **Planner** | `gemini-2.5-flash` | `gpt-4o` | Complex reasoning fallback |
| **Agent** | `gemini-2.5-flash` | `gpt-4o` | Tool usage fallback |
| **Synthesizer** | `gemini-2.5-flash` | `kimi-k2` | Fast synthesis |

### Models Config File

**File**: `src/orchestrator/models.py`

```python
from agno.models.google import Gemini
from agno.models.openrouter import OpenRouter

# Primary model - fast & cost-effective
def get_gemini():
    return Gemini(id="gemini-2.5-flash")

# Fallback for complex reasoning
def get_gpt4o():
    return OpenRouter(id="openai/gpt-4o")

# Fast fallback for simple tasks
def get_kimi():
    return OpenRouter(id="moonshotai/kimi-k2-0905")

# Model chains per component
MODEL_CHAINS = {
    "router": [get_gemini, get_kimi],
    "planner": [get_gemini, get_gpt4o],
    "agent": [get_gemini, get_gpt4o],
    "synthesizer": [get_gemini, get_kimi],
}

def get_model(component: str, fallback_index: int = 0):
    """Get model for component with fallback support"""
    chain = MODEL_CHAINS.get(component, [get_gemini])
    if fallback_index < len(chain):
        return chain[fallback_index]()
    return chain[-1]()  # Return last available
```

### Fallback Wrapper

**File**: `src/orchestrator/fallback.py`

```python
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from .models import MODEL_CHAINS

async def run_with_fallback(
    component: str,
    agent_factory,  # Callable that takes model and returns Agent
    request: str
) -> str:
    """Run agent with automatic model fallback"""
    chain = MODEL_CHAINS.get(component, [])

    for i, get_model in enumerate(chain):
        try:
            model = get_model()
            agent = agent_factory(model)
            result = await agent.arun(request)
            return result.content
        except ModelProviderError as e:
            if i == len(chain) - 1:
                # Last model failed, return safe response
                return "I'm having technical difficulties. Please try again."
            continue

    return "No models available."
```

---

## Architecture (Simplified)

```
Request → Router → [Direct Response]
              ↓
          Planner → ExecutionPlan
              ↓
          Executor (single | parallel | sequential)
              ↓
          MCP Tools ← (connected MCP servers)
              ↓
          Response (synthesized if needed)
```

---

## Phase 1: Minimum Viable Orchestrator

**Goal**: Get a working Router + Direct Response path.

### 1.1 Create Project Structure

```
src/
└── orchestrator/
    ├── __init__.py
    ├── main.py           # Entry point
    ├── schemas.py        # Just the schemas you need
    └── router.py         # Router component
```

### 1.2 Schemas (Only What's Needed)

**File**: `src/orchestrator/schemas.py`

```python
from pydantic import BaseModel
from typing import List, Literal

class RouteDecision(BaseModel):
    path: Literal["direct", "agent"]
    reasoning: str

class Subtask(BaseModel):
    id: str                          # e.g., "get_weather"
    tools: List[str]                 # MCP tool names
    instructions: str
    depends_on: List[str] = []

class ExecutionPlan(BaseModel):
    mode: Literal["single", "parallel", "sequential"]
    subtasks: List[Subtask]
```

### 1.3 Router

**File**: `src/orchestrator/router.py`

Simple LLM classifier with fallback support.

```python
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from .schemas import RouteDecision
from .models import MODEL_CHAINS

def create_router(model) -> Agent:
    return Agent(
        name="Router",
        model=model,
        output_schema=RouteDecision,
        instructions="""
        Classify the request:

        DIRECT (no tools needed):
        - Greetings: "Hi", "Thanks", "How are you?"
        - Knowledge: "What is X?", "Explain Y"
        - Clarifications about previous responses

        AGENT (tools needed):
        - Current data: "What's the weather?", "Stock price of X"
        - Actions: "Send message", "Create event"
        - Multi-step: "Search X then do Y"
        """,
    )

def route(request: str) -> RouteDecision:
    """Route with automatic fallback"""
    for get_model in MODEL_CHAINS["router"]:
        try:
            model = get_model()
            router = create_router(model)
            return router.run(request).content
        except ModelProviderError:
            continue

    # All models failed - default to direct (safe)
    return RouteDecision(path="direct", reasoning="Fallback due to model errors")
```

### 1.4 Main Entry Point

**File**: `src/orchestrator/main.py`

```python
from agno.agent import Agent
from .router import route

def orchestrate(request: str) -> str:
    decision = route(request)

    if decision.path == "direct":
        # Simple direct response agent
        agent = Agent(name="Assistant")
        return agent.run(request).content

    # TODO: Phase 2 - Planner + Executor
    return "Agent path not implemented yet"

if __name__ == "__main__":
    print(orchestrate("Hello!"))
    print(orchestrate("What's the weather in Tokyo?"))
```

### Phase 1 Done When:
- [ ] "Hi" → returns direct response
- [ ] "What's the weather?" → returns "Agent path not implemented yet"

---

## Phase 2: Planner + Single Execution with MCP

**Goal**: Handle single-tool requests via MCP.

### 2.1 Connect MCP Server

**File**: `src/orchestrator/mcp.py`

```python
from agno.tools.mcp import MCPTools

# Example: Connect to an MCP server
# Option A: HTTP-based MCP server
async def get_mcp_tools(server_url: str) -> MCPTools:
    mcp = MCPTools(
        transport="streamable-http",
        url=server_url,
    )
    await mcp.connect()
    return mcp

# Option B: stdio-based MCP server (local process)
async def get_local_mcp_tools(command: str) -> MCPTools:
    mcp = MCPTools(
        transport="stdio",
        command=command,  # e.g., "npx -y @anthropic/mcp-server-weather"
    )
    await mcp.connect()
    return mcp
```

### 2.2 Planner

**File**: `src/orchestrator/planner.py`

```python
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from .schemas import ExecutionPlan, Subtask
from .models import MODEL_CHAINS

def create_planner(model, available_tools: list[str]) -> Agent:
    tools_desc = "\n".join(f"- {t}" for t in available_tools)

    return Agent(
        name="Planner",
        model=model,
        output_schema=ExecutionPlan,
        instructions=f"""
        Create an execution plan for the request.

        Available MCP Tools:
        {tools_desc}

        Rules:
        - SINGLE: One tool call (most common)
        - PARALLEL: Independent tool calls (e.g., compare two things)
        - SEQUENTIAL: Chained calls where B needs A's result

        Keep it simple. Most requests are SINGLE.
        """,
    )

def plan(request: str, available_tools: list[str]) -> ExecutionPlan:
    """Plan with automatic fallback"""
    for get_model in MODEL_CHAINS["planner"]:
        try:
            model = get_model()
            planner = create_planner(model, available_tools)
            return planner.run(request).content
        except ModelProviderError:
            continue

    # All models failed - return simple fallback plan
    return ExecutionPlan(
        mode="single",
        subtasks=[Subtask(
            id="fallback",
            tools=[],
            instructions="Acknowledge the request and explain technical difficulties."
        )]
    )
```

### 2.3 Executor Structure

**File**: `src/orchestrator/executor/__init__.py`

```python
from agno.tools.mcp import MCPTools
from ..schemas import ExecutionPlan
from .single import execute_single

async def execute(plan: ExecutionPlan, request: str, mcp_tools: MCPTools) -> str:
    if plan.mode == "single":
        return await execute_single(plan.subtasks[0], request, mcp_tools)

    # TODO: Phase 3 - parallel/sequential
    raise NotImplementedError(f"Mode {plan.mode} not implemented")
```

**File**: `src/orchestrator/executor/single.py`

```python
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from agno.tools.mcp import MCPTools
from ..schemas import Subtask
from ..models import MODEL_CHAINS

async def execute_single(
    subtask: Subtask,
    request: str,
    mcp_tools: MCPTools
) -> str:
    """Execute single subtask with fallback"""
    for get_model in MODEL_CHAINS["agent"]:
        try:
            model = get_model()
            agent = Agent(
                name=f"Agent_{subtask.id}",
                model=model,
                tools=[mcp_tools],
                instructions=subtask.instructions + "\n\nComplete in ONE tool call.",
            )
            result = await agent.arun(request)
            return result.content
        except ModelProviderError:
            continue

    return "Unable to complete this task due to technical difficulties."
```

### 2.4 Updated Main

**File**: `src/orchestrator/main.py`

```python
import asyncio
from agno.agent import Agent
from .router import route
from .planner import plan
from .executor import execute
from .mcp import get_mcp_tools

# Configure your MCP servers here
MCP_SERVERS = {
    "weather": "https://your-weather-mcp.com/mcp",
    # Add more as needed
}

async def orchestrate(request: str) -> str:
    decision = route(request)

    if decision.path == "direct":
        agent = Agent(name="Assistant")
        return agent.run(request).content

    # Connect to MCP (lazy - only when needed)
    mcp = await get_mcp_tools(MCP_SERVERS["weather"])

    try:
        # Get available tools from MCP server
        available_tools = list(mcp.functions.keys())

        # Plan
        execution_plan = plan(request, available_tools)

        # Execute
        return await execute(execution_plan, request, mcp)
    finally:
        await mcp.close()

if __name__ == "__main__":
    print(asyncio.run(orchestrate("What's the weather in Tokyo?")))
```

### Phase 2 Done When:
- [ ] Single MCP tool call works end-to-end
- [ ] Planner generates valid single-mode plans

---

## Phase 3: Parallel & Sequential Execution

**Goal**: Handle multi-tool requests.

### 3.1 Synthesizer

**File**: `src/orchestrator/synthesizer.py`

```python
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from .models import MODEL_CHAINS

def synthesize(request: str, results: dict) -> str:
    """Combine multiple results into one response with fallback"""
    for get_model in MODEL_CHAINS["synthesizer"]:
        try:
            model = get_model()
            agent = Agent(
                name="Synthesizer",
                model=model,
                instructions="Combine these results into one natural response. Don't list them mechanically.",
            )
            context = f"Request: {request}\n\nResults:\n{results}"
            return agent.run(context).content
        except ModelProviderError:
            continue

    # Fallback: just concatenate results
    return "\n\n".join(f"{k}: {v}" for k, v in results.items())
```

### 3.2 Parallel Executor

**File**: `src/orchestrator/executor/parallel.py`

```python
from agno.agent import Agent
from agno.tools.mcp import MCPTools
from agno.workflow import Parallel, Step
from agno.workflow.types import StepInput
from ..schemas import Subtask
from ..synthesizer import synthesize
from ..models import get_model

async def execute_parallel(
    subtasks: list[Subtask],
    request: str,
    mcp_tools: MCPTools
) -> str:
    # Create steps for each subtask (using primary model)
    steps = []
    for subtask in subtasks:
        agent = Agent(
            name=f"Agent_{subtask.id}",
            model=get_model("agent"),  # Primary model
            tools=[mcp_tools],
            instructions=subtask.instructions,
        )
        steps.append(Step(name=subtask.id, agent=agent))

    # Execute in parallel
    parallel = Parallel(*steps, name="parallel_exec")
    result = await parallel.aexecute(StepInput(input=request))

    # Synthesize results
    results = {s.step_name: s.content for s in result.steps}
    return synthesize(request, results)
```

### 3.3 Sequential Executor

**File**: `src/orchestrator/executor/sequential.py`

```python
from agno.agent import Agent
from agno.tools.mcp import MCPTools
from ..schemas import Subtask
from ..models import get_model

async def execute_sequential(
    subtasks: list[Subtask],
    request: str,
    mcp_tools: MCPTools
) -> str:
    # Sort by dependencies (simple topological sort)
    ordered = topological_sort(subtasks)

    context = {}
    for subtask in ordered:
        # Inject previous results into instructions
        dep_results = "\n".join(
            f"[{dep}]: {context[dep]}"
            for dep in subtask.depends_on
        )

        enhanced_instructions = subtask.instructions
        if dep_results:
            enhanced_instructions += f"\n\nPrevious results:\n{dep_results}"

        agent = Agent(
            name=f"Agent_{subtask.id}",
            model=get_model("agent"),  # Primary model
            tools=[mcp_tools],
            instructions=enhanced_instructions,
        )
        result = await agent.arun(request)
        context[subtask.id] = result.content

    # Return last result
    return context[ordered[-1].id]

def topological_sort(subtasks: list[Subtask]) -> list[Subtask]:
    """Sort subtasks by dependencies"""
    result = []
    done = set()

    def visit(task):
        if task.id in done:
            return
        for dep in task.depends_on:
            dep_task = next(t for t in subtasks if t.id == dep)
            visit(dep_task)
        done.add(task.id)
        result.append(task)

    for task in subtasks:
        visit(task)

    return result
```

### 3.4 Update Executor Init

**File**: `src/orchestrator/executor/__init__.py`

```python
from agno.tools.mcp import MCPTools
from ..schemas import ExecutionPlan
from .single import execute_single
from .parallel import execute_parallel
from .sequential import execute_sequential

async def execute(plan: ExecutionPlan, request: str, mcp_tools: MCPTools) -> str:
    if plan.mode == "single":
        return await execute_single(plan.subtasks[0], request, mcp_tools)
    elif plan.mode == "parallel":
        return await execute_parallel(plan.subtasks, request, mcp_tools)
    elif plan.mode == "sequential":
        return await execute_sequential(plan.subtasks, request, mcp_tools)
```

### Phase 3 Done When:
- [ ] "Compare weather in Tokyo and NYC" → parallel execution
- [ ] "Get weather then send to Telegram" → sequential execution

---

## Phase 4: Production Polish (Only If Needed)

Add these only when you actually need them:

### 4.1 Session Memory (if multi-turn needed)

```python
from agno.db.sqlite import SqliteDb
from agno.memory import MemoryManager

agent = Agent(
    db=SqliteDb(db_file="sessions.db"),
    add_history_to_context=True,
    num_history_messages=10,
    memory_manager=MemoryManager(db=SqliteDb(db_file="memory.db")),
    enable_user_memories=True,
)
```

### 4.2 Memory Manager Model

If you enable memory, configure it to use Gemini:

```python
from agno.memory import MemoryManager
from .models import get_model

memory_manager = MemoryManager(
    model=get_model("synthesizer"),  # Use same model as synthesizer
    db=SqliteDb(db_file="memory.db"),
)
```

### 4.3 AgentOS Server (if HTTP API needed)

```python
from agno.os import AgentOS

# Wrap orchestrator as agent
orchestrator_agent = Agent(
    name="Orchestrator",
    # ... your config
)

agent_os = AgentOS(agents=[orchestrator_agent])
app = agent_os.get_app()

# Run: uvicorn main:app --reload
```

### 4.4 Multiple MCP Servers (if more tools needed)

```python
from agno.tools.mcp import MultiMCPTools

# Connect to multiple MCP servers at once
mcp = MultiMCPTools(
    servers=[
        {"transport": "streamable-http", "url": "https://weather.mcp.com"},
        {"transport": "stdio", "command": "npx @anthropic/mcp-server-search"},
    ]
)
```

---

## File Structure (Final)

```
src/
└── orchestrator/
    ├── __init__.py
    ├── main.py              # Entry point + orchestrate()
    ├── schemas.py           # RouteDecision, Subtask, ExecutionPlan
    ├── models.py            # LLM config + MODEL_CHAINS + get_model()
    ├── router.py            # route() with fallback
    ├── planner.py           # plan() with fallback
    ├── mcp.py               # MCP connection helpers
    ├── synthesizer.py       # synthesize() with fallback
    └── executor/
        ├── __init__.py      # exports execute()
        ├── single.py        # execute_single() with fallback
        ├── parallel.py      # execute_parallel()
        └── sequential.py    # execute_sequential()
```

Executors separated for clarity - each strategy is isolated and testable.

---

## Build Order

```
Phase 1 (Foundation):
  1. schemas.py              → Data models
  2. models.py               → LLM config + MODEL_CHAINS
  3. router.py               → Direct vs Agent classification
  4. main.py (v1)            → Test router works

Phase 2 (Single Execution):
  5. mcp.py                  → Connect to your MCP server
  6. planner.py              → Generate execution plans
  7. executor/__init__.py    → Executor entry point
  8. executor/single.py      → Single execution with fallback
  9. main.py (v2)            → Test single tool flow

Phase 3 (Multi Execution):
  10. synthesizer.py         → Combine results with fallback
  11. executor/parallel.py   → Parallel execution
  12. executor/sequential.py → Sequential execution
  13. main.py (v3)           → Full orchestration
```

---

## MCP Server Setup

You'll need MCP servers to connect to. Options:

**Option A: Use existing MCP servers**
- Anthropic's reference servers: `npx @anthropic/mcp-server-*`
- Community servers: check MCP registry

**Option B: Build your own**
- Use MCP SDK to wrap your APIs
- Host as HTTP or run as local process

**Example MCP servers to start with:**
```bash
# Weather (if available)
npx @anthropic/mcp-server-weather

# Web search
npx @anthropic/mcp-server-brave-search

# File system
npx @anthropic/mcp-server-filesystem
```

---

## Testing (Keep It Simple)

```python
# test_orchestrator.py
import asyncio
from src.orchestrator.main import orchestrate

def test_direct():
    result = asyncio.run(orchestrate("Hello!"))
    assert "hello" in result.lower() or len(result) > 0

def test_single_tool():
    result = asyncio.run(orchestrate("What's the weather in Tokyo?"))
    assert "tokyo" in result.lower() or "weather" in result.lower()

def test_parallel():
    result = asyncio.run(orchestrate("Compare weather in Tokyo and NYC"))
    assert "tokyo" in result.lower() and "nyc" in result.lower()
```

---

## What NOT To Build (Yet)

- ❌ Abstract base classes
- ❌ Dependency injection containers
- ❌ Plugin systems
- ❌ Custom tool registry (MCP handles this)
- ❌ Complex error handling hierarchies
- ❌ Metrics/observability (until you need it)
- ❌ Configuration files (use env vars)

Build these only when you feel the pain of not having them.
