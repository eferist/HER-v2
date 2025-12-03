"""Sequential executor - executes subtasks in dependency order."""

from typing import List, Optional
from agno.agent import Agent
from agno.tools.mcp import MCPTools

from src.core.schemas import Subtask
from src.core.models import get_model
from src.tools.mcp import MCPManager


def topological_sort(subtasks: list[Subtask]) -> list[Subtask]:
    """
    Sort subtasks by dependencies using topological sort.

    Returns subtasks in execution order where dependencies come first.
    """
    result = []
    done = set()
    subtask_map = {s.id: s for s in subtasks}

    def visit(task: Subtask):
        if task.id in done:
            return
        for dep_id in task.depends_on:
            if dep_id in subtask_map:
                visit(subtask_map[dep_id])
        done.add(task.id)
        result.append(task)

    for task in subtasks:
        visit(task)

    return result


async def execute_sequential(
    subtasks: list[Subtask],
    request: str,
    mcp_tools: List[MCPTools],
    mcp_manager: Optional[MCPManager] = None
) -> str:
    """
    Execute subtasks in dependency order.

    Each subtask receives results from its dependencies via instruction injection.
    Each subtask only receives the tools it needs.
    """
    # Import here to avoid circular imports
    from . import filter_tools_for_subtask

    # Sort by dependencies
    ordered = topological_sort(subtasks)

    # Store results as we go
    context = {}

    for subtask in ordered:
        # Filter tools for this specific subtask
        filtered_tools = filter_tools_for_subtask(subtask, mcp_tools, mcp_manager)

        # Inject previous results into instructions
        dep_results = "\n".join(
            f"[Result from {dep}]: {context[dep]}"
            for dep in subtask.depends_on
            if dep in context
        )

        enhanced_instructions = subtask.instructions
        if dep_results:
            enhanced_instructions += f"\n\nPrevious results you can use:\n{dep_results}"

        try:
            model = get_model("agent")  # Primary model
            agent = Agent(
                name=f"Agent_{subtask.id}",
                model=model,
                tools=filtered_tools,  # Only pass tools needed for this subtask
                instructions=enhanced_instructions + "\n\nComplete this task in ONE tool call. Be concise.",
            )
            result = await agent.arun(request)
            context[subtask.id] = result.content
        except Exception as e:
            print(f"[Executor:Sequential] Subtask {subtask.id} failed: {e}")
            context[subtask.id] = f"Error: {str(e)}"

    # Return last result (final step in the chain)
    if ordered:
        return context.get(ordered[-1].id, "No results")
    return "No subtasks to execute"
