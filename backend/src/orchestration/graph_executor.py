"""Graph Executor - walks any DAG of subtasks dynamically.

This replaces the old executor/ folder with a single unified executor
that handles all workflow patterns: single, parallel, sequential,
branching, fan-out/fan-in, and any arbitrary DAG.

The execution pattern is inferred from the subtask dependency graph,
not from a predefined "mode" field.
"""

import asyncio
from typing import List, Dict, Optional, Set
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from agno.tools.mcp import MCPTools

from src.core.schemas import ExecutionPlan, Subtask
from src.core.models import MODEL_CHAINS
from src.tools.mcp import MCPManager
from src.orchestration.synthesizer import synthesize


def filter_tools_for_subtask(
    subtask: Subtask,
    all_tools: List[MCPTools],
    mcp_manager: Optional[MCPManager] = None
) -> List[MCPTools]:
    """Filter MCPTools to only those needed for a subtask."""
    if not subtask.tools:
        return all_tools

    if mcp_manager:
        return mcp_manager.get_tools_for_subtask(subtask.tools)

    # Fallback: manual filtering
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


def evaluate_condition(condition: str, results: Dict[str, str]) -> bool:
    """Evaluate a condition string against current results.

    Simple evaluation - checks if condition references are satisfied.
    Examples:
        - "get_weather.result contains 'rain'"
        - "search_results.result is not empty"
    """
    if not condition:
        return True

    try:
        # Simple keyword-based evaluation
        condition_lower = condition.lower()

        # Check for "contains" pattern
        if " contains " in condition_lower:
            parts = condition.split(" contains ", 1)
            subtask_ref = parts[0].strip().replace(".result", "")
            search_term = parts[1].strip().strip("'\"")
            if subtask_ref in results:
                return search_term.lower() in results[subtask_ref].lower()
            return False

        # Check for "is not empty" pattern
        if "is not empty" in condition_lower:
            subtask_ref = condition_lower.replace("is not empty", "").strip().replace(".result", "")
            if subtask_ref in results:
                return bool(results[subtask_ref].strip())
            return False

        # Check for "is empty" pattern
        if "is empty" in condition_lower:
            subtask_ref = condition_lower.replace("is empty", "").strip().replace(".result", "")
            if subtask_ref in results:
                return not bool(results[subtask_ref].strip())
            return True

        # Default: if we can't parse, run the task
        return True

    except Exception:
        # On error, default to running the task
        return True


async def execute_subtask(
    subtask: Subtask,
    request: str,
    all_tools: List[MCPTools],
    results: Dict[str, str],
    mcp_manager: Optional[MCPManager] = None
) -> str:
    """Execute a single subtask with dependency results injected."""

    # Filter tools for this subtask
    filtered_tools = filter_tools_for_subtask(subtask, all_tools, mcp_manager)

    # Build instructions with dependency results
    enhanced_instructions = subtask.instructions
    if subtask.depends_on:
        dep_results = "\n".join(
            f"[Result from {dep}]: {results[dep]}"
            for dep in subtask.depends_on
            if dep in results
        )
        if dep_results:
            enhanced_instructions += f"\n\nPrevious results you can use:\n{dep_results}"

    # Try each model in the fallback chain
    for get_model in MODEL_CHAINS["agent"]:
        try:
            model = get_model()
            agent = Agent(
                name=f"Agent_{subtask.id}",
                model=model,
                tools=filtered_tools,
                instructions=enhanced_instructions + "\n\nComplete this task. Be concise.",
            )
            result = await agent.arun(request)
            return result.content
        except ModelProviderError as e:
            print(f"[GraphExecutor] Model failed for {subtask.id}: {e}, trying fallback...")
            continue
        except Exception as e:
            print(f"[GraphExecutor] Error in {subtask.id}: {e}, trying fallback...")
            continue

    return f"Error: Unable to complete subtask {subtask.id}"


def get_ready_subtasks(
    subtasks: List[Subtask],
    completed: Set[str],
    results: Dict[str, str]
) -> List[Subtask]:
    """Find subtasks that are ready to execute.

    A subtask is ready when:
    1. It hasn't been completed yet
    2. All its dependencies are completed
    3. Its condition (if any) evaluates to true
    """
    ready = []
    for subtask in subtasks:
        # Skip if already done
        if subtask.id in completed:
            continue

        # Check all dependencies are met
        deps_met = all(dep in completed for dep in subtask.depends_on)
        if not deps_met:
            continue

        # Check condition if present
        if subtask.condition:
            if not evaluate_condition(subtask.condition, results):
                # Condition not met - mark as completed (skipped)
                completed.add(subtask.id)
                continue

        ready.append(subtask)

    return ready


async def execute(
    plan: ExecutionPlan,
    request: str,
    mcp_tools: List[MCPTools],
    mcp_manager: Optional[MCPManager] = None
) -> str:
    """Execute a workflow graph.

    Walks the DAG by repeatedly finding ready subtasks and executing them.
    Subtasks with no dependencies run first (potentially in parallel).
    Subtasks with dependencies wait for their deps to complete.

    The execution pattern emerges from the graph structure:
    - Single subtask with no deps → single execution
    - Multiple subtasks with no deps → parallel execution
    - Subtasks with deps → sequential/chained execution
    - Mix of above → complex DAG execution
    """
    # Normalize tools to list
    if not isinstance(mcp_tools, list):
        mcp_tools = [mcp_tools]

    # Track state
    results: Dict[str, str] = {}
    completed: Set[str] = set()
    subtask_map = {s.id: s for s in plan.subtasks}

    # Keep executing until nothing left
    while len(completed) < len(plan.subtasks):
        # Find ready subtasks
        ready = get_ready_subtasks(plan.subtasks, completed, results)

        if not ready:
            # Nothing ready but not all complete - might have orphaned tasks
            # (deps that will never be satisfied due to conditions)
            remaining = [s.id for s in plan.subtasks if s.id not in completed]
            print(f"[GraphExecutor] No ready tasks. Remaining: {remaining}")
            break

        # Execute ready subtasks (in parallel if multiple)
        if len(ready) == 1:
            # Single task - run directly
            subtask = ready[0]
            print(f"  → Executing: {subtask.id}")
            result = await execute_subtask(subtask, request, mcp_tools, results, mcp_manager)
            results[subtask.id] = result
            completed.add(subtask.id)
        else:
            # Multiple ready - run in parallel
            print(f"  → Executing in parallel: {[s.id for s in ready]}")
            tasks = [
                execute_subtask(subtask, request, mcp_tools, results, mcp_manager)
                for subtask in ready
            ]
            task_results = await asyncio.gather(*tasks, return_exceptions=True)

            for subtask, result in zip(ready, task_results):
                if isinstance(result, Exception):
                    results[subtask.id] = f"Error: {str(result)}"
                else:
                    results[subtask.id] = result
                completed.add(subtask.id)

    # Determine final output
    if len(results) == 0:
        return "No subtasks were executed."
    elif len(results) == 1:
        # Single result - return directly
        return list(results.values())[0]
    else:
        # Multiple results - synthesize into coherent response
        return synthesize(request, results)
