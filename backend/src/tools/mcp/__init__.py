"""MCP module - Model Context Protocol connections (Your territory)."""

from .config import MCPServerConfig, load_mcp_config
from .manager import MCPManager
from .connection import (
    connect_mcp_server,
    connect_all_servers,
    get_mcp_tools,
    get_local_mcp_tools,
    get_remote_mcp_tools,
)

__all__ = [
    "MCPServerConfig",
    "load_mcp_config",
    "MCPManager",
    "connect_mcp_server",
    "connect_all_servers",
    "get_mcp_tools",
    "get_local_mcp_tools",
    "get_remote_mcp_tools",
]
