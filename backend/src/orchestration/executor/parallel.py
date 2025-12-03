"""Parallel executor - executes multiple independent subtasks concurrently."""

import asyncio
from typing import List, Optional
from agno.agent import Agent
from agno.tools.mcp import MCPTools

from src.core.schemas import Subtask
from src.core.models import get_model
from src.tools.mcp import MCPManager
from src.orchestration.synthesizer import synthesize


async def execute_subtask(
    subtask: Subtask,
    request: str,
    all_tools: List[MCPTools],
    mcp_manager: Optional[MCPManager] = None
) -> tuple[str, str]:
    """Execute a single subtask and return (id, result)."""
    # Filter tools for this specific subtask
    from . import filter_tools_for_subtask
    filtered_tools = filter_tools_for_subtask(subtask, all_tools, mcp_manager)

    try:
        model = get_model("agent")  # Primary model
        agent = Agent(
            name=f"Agent_{subtask.id}",
            model=model,
            tools=filtered_tools,
            instructions=subtask.instructions + "\n\nComplete this task in ONE tool call. Be concise.",
        )
        result = await agent.arun(request)
        return (subtask.id, result.content)
    except Exception as e:
        print(f"[Executor:Parallel] Subtask {subtask.id} failed: {e}")
        return (subtask.id, f"Error: {str(e)}")


async def execute_parallel(
    subtasks: list[Subtask],
    request: str,
    mcp_tools: List[MCPTools],
    mcp_manager: Optional[MCPManager] = None
) -> str:
    """
    Execute multiple subtasks in parallel.

    All subtasks run concurrently, results are synthesized at the end.
    Each subtask only receives the tools it needs.
    """
    # Create tasks for all subtasks
    tasks = [
        execute_subtask(subtask, request, mcp_tools, mcp_manager)
        for subtask in subtasks
    ]

    # Execute all in parallel
    results_list = await asyncio.gather(*tasks, return_exceptions=True)

    # Collect results into dict
    results = {}
    for item in results_list:
        if isinstance(item, Exception):
            print(f"[Executor:Parallel] Task exception: {item}")
            continue
        subtask_id, content = item
        results[subtask_id] = content

    # Synthesize results into single response
    return synthesize(request, results)
