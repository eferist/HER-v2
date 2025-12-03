# AGNO Distilled Documentation for JIT Orchestrator

**Purpose**: This document maps AGNO framework capabilities to the JIT Orchestrator requirements specified in `ORCHESTRATOR_BLUEPRINT.md`. It provides practical guidance for implementing the orchestrator using AGNO primitives.

---

## Table of Contents

1. [Executive Summary: AGNO → Orchestrator Mapping](#1-executive-summary-agno--orchestrator-mapping)
2. [The Decision Engine (Router) Implementation](#2-the-decision-engine-router-implementation)
3. [The Planning Philosophy Implementation](#3-the-planning-philosophy-implementation)
4. [The Execution Strategy Implementation](#4-the-execution-strategy-implementation)
5. [The Tool Interface Implementation](#5-the-tool-interface-implementation)
6. [Memory and Context Management](#6-memory-and-context-management)
7. [Model Configuration and Fallbacks](#7-model-configuration-and-fallbacks)
8. [Code Examples](#8-code-examples)

---

## 1. Executive Summary: AGNO → Orchestrator Mapping

| Orchestrator Component | AGNO Primitive | Location |
|------------------------|----------------|----------|
| **Router** (Direct vs Agent path) | `Workflow` + `Router` step | `agno.workflow.router.Router` |
| **Planner** (Decomposition) | `Agent` with structured output | `agno.agent.Agent` |
| **Single Executor** | `Agent` | `agno.agent.Agent` |
| **Parallel Executor** | `Workflow.Parallel` | `agno.workflow.parallel.Parallel` |
| **Sequential Executor** | `Workflow.Steps` | `agno.workflow.steps.Steps` |
| **Response Synthesizer** | `Agent` with synthesis instructions | `agno.agent.Agent` |
| **Tool Registry** | `Toolkit` + `Function` | `agno.tools.Toolkit` |
| **Session Context** | `AgentSession` + `db` | `agno.session.AgentSession` |
| **Long-term Memory** | `MemoryManager` | `agno.memory.MemoryManager` |
| **Model Fallback Chain** | Multiple models + try/except | `agno.models.*` |

---

## 2. The Decision Engine (Router) Implementation

### AGNO Components to Use

**Primary**: `agno.workflow.router.Router`

The Router in AGNO is a workflow step that dynamically selects which step(s) to execute based on input.

### Key File: `agno/libs/agno/agno/workflow/router.py`

```python
from agno.workflow.router import Router
from agno.workflow.step import Step

# Router dynamically selects which step(s) to execute
router = Router(
    name="intent_router",
    selector=route_selector_function,  # Your routing logic
    choices=[direct_response_step, agent_path_step]
)
```

### Implementation Pattern for Direct vs Agent Path

```python
from agno.agent import Agent
from agno.workflow import Workflow, Router, Step
from agno.workflow.types import StepInput, StepOutput

def route_selector(step_input: StepInput, session_state: dict) -> list[Step]:
    """
    Implements the Router's binary classification:
    - Direct Path: Greetings, simple knowledge, clarifications
    - Agent Path: Live data, tools, multi-step work
    """
    # Create a classification agent
    classifier = Agent(
        name="Intent Classifier",
        model=your_model,
        instructions="""
        Classify if the request needs tools (return "agent")
        or can be answered directly (return "direct").

        DIRECT: Greetings, knowledge queries, clarifications
        AGENT: Live data, actions, multi-step tasks
        """,
        output_schema=RouteDecision  # Pydantic model
    )

    result = classifier.run(step_input.input)

    if result.content.path == "direct":
        return [direct_response_step]
    else:
        return [planner_step, executor_step]
```

### Context Augmentation

AGNO provides built-in context augmentation:

```python
agent = Agent(
    # Session history (sliding window)
    add_history_to_context=True,
    num_history_messages=10,  # Token-limited sliding window

    # Long-term memory
    memory_manager=MemoryManager(db=your_db),
    add_memories_to_context=True,
    enable_user_memories=True,
)
```

### Resilience Pattern (Model Fallback)

```python
from agno.models.openai import OpenAIChat
from agno.models.anthropic import Claude

def create_router_with_fallback():
    models = [
        Claude(id="claude-sonnet-4-5"),
        OpenAIChat(id="gpt-4o"),
        OpenAIChat(id="gpt-4o-mini")  # Cheapest fallback
    ]

    for model in models:
        try:
            return Agent(model=model, ...)
        except Exception:
            continue

    # Final fallback: return "direct" response
    return default_direct_response()
```

---

## 3. The Planning Philosophy Implementation

### AGNO Components to Use

**Primary**: `agno.agent.Agent` with `output_schema`

The Planner is implemented as an Agent with structured output that returns an Execution Plan.

### Key Configuration

```python
from pydantic import BaseModel
from typing import List, Literal
from agno.agent import Agent

class Subtask(BaseModel):
    id: str  # verb_noun format: "search_weather"
    agent_name: str
    tools_required: List[str]
    system_instructions: str
    depends_on: List[str] = []

class ExecutionPlan(BaseModel):
    execution_mode: Literal["single", "parallel", "sequential"]
    subtasks: List[Subtask]

planner = Agent(
    name="Task Planner",
    model=your_model,
    output_schema=ExecutionPlan,  # Forces structured output
    instructions="""
    Decompose the user request into subtasks.

    Patterns:
    - SINGLE: One task, one agent (most common)
    - PARALLEL: Independent tasks that share no dependencies
    - SEQUENTIAL: Tasks where later steps depend on earlier results

    Each subtask must reference real tools from the registry.
    """,
    # Provide tool registry as context
    additional_context=tool_registry_description,
)
```

### Tool Registry Knowledge

Pass tool descriptions to the planner:

```python
def get_tool_registry_description(tools: dict) -> str:
    """Format tool registry for planner context"""
    descriptions = []
    for name, info in tools.items():
        descriptions.append(f"- {name}: {info['description']}")
    return "Available Tools:\n" + "\n".join(descriptions)

planner = Agent(
    additional_context=get_tool_registry_description(tool_registry),
    ...
)
```

### Validation Pipeline

```python
def validate_plan(plan: ExecutionPlan, tool_registry: dict) -> bool:
    """
    Validate:
    1. All tools_required exist in registry
    2. All depends_on references point to real subtask IDs
    3. No circular dependencies
    """
    subtask_ids = {s.id for s in plan.subtasks}

    for subtask in plan.subtasks:
        # Check tools exist
        for tool in subtask.tools_required:
            if tool not in tool_registry:
                raise ValueError(f"Unknown tool: {tool}")

        # Check dependencies exist
        for dep in subtask.depends_on:
            if dep not in subtask_ids:
                raise ValueError(f"Unknown dependency: {dep}")

    # Check for cycles (topological sort)
    # ... implementation ...

    return True
```

### Fallback Philosophy

```python
def plan_with_fallback(request: str) -> ExecutionPlan:
    try:
        plan = planner.run(request)
        validate_plan(plan, tool_registry)
        return plan
    except Exception as e:
        # Fallback: no-tools agent
        return ExecutionPlan(
            execution_mode="single",
            subtasks=[Subtask(
                id="fallback_response",
                agent_name="Fallback Agent",
                tools_required=[],
                system_instructions="Acknowledge the request and explain limitations."
            )]
        )
```

---

## 4. The Execution Strategy Implementation

### AGNO Components to Use

| Execution Mode | AGNO Component |
|----------------|----------------|
| **Single** | `Agent` directly |
| **Parallel** | `Workflow` with `Parallel` step |
| **Sequential** | `Workflow` with `Steps` or chained `Step` |

### Key Files

- `agno/libs/agno/agno/workflow/workflow.py` - Main Workflow class
- `agno/libs/agno/agno/workflow/parallel.py` - Parallel execution
- `agno/libs/agno/agno/workflow/steps.py` - Sequential steps
- `agno/libs/agno/agno/workflow/step.py` - Single step wrapper

### Single Execution Pattern

```python
from agno.agent import Agent

def execute_single(subtask: Subtask, tools: list) -> str:
    agent = Agent(
        name=subtask.agent_name,
        model=your_model,
        tools=tools,
        instructions=subtask.system_instructions + """

        IMPORTANT: Complete this task in ONE tool call.
        No retrying or verification. If information is missing, say so.
        """,
    )

    result = agent.run(user_request)
    return result.content
```

### Parallel Execution Pattern

```python
from agno.workflow import Workflow, Parallel, Step

def execute_parallel(subtasks: List[Subtask], tools_map: dict) -> dict:
    """Execute independent tasks simultaneously"""

    # Create Step for each subtask
    steps = []
    for subtask in subtasks:
        agent = Agent(
            name=subtask.agent_name,
            tools=tools_map[subtask.id],
            instructions=subtask.system_instructions,
        )
        steps.append(Step(name=subtask.id, agent=agent))

    # Create Parallel execution
    parallel = Parallel(*steps, name="parallel_execution")

    # Execute - AGNO handles concurrent execution
    result = parallel.execute(step_input)

    # Results are in result.steps as List[StepOutput]
    return {
        step_output.step_name: step_output.content
        for step_output in result.steps
    }
```

**Key AGNO Feature**: The `Parallel` class:
- Uses `ThreadPoolExecutor` for sync execution
- Uses `asyncio.gather` for async execution
- Preserves order of results
- Handles individual step failures gracefully
- Aggregates results into single `StepOutput`

### Sequential Execution Pattern

```python
from agno.workflow import Workflow, Steps, Step
from agno.workflow.types import StepInput

def execute_sequential(subtasks: List[Subtask], tools_map: dict) -> str:
    """Execute tasks in dependency order, passing context forward"""

    # Sort by dependencies (topological sort)
    ordered_subtasks = topological_sort(subtasks)

    steps = []
    for subtask in ordered_subtasks:
        agent = Agent(
            name=subtask.agent_name,
            tools=tools_map[subtask.id],
            instructions=subtask.system_instructions,
        )
        steps.append(Step(name=subtask.id, agent=agent))

    # Steps executes sequentially, passing previous output forward
    sequential = Steps(*steps, name="sequential_execution")

    result = sequential.execute(step_input)
    return result.content
```

**Key AGNO Feature**: The `Steps` class automatically:
- Passes `previous_step_content` to next step
- Maintains `previous_step_outputs` dict accessible by step name
- Handles early termination via `stop` flag

### Context Passing Mechanism

AGNO's `StepInput` handles context injection:

```python
from agno.workflow.types import StepInput, StepOutput

# After step A completes:
step_a_output: StepOutput = ...

# StepInput for step B automatically includes:
step_b_input = StepInput(
    input=original_request,
    previous_step_content=step_a_output.content,
    previous_step_outputs={"step_a": step_a_output},
)

# In step B's agent, access via instructions:
agent_b = Agent(
    instructions=f"""
    Previous result from dependency:
    {step_b_input.previous_step_content}

    Now complete your task using this context.
    """
)
```

### Response Synthesizer

```python
def create_synthesizer() -> Agent:
    return Agent(
        name="Response Synthesizer",
        model=your_model,
        instructions="""
        Synthesize all results into ONE coherent natural language response.

        Rules:
        - Write as if you personally gathered all information
        - Avoid mechanical lists or task-by-task breakdowns
        - The user asked one question; give one unified answer
        - Don't mention internal processes or subtasks
        """
    )

def synthesize_results(
    original_request: str,
    results: dict[str, str]
) -> str:
    synthesizer = create_synthesizer()

    context = f"""
    Original Request: {original_request}

    Gathered Information:
    {format_results(results)}
    """

    return synthesizer.run(context).content
```

---

## 5. The Tool Interface Implementation

### AGNO Components to Use

**Primary**:
- `agno.tools.Toolkit` - Tool registry/collection
- `agno.tools.Function` - Individual tool wrapper
- `agno.tools.mcp.MCPTools` - MCP integration

### Key Files

- `agno/libs/agno/agno/tools/toolkit.py` - Base Toolkit class
- `agno/libs/agno/agno/tools/function.py` - Function wrapper
- `agno/libs/agno/agno/tools/mcp/mcp.py` - MCP integration

### Tool Registry Pattern

```python
from agno.tools import Toolkit, Function
from typing import Callable, Dict

class ToolRegistry:
    """Central registry matching Orchestrator expectations"""

    def __init__(self):
        self._tools: Dict[str, dict] = {}

    def register(
        self,
        name: str,
        factory: Callable[[], Toolkit],
        description: str
    ):
        """
        Two-Phase Resolution:
        1. Planning Phase: description used for tool selection
        2. Execution Phase: factory called to get instance
        """
        self._tools[name] = {
            "factory": factory,
            "description": description,
        }

    def get_descriptions(self) -> Dict[str, str]:
        """For Planner context"""
        return {name: info["description"] for name, info in self._tools.items()}

    def resolve(self, tool_names: list[str]) -> list[Toolkit]:
        """Lazy instantiation at execution time"""
        return [self._tools[name]["factory"]() for name in tool_names]

# Usage
registry = ToolRegistry()
registry.register(
    "duckduckgo",
    lambda: DuckDuckGoTools(),
    "Web search engine for finding current information"
)
registry.register(
    "weather",
    lambda: OpenWeatherTools(api_key=API_KEY),
    "Get current weather data for any location"
)
```

### MCP Integration (The Interface Gap)

AGNO's `MCPTools` bridges MCP to the expected tool interface:

```python
from agno.tools.mcp import MCPTools

# Connect to MCP server
mcp_tools = MCPTools(
    transport="streamable-http",
    url="https://your-mcp-server.com/mcp",
    # Or for stdio:
    # transport="stdio",
    # command="npx -y @your/mcp-server",
)

# MCPTools automatically:
# 1. Discovers tools from MCP server
# 2. Creates Function wrappers for each
# 3. Handles async/streaming transparently
# 4. Converts MCP responses to string results

# Use with Agent
agent = Agent(
    tools=[mcp_tools],
    ...
)
```

### Custom Toolkit Pattern

```python
from agno.tools import Toolkit

class WeatherToolkit(Toolkit):
    """API Tools - stateless, can be called freely"""

    def __init__(self, api_key: str):
        super().__init__(name="weather")
        self.api_key = api_key
        self.register(self.get_weather)

    def get_weather(self, location: str) -> str:
        """Get current weather for a location"""
        # Implementation
        return weather_data

class TelegramToolkit(Toolkit):
    """Account Tools - require user identity"""

    def __init__(self, user_token: str):
        super().__init__(
            name="telegram",
            requires_confirmation_tools=["send_message"],  # Human-in-loop
        )
        self.token = user_token
        self.register(self.search_contacts)
        self.register(self.send_message)

    def search_contacts(self, query: str) -> str:
        """Search for a contact by name"""
        # Preliminary step before messaging
        return contacts

    def send_message(self, contact_id: str, message: str) -> str:
        """Send a message to a contact"""
        return result
```

### Tool Contract Compliance

AGNO tools satisfy the Orchestrator's expectations:

| Orchestrator Expects | AGNO Provides |
|---------------------|---------------|
| Self-Contained | `Toolkit` encapsulates all tool logic |
| Stateless | Tools are instantiated fresh via factory |
| Clear Methods | `Function` wraps methods with type hints |
| Return Results | All tool methods return strings |

---

## 6. Memory and Context Management

### AGNO Components to Use

**Primary**:
- `agno.memory.MemoryManager` - Long-term user memory
- `agno.session.AgentSession` - Session state
- `agno.db.*` - Persistence backends

### Session Context (Sliding Window)

```python
from agno.agent import Agent
from agno.db.sqlite import SqliteDb

agent = Agent(
    db=SqliteDb(db_file="sessions.db"),

    # Session history management
    add_history_to_context=True,
    num_history_messages=20,  # Sliding window size
    num_history_runs=5,       # Number of past runs to include

    # Token management via history limits
    max_tool_calls_from_history=10,
)
```

### Long-term Memory

```python
from agno.memory import MemoryManager
from agno.db.sqlite import SqliteDb

memory_manager = MemoryManager(
    model=your_model,  # For memory extraction
    db=SqliteDb(db_file="memories.db"),
    add_memories=True,
    update_memories=True,
)

agent = Agent(
    memory_manager=memory_manager,
    enable_user_memories=True,      # Auto-extract memories
    add_memories_to_context=True,   # Include in prompts
)
```

### Session State (Custom Data)

```python
agent = Agent(
    session_state={
        "user_preferences": {},
        "conversation_topic": None,
    },
    add_session_state_to_context=True,
    enable_agentic_state=True,  # Agent can update state
)

# Access in tools via dependencies
def my_tool(session_state: dict) -> str:
    return session_state.get("user_preferences", {})
```

---

## 7. Model Configuration and Fallbacks

### Supported Model Providers

AGNO supports 30+ model providers in `agno/libs/agno/agno/models/`:

| Provider | Import | Example |
|----------|--------|---------|
| OpenAI | `agno.models.openai.OpenAIChat` | `OpenAIChat(id="gpt-4o")` |
| Anthropic | `agno.models.anthropic.Claude` | `Claude(id="claude-sonnet-4-5")` |
| Google | `agno.models.google.Gemini` | `Gemini(id="gemini-2.0-flash")` |
| Groq | `agno.models.groq.Groq` | `Groq(id="llama-3.3-70b")` |
| Together | `agno.models.together.Together` | `Together(id="...")` |
| Ollama | `agno.models.ollama.Ollama` | `Ollama(id="llama3")` |

### Model Chain Isolation

Each component gets its own model:

```python
# Router Model Chain
router_models = [
    Claude(id="claude-sonnet-4-5"),
    OpenAIChat(id="gpt-4o"),
]

# Planner Model Chain (may need stronger reasoning)
planner_models = [
    Claude(id="claude-sonnet-4-5"),
    OpenAIChat(id="gpt-4o"),
]

# Agent Model Chain
agent_models = [
    Groq(id="llama-3.3-70b"),  # Fast for simple tasks
    OpenAIChat(id="gpt-4o-mini"),
]

# Synthesizer Model Chain
synthesizer_models = [
    Claude(id="claude-sonnet-4-5"),
]
```

### Fallback Implementation

```python
from agno.exceptions import ModelProviderError

def run_with_fallback(agent_config: dict, models: list, input: str) -> str:
    """
    Model Chain Fallback Pattern
    """
    last_error = None

    for model in models:
        try:
            agent = Agent(model=model, **agent_config)
            result = agent.run(input)
            return result.content
        except ModelProviderError as e:
            last_error = e
            continue

    # All models failed - safe degradation
    return "I apologize, but I'm having technical difficulties. Please try again."
```

---

## 8. Code Examples

### Complete Router Implementation

```python
from agno.agent import Agent
from agno.workflow import Workflow, Router, Step, Parallel, Steps
from agno.workflow.types import StepInput, StepOutput
from agno.tools.mcp import MCPTools
from agno.db.sqlite import SqliteDb
from agno.memory import MemoryManager
from pydantic import BaseModel
from typing import Literal, List

# --- Data Models ---
class RouteDecision(BaseModel):
    path: Literal["direct", "agent"]
    reasoning: str

class Subtask(BaseModel):
    id: str
    tools_required: List[str]
    instructions: str
    depends_on: List[str] = []

class ExecutionPlan(BaseModel):
    mode: Literal["single", "parallel", "sequential"]
    subtasks: List[Subtask]

# --- Tool Registry ---
tool_registry = {
    "web_search": {
        "factory": lambda: DuckDuckGoTools(),
        "description": "Search the web for current information"
    },
    "weather": {
        "factory": lambda: OpenWeatherTools(),
        "description": "Get current weather data"
    },
}

# --- Components ---
def create_router() -> Agent:
    return Agent(
        name="Intent Router",
        model=Claude(id="claude-sonnet-4-5"),
        output_schema=RouteDecision,
        instructions="""
        Classify if this request needs tools or can be answered directly.

        DIRECT: Greetings, knowledge queries, clarifications
        AGENT: Live data, external actions, multi-step tasks
        """,
        db=SqliteDb(db_file="router.db"),
        add_history_to_context=True,
    )

def create_planner() -> Agent:
    return Agent(
        name="Task Planner",
        model=Claude(id="claude-sonnet-4-5"),
        output_schema=ExecutionPlan,
        instructions=f"""
        Decompose the request into subtasks.

        Available Tools:
        {format_tool_descriptions(tool_registry)}

        Rules:
        - Use "single" for most requests
        - Use "parallel" for independent comparisons
        - Use "sequential" when results chain
        """,
    )

def create_agent(subtask: Subtask) -> Agent:
    tools = [tool_registry[t]["factory"]() for t in subtask.tools_required]
    return Agent(
        name=f"Agent_{subtask.id}",
        tools=tools,
        instructions=subtask.instructions + "\n\nComplete in ONE tool call.",
    )

def create_synthesizer() -> Agent:
    return Agent(
        name="Synthesizer",
        instructions="Combine all results into one natural response."
    )

# --- Execution Factory ---
def execute_plan(plan: ExecutionPlan, request: str) -> str:
    if plan.mode == "single":
        agent = create_agent(plan.subtasks[0])
        return agent.run(request).content

    elif plan.mode == "parallel":
        steps = [
            Step(name=s.id, agent=create_agent(s))
            for s in plan.subtasks
        ]
        parallel = Parallel(*steps)
        result = parallel.execute(StepInput(input=request))

        # Synthesize results
        results = {so.step_name: so.content for so in result.steps}
        return create_synthesizer().run(
            f"Request: {request}\nResults: {results}"
        ).content

    elif plan.mode == "sequential":
        # Topological sort and execute
        ordered = topological_sort(plan.subtasks)
        context = {}

        for subtask in ordered:
            # Inject dependency results
            dep_context = "\n".join(
                f"[{dep}]: {context[dep]}"
                for dep in subtask.depends_on
            )
            enhanced_instructions = f"{subtask.instructions}\n\nContext:\n{dep_context}"

            agent = create_agent(subtask)
            agent.instructions = enhanced_instructions
            result = agent.run(request)
            context[subtask.id] = result.content

        # Return last result or synthesize
        return context[ordered[-1].id]

# --- Main Orchestrator ---
def orchestrate(request: str) -> str:
    # Route
    router = create_router()
    decision = router.run(request).content

    if decision.path == "direct":
        return Agent(name="Direct").run(request).content

    # Plan
    planner = create_planner()
    plan = planner.run(request).content

    # Execute
    return execute_plan(plan, request)
```

### Using AgentOS for Production

```python
from agno.os import AgentOS
from agno.agent import Agent
from agno.db.sqlite import SqliteDb

# Create your orchestrator agent
orchestrator = Agent(
    name="JIT Orchestrator",
    db=SqliteDb(db_file="orchestrator.db"),
    tools=[...],
    add_history_to_context=True,
)

# Wrap in AgentOS for production serving
agent_os = AgentOS(agents=[orchestrator])
app = agent_os.get_app()

if __name__ == "__main__":
    agent_os.serve(app="main:app", reload=True)
```

---

## Appendix: Key AGNO Files Reference

| Component | File Path |
|-----------|-----------|
| Agent | `agno/libs/agno/agno/agent/agent.py` |
| Team | `agno/libs/agno/agno/team/team.py` |
| Workflow | `agno/libs/agno/agno/workflow/workflow.py` |
| Router (Workflow) | `agno/libs/agno/agno/workflow/router.py` |
| Parallel | `agno/libs/agno/agno/workflow/parallel.py` |
| Steps | `agno/libs/agno/agno/workflow/steps.py` |
| Step | `agno/libs/agno/agno/workflow/step.py` |
| Toolkit | `agno/libs/agno/agno/tools/toolkit.py` |
| Function | `agno/libs/agno/agno/tools/function.py` |
| MCPTools | `agno/libs/agno/agno/tools/mcp/mcp.py` |
| MemoryManager | `agno/libs/agno/agno/memory/manager.py` |
| Model Base | `agno/libs/agno/agno/models/base.py` |
| Session | `agno/libs/agno/agno/session/*.py` |
| Database | `agno/libs/agno/agno/db/*.py` |

---

## Design Principles Alignment

| Orchestrator Principle | AGNO Implementation |
|------------------------|---------------------|
| **Fail-Safe Degradation** | Try/except with model fallback chains |
| **Single Tool Call** | Agent instructions + `tool_call_limit=1` |
| **Instruction Injection** | `StepInput.previous_step_content` + prompt engineering |
| **Model Chain Isolation** | Separate Agent instances per component |
| **JIT Everything** | Workflow Router + dynamic Agent creation |
| **Context is King** | `add_history_to_context` + `MemoryManager` |
