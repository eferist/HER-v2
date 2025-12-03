"""Data models for the JIT Orchestrator."""

from pydantic import BaseModel
from typing import List, Literal, Optional


class RouteDecision(BaseModel):
    """Router's classification decision."""
    path: Literal["direct", "agent"]
    reasoning: str


class Subtask(BaseModel):
    """A single subtask in an execution plan.

    The workflow structure is defined by depends_on relationships,
    allowing arbitrary DAG (Directed Acyclic Graph) execution patterns.
    """
    id: str                              # e.g., "get_weather"
    tools: List[str] = []                # MCP tool names
    instructions: str
    depends_on: List[str] = []           # Subtask IDs this depends on
    condition: Optional[str] = None      # Optional: only run if condition met


class ExecutionPlan(BaseModel):
    """Plan for executing a request.

    No fixed 'mode' - the graph executor infers execution pattern
    from the subtask dependency graph:
    - No deps + single task = single execution
    - No deps + multiple tasks = parallel execution
    - With deps = sequential/graph execution
    - With conditions = branching execution
    """
    subtasks: List[Subtask]
