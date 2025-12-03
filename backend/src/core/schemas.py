"""Data models for the JIT Orchestrator."""

from pydantic import BaseModel
from typing import List, Literal


class RouteDecision(BaseModel):
    """Router's classification decision."""
    path: Literal["direct", "agent"]
    reasoning: str


class Subtask(BaseModel):
    """A single subtask in an execution plan."""
    id: str                          # e.g., "get_weather"
    tools: List[str]                 # MCP tool names
    instructions: str
    depends_on: List[str] = []


class ExecutionPlan(BaseModel):
    """Plan for executing a request."""
    mode: Literal["single", "parallel", "sequential"]
    subtasks: List[Subtask]
