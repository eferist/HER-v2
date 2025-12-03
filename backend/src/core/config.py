"""Centralized configuration and environment loading."""

from pathlib import Path
from dotenv import load_dotenv


def get_project_root() -> Path:
    """Find the project root directory (where .env lives)."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".env").exists() or (parent / "mcp_config.json").exists():
            return parent
    return Path.cwd()


def load_env() -> bool:
    """Load environment variables from .env file."""
    root = get_project_root()
    env_file = root / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        return True
    load_dotenv()
    return False


# Token limits for context injection
ROUTER_TOKEN_LIMIT = 500
PLANNER_TOKEN_LIMIT = 1000

# Long-term memory (Cognee) settings
LONGTERM_MEMORY_ENABLED = True
COGNEE_DATA_DIR = get_project_root() / ".cognee_data"
COGNEE_DATASET_NAME = "her_memory"
LONGTERM_MEMORY_LIMIT = 3  # Max memories to inject into context
