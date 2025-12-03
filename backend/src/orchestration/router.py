"""Router - classifies requests as direct or agent path."""

from agno.agent import Agent
from agno.exceptions import ModelProviderError

from src.core.schemas import RouteDecision
from src.core.models import MODEL_CHAINS


def create_router(model, context: str = "") -> Agent:
    """Create router agent with given model."""
    base_instructions = """
        Classify the request:

        DIRECT (no tools needed):
        - Greetings: "Hi", "Thanks", "How are you?"
        - Knowledge: "What is X?", "Explain Y"
        - Clarifications about previous responses
        - General questions that don't need live data

        AGENT (tools needed):
        - Current data: "What's the weather?", "Stock price of X"
        - Actions: "Send message", "Create event"
        - Multi-step: "Search X then do Y"
        - Anything requiring external APIs or real-time info

        Respond with your classification and brief reasoning.
        """

    # Prepend context if available
    if context:
        instructions = f"""Previous conversation:
{context}

Use the conversation history to understand follow-up questions (e.g., "How about Tokyo?" after asking about weather).

{base_instructions}"""
    else:
        instructions = base_instructions

    return Agent(
        name="Router",
        model=model,
        output_schema=RouteDecision,
        instructions=instructions,
    )


def route(request: str, context: str = "") -> RouteDecision:
    """
    Route request with automatic fallback.

    Tries each model in the chain until one succeeds.
    If all fail, defaults to 'direct' path (safe fallback).

    Args:
        request: User's request
        context: Optional conversation context for follow-up understanding
    """
    for get_model in MODEL_CHAINS["router"]:
        try:
            model = get_model()
            router = create_router(model, context)
            result = router.run(request)
            return result.content
        except ModelProviderError as e:
            print(f"[Router] Model failed: {e}, trying fallback...")
            continue
        except Exception as e:
            print(f"[Router] Unexpected error: {e}, trying fallback...")
            continue

    # All models failed - default to direct (safe)
    print("[Router] All models failed, defaulting to direct path")
    return RouteDecision(path="direct", reasoning="Fallback due to model errors")
