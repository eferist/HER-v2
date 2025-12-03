"""Executor module - handles single, parallel, and sequential execution."""

from typing import List, Union, Optional
from agno.tools.mcp import MCPTools

from src.core.schemas import ExecutionPlan, Subtask
from src.tools.mcp import MCPManager
from .single import execute_single
from .parallel import execute_parallel
from .sequential import execute_sequential


def filter_tools_for_subtask(
    subtask: Subtask,
    all_tools: List[MCPTools],
    mcp_manager: Optional[MCPManager] = None
) -> List[MCPTools]:
    """
    Filter MCPTools to only those needed for a subtask.

    Args:
        subtask: The subtask with tool requirements
        all_tools: All available MCPTools
        mcp_manager: Optional MCPManager for smarter filtering

    Returns:
        Filtered list of MCPTools (or all if no specific tools requested)
    """
    if not subtask.tools:
        return all_tools

    if mcp_manager:
        # Use MCPManager's optimized lookup
        return mcp_manager.get_tools_for_subtask(subtask.tools)

    # Fallback: manual filtering without MCPManager
    needed = []
    seen = set()
    for mcp in all_tools:
        if not hasattr(mcp, 'functions'):
            continue
        for tool_name in subtask.tools:
            if tool_name in mcp.functions and id(mcp) not in seen:
                seen.add(id(mcp))
                needed.append(mcp)
                break

    return needed if needed else all_tools


async def execute(
    plan: ExecutionPlan,
    request: str,
    mcp_tools: Union[MCPTools, List[MCPTools]],
    mcp_manager: Optional[MCPManager] = None
) -> str:
    """
    Execute plan based on mode.

    Args:
        plan: Execution plan from planner
        request: Original user request
        mcp_tools: Single MCPTools or list of them
        mcp_manager: Optional MCPManager for optimized tool filtering
    """
    # Normalize to list
    tools_list = mcp_tools if isinstance(mcp_tools, list) else [mcp_tools]

    if plan.mode == "single":
        filtered = filter_tools_for_subtask(plan.subtasks[0], tools_list, mcp_manager)
        return await execute_single(plan.subtasks[0], request, filtered)
    elif plan.mode == "parallel":
        return await execute_parallel(plan.subtasks, request, tools_list, mcp_manager)
    elif plan.mode == "sequential":
        return await execute_sequential(plan.subtasks, request, tools_list, mcp_manager)
    else:
        raise ValueError(f"Unknown execution mode: {plan.mode}")
