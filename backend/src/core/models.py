"""LLM configuration and model chains for each component."""

from agno.models.google import Gemini
from agno.models.openrouter import OpenRouter


# Primary model - fast & cost-effective (Google GenAI)
def get_gemini():
    """Get Gemini 2.5 Flash model."""
    return Gemini(id="gemini-2.5-flash")


# Fallback for complex reasoning (via OpenRouter)
def get_gpt4o():
    """Get GPT-4o model via OpenRouter."""
    return OpenRouter(id="openai/gpt-4o")


# Fast fallback for simple tasks (via OpenRouter)
def get_kimi():
    """Get Kimi K2 model via OpenRouter."""
    return OpenRouter(id="moonshotai/kimi-k2-0905")


# Model chains per component
# Order matters: primary first, then fallbacks
MODEL_CHAINS = {
    "router": [get_gemini, get_kimi],           # Fast classification
    "planner": [get_gemini, get_gpt4o],         # Complex reasoning fallback
    "agent": [get_gemini, get_gpt4o],           # Tool usage fallback
    "synthesizer": [get_gemini, get_kimi],      # Fast synthesis
}


def get_model(component: str, fallback_index: int = 0):
    """
    Get model for component with fallback support.

    Args:
        component: One of "router", "planner", "agent", "synthesizer"
        fallback_index: Index in the chain (0 = primary, 1+ = fallbacks)

    Returns:
        Model instance
    """
    chain = MODEL_CHAINS.get(component, [get_gemini])
    if fallback_index < len(chain):
        return chain[fallback_index]()
    return chain[-1]()  # Return last available
