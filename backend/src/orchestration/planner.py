"""Planner - creates dynamic workflow graphs from requests."""

from agno.agent import Agent
from agno.exceptions import ModelProviderError

from src.core.schemas import ExecutionPlan, Subtask
from src.core.models import MODEL_CHAINS


def create_planner(model, available_tools: list[str], context: str = "") -> Agent:
    """Create planner agent with given model and tool descriptions."""
    tools_desc = "\n".join(f"- {t}" for t in available_tools) if available_tools else "No tools available"

    base_instructions = f"""
        Create an execution plan for the request as a workflow graph.

        Available MCP Tools:
        {tools_desc}

        Design a graph of subtasks using depends_on relationships:

        PATTERNS:
        - Single task: One subtask with no dependencies
          Example: "What's the weather?" → one subtask

        - Parallel tasks: Multiple subtasks with no dependencies
          Example: "Compare weather in Tokyo and NYC" → two subtasks, both with depends_on: []

        - Sequential chain: Subtasks that depend on previous ones
          Example: "Get weather then send to Telegram" →
            subtask1: get_weather (depends_on: [])
            subtask2: send_message (depends_on: ["get_weather"])

        - Fan-out then aggregate: Parallel tasks followed by a combining task
          Example: "Get weather in 3 cities and summarize" →
            subtask1: weather_city1 (depends_on: [])
            subtask2: weather_city2 (depends_on: [])
            subtask3: weather_city3 (depends_on: [])
            subtask4: summarize (depends_on: ["weather_city1", "weather_city2", "weather_city3"])

        - Conditional branching (optional): Use 'condition' field
          Example: "If rainy, find indoor activities" →
            subtask1: get_weather (depends_on: [])
            subtask2: indoor_activities (depends_on: ["get_weather"], condition: "get_weather.result contains 'rain'")
            subtask3: outdoor_activities (depends_on: ["get_weather"], condition: "get_weather.result contains 'sunny'")

        For each subtask provide:
        - id: Short identifier (verb_noun format, e.g., "get_weather")
        - tools: List of MCP tool names needed (can be empty for synthesis tasks)
        - instructions: Clear instructions for the agent
        - depends_on: List of subtask IDs this depends on
        - condition: (optional) Only run if this condition is true

        Keep it simple. Most requests need just ONE subtask.
        Only create multiple subtasks when the request genuinely requires it.
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
        subtasks=[Subtask(
            id="fallback",
            tools=[],
            instructions="Acknowledge the request and explain that you're having technical difficulties processing it."
        )]
    )
