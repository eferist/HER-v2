"""MCP configuration loading."""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field


def expand_env_vars(value: str) -> str:
    """Expand ${VAR} patterns with environment variable values."""
    pattern = r'\$\{([^}]+)\}'
    def replacer(match):
        var_name = match.group(1)
        return os.getenv(var_name, "")
    return re.sub(pattern, replacer, value)


@dataclass
class MCPServerConfig:
    """Configuration for a single MCP server."""
    name: str
    command: str
    args: List[str]
    enabled: bool = True
    description: str = ""
    env: Dict[str, str] = field(default_factory=dict)


def load_mcp_config(config_path: Optional[Path] = None) -> tuple[List[MCPServerConfig], dict]:
    """
    Load MCP configuration from JSON file.

    Args:
        config_path: Path to config file. If None, searches project root.

    Returns:
        Tuple of (list of server configs, settings dict)
    """
    if config_path is None:
        # Search for config in project root
        current = Path(__file__).resolve()
        for parent in current.parents:
            candidate = parent / "mcp_config.json"
            if candidate.exists():
                config_path = candidate
                break

    if config_path is None or not config_path.exists():
        return [], {"connect_on_startup": False, "skip_failed_servers": True}

    with open(config_path) as f:
        data = json.load(f)

    servers = []
    for name, config in data.get("servers", {}).items():
        # Expand environment variables in env dict
        env_vars = {}
        for k, v in config.get("env", {}).items():
            env_vars[k] = expand_env_vars(v)

        servers.append(MCPServerConfig(
            name=name,
            command=config.get("command", ""),
            args=config.get("args", []),
            enabled=config.get("enabled", True),
            description=config.get("description", ""),
            env=env_vars,
        ))

    settings = data.get("settings", {})
    return servers, settings
