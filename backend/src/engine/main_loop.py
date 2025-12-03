"""Main orchestration loop - the heart of the system."""

from typing import Optional, Callable, Any

from agno.agent import Agent

from src.core.config import ROUTER_TOKEN_LIMIT, PLANNER_TOKEN_LIMIT
from src.core.models import get_model
from src.orchestration import route, plan, execute
from src.context import SessionMemory
from src.tools.mcp import MCPManager, get_local_mcp_tools


async def orchestrate(
    request: str,
    mcp_manager: Optional[MCPManager] = None,
    mcp_command: Optional[str] = None,
    session: Optional[SessionMemory] = None,
    on_event: Optional[Callable[[dict], Any]] = None,
) -> str:
    """
    Main orchestration function.

    1. Route: Classify as direct or agent path
    2. If direct: respond without tools
    3. If agent: Plan → Execute → Return result

    Args:
        request: User's request
        mcp_manager: Pre-connected MCP manager (from startup)
        mcp_command: Manual MCP server command (overrides manager)
        session: Session memory for conversation context
        on_event: Optional callback for UI events (routing, planning, executing, etc.)

    Returns:
        Response string
    """
    # Helper to emit events
    async def emit(event_type: str, **data):
        if on_event:
            try:
                await on_event({"event": event_type, **data})
            except Exception:
                pass  # Don't let event errors break orchestration
    print(f"\n{'='*60}")
    print(f"Request: {request}")
    print(f"{'='*60}")

    # Add user message to session
    if session:
        session.add_turn("user", request)

    # Get context for routing
    router_context = session.get_context(ROUTER_TOKEN_LIMIT) if session else ""

    # Step 1: Route
    print("\n[1/3] Routing...")
    await emit("routing", message="Analyzing your request...")
    decision = route(request, context=router_context)
    print(f"  → Path: {decision.path}")
    print(f"  → Reasoning: {decision.reasoning}")
    await emit("routed", path=decision.path, reasoning=decision.reasoning)

    # Direct path - no tools needed
    if decision.path == "direct":
        print("\n[2/3] Direct response (no tools)...")
        await emit("responding", message="Generating response...")
        try:
            model = get_model("agent")

            # Build instructions with context if available
            base_instructions = "You are a helpful assistant. Answer the user's question directly and concisely."
            if router_context:
                instructions = f"""Previous conversation:
{router_context}

{base_instructions}"""
            else:
                instructions = base_instructions

            agent = Agent(
                name="DirectAssistant",
                model=model,
                instructions=instructions,
            )
            result = agent.run(request)
            response = result.content

            # Add assistant response to session
            if session:
                session.add_turn("assistant", response)

            return response
        except Exception as e:
            return f"I apologize, but I'm having trouble responding right now. Error: {e}"

    # Agent path - needs tools
    print("\n[2/3] Planning...")
    await emit("planning", message="Creating execution plan...")

    # Get context for planner (more tokens than router)
    planner_context = session.get_context(PLANNER_TOKEN_LIMIT) if session else ""

    # Determine MCP tools source
    mcp_tools = None
    manual_mcp = None
    available_tools = []

    # Manual override takes precedence
    if mcp_command:
        try:
            print(f"  → Connecting to manual MCP: {mcp_command}")
            manual_mcp = await get_local_mcp_tools(mcp_command)
            available_tools = list(manual_mcp.functions.keys())
            print(f"  → Available tools: {available_tools}")
        except Exception as e:
            print(f"  → Manual MCP connection failed: {e}")
    # Otherwise use pre-connected manager
    elif mcp_manager and mcp_manager.servers:
        available_tools = mcp_manager.get_all_tools()
        print(f"  → Using pre-connected MCP servers")
        print(f"  → Available tools: {available_tools}")

    # Create execution plan with context
    execution_plan = plan(request, available_tools, context=planner_context)
    print(f"  → Mode: {execution_plan.mode}")
    print(f"  → Subtasks:")
    subtask_info = []
    for subtask in execution_plan.subtasks:
        tools_str = ", ".join(subtask.tools) if subtask.tools else "(no specific tools)"
        deps_str = f" [depends: {', '.join(subtask.depends_on)}]" if subtask.depends_on else ""
        print(f"      • {subtask.id}: {tools_str}{deps_str}")
        subtask_info.append({"id": subtask.id, "tools": subtask.tools or []})
    await emit("planned", mode=execution_plan.mode, subtasks=subtask_info)

    # Execute plan
    print("\n[3/3] Executing...")
    await emit("executing", message="Running tools...")
    try:
        if manual_mcp:
            # Use manual MCP (no manager for filtering)
            result = await execute(execution_plan, request, manual_mcp)
        elif mcp_manager and mcp_manager.servers:
            # Pass all servers + manager for optimized tool filtering per subtask
            all_servers = list(mcp_manager.servers.values())
            result = await execute(execution_plan, request, all_servers, mcp_manager)
        else:
            # No MCP tools - use direct agent
            model = get_model("agent")
            agent = Agent(
                name="FallbackAgent",
                model=model,
                instructions=execution_plan.subtasks[0].instructions if execution_plan.subtasks else "Help the user.",
            )
            response = agent.run(request)
            result = response.content
    except Exception as e:
        result = f"I encountered an error while processing your request: {e}"
    finally:
        # Close manual MCP connection (not the manager)
        if manual_mcp:
            try:
                await manual_mcp.close()
            except Exception:
                pass

    # Add assistant response to session
    if session:
        session.add_turn("assistant", result)

    return result
