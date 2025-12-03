"""Planner - creates execution plans from requests."""

from agno.agent import Agent
from agno.exceptions import ModelProviderError

from src.core.schemas import ExecutionPlan, Subtask
from src.core.models import MODEL_CHAINS


def create_planner(model, available_tools: list[str], context: str = "") -> Agent:
    """Create planner agent with given model and tool descriptions."""
    tools_desc = "\n".join(f"- {t}" for t in available_tools) if available_tools else "No tools available"

    base_instructions = f"""
        Create an execution plan for the request.

        Available MCP Tools:
        {tools_desc}

        Rules:
        - SINGLE: One tool call (most common case)
        - PARALLEL: Independent tool calls that don't depend on each other
          Example: "Compare weather in Tokyo and NYC" → two parallel weather calls
        - SEQUENTIAL: Chained calls where later steps need earlier results
          Example: "Get weather then send to Telegram" → weather first, then message

        For each subtask provide:
        - id: Short identifier (verb_noun format, e.g., "get_weather")
        - tools: List of MCP tool names needed
        - instructions: Clear instructions for the agent
        - depends_on: List of subtask IDs this depends on (for sequential)

        Keep it simple. Most requests need just SINGLE mode.
        """

    # Prepend context if available
    if context:
        instructions = f"""Conversation context:
{context}

Use the conversation history to understand follow-up requests. For example, "How about Tokyo?" after a weather query means get Tokyo's weather.

{base_instructions}"""
    else:
        instructions = base_instructions

    return Agent(
        name="Planner",
        model=model,
        output_schema=ExecutionPlan,
        instructions=instructions,
    )


def plan(request: str, available_tools: list[str], context: str = "") -> ExecutionPlan:
    """
    Create execution plan with automatic fallback.

    Tries each model in the chain until one succeeds.
    If all fail, returns a simple fallback plan.

    Args:
        request: User's request
        available_tools: List of available MCP tool names
        context: Optional conversation context for follow-up understanding
    """
    for get_model in MODEL_CHAINS["planner"]:
        try:
            model = get_model()
            planner = create_planner(model, available_tools, context)
            result = planner.run(request)
            return result.content
        except ModelProviderError as e:
            print(f"[Planner] Model failed: {e}, trying fallback...")
            continue
        except Exception as e:
            print(f"[Planner] Unexpected error: {e}, trying fallback...")
            continue

    # All models failed - return simple fallback plan
    print("[Planner] All models failed, returning fallback plan")
    return ExecutionPlan(
        mode="single",
        subtasks=[Subtask(
            id="fallback",
            tools=[],
            instructions="Acknowledge the request and explain that you're having technical difficulties processing it."
        )]
    )
