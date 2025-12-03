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
