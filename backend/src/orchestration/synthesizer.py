"""Synthesizer - combines multiple results into one coherent response."""

from agno.agent import Agent
from agno.exceptions import ModelProviderError

from src.core.models import MODEL_CHAINS


def synthesize(request: str, results: dict) -> str:
    """
    Combine multiple results into one natural response.

    Tries each model in the chain until one succeeds.
    Falls back to simple concatenation if all models fail.
    """
    for get_model in MODEL_CHAINS["synthesizer"]:
        try:
            model = get_model()
            agent = Agent(
                name="Synthesizer",
                model=model,
                instructions="""
                Combine the provided results into ONE coherent, natural response.

                Rules:
                - Write as if you personally gathered all the information
                - Don't list results mechanically or say "Result 1:", "Result 2:"
                - Create a flowing, unified answer
                - The user asked one question, give one integrated answer
                - Be concise but complete
                """,
            )

            # Format results for the synthesizer
            results_text = "\n\n".join(
                f"[{task_id}]:\n{content}"
                for task_id, content in results.items()
            )

            context = f"Original Request: {request}\n\nGathered Information:\n{results_text}"
            result = agent.run(context)
            return result.content

        except ModelProviderError as e:
            print(f"[Synthesizer] Model failed: {e}, trying fallback...")
            continue
        except Exception as e:
            print(f"[Synthesizer] Unexpected error: {e}, trying fallback...")
            continue

    # All models failed - simple concatenation fallback
    print("[Synthesizer] All models failed, using simple concatenation")
    return "\n\n".join(f"{k}: {v}" for k, v in results.items())
