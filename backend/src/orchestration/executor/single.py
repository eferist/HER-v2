"""Single executor - executes one subtask."""

from typing import List
from agno.agent import Agent
from agno.exceptions import ModelProviderError
from agno.tools.mcp import MCPTools

from src.core.schemas import Subtask
from src.core.models import MODEL_CHAINS


async def execute_single(
    subtask: Subtask,
    request: str,
    mcp_tools: List[MCPTools]
) -> str:
    """
    Execute single subtask with fallback.

    Tries each model in the chain until one succeeds.
    """
    for get_model in MODEL_CHAINS["agent"]:
        try:
            model = get_model()
            agent = Agent(
                name=f"Agent_{subtask.id}",
                model=model,
                tools=mcp_tools,
                instructions=subtask.instructions + "\n\nComplete this task in ONE tool call. Be concise.",
            )
            result = await agent.arun(request)
            return result.content
        except ModelProviderError as e:
            print(f"[Executor:Single] Model failed: {e}, trying fallback...")
            continue
        except Exception as e:
            print(f"[Executor:Single] Unexpected error: {e}, trying fallback...")
            continue

    return "Unable to complete this task due to technical difficulties."
