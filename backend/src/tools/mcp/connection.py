"""MCP server connection utilities."""

import asyncio
import os
from typing import List, Optional

from agno.tools.mcp import MCPTools

from .config import MCPServerConfig
from .manager import MCPManager


async def connect_mcp_server(config: MCPServerConfig, timeout: int = 30) -> Optional[MCPTools]:
    """
    Connect to a single MCP server.

    Args:
        config: Server configuration
        timeout: Connection timeout in seconds

    Returns:
        Connected MCPTools instance or None if failed
    """
    if not config.enabled:
        return None

    try:
        # Build command string
        command = f"{config.command} {' '.join(config.args)}"

        # Merge config env with current env
        env = os.environ.copy()
        env.update(config.env)

        mcp = MCPTools(
            transport="stdio",
            command=command,
            env=env,
        )

        # Connect with timeout
        await asyncio.wait_for(mcp.connect(), timeout=timeout)

        return mcp

    except asyncio.TimeoutError:
        print(f"  ! {config.name}: Connection timeout")
        return None
    except Exception as e:
        print(f"  ! {config.name}: {e}")
        return None


async def connect_all_servers(
    configs: List[MCPServerConfig],
    skip_failed: bool = True,
    timeout: int = 30,
) -> MCPManager:
    """
    Connect to all enabled MCP servers.

    Args:
        configs: List of server configurations
        skip_failed: If True, continue on failed connections
        timeout: Connection timeout per server

    Returns:
        MCPManager with connected servers
    """
    manager = MCPManager()

    enabled_configs = [c for c in configs if c.enabled]
    if not enabled_configs:
        return manager

    # Store configs
    for config in configs:
        manager.configs[config.name] = config

    # Connect to servers (sequentially to avoid npx conflicts)
    for config in enabled_configs:
        print(f"  → Connecting to {config.name}...")
        mcp = await connect_mcp_server(config, timeout)

        if mcp:
            manager.servers[config.name] = mcp
            tool_count = len(mcp.functions) if hasattr(mcp, 'functions') else 0
            print(f"  ✓ {config.name}: {tool_count} tools")
        elif not skip_failed:
            # Close already connected servers and raise
            await manager.close_all()
            raise ConnectionError(f"Failed to connect to {config.name}")

    return manager


async def get_mcp_tools(
    url: Optional[str] = None,
    command: Optional[str] = None,
    transport: str = "stdio"
) -> MCPTools:
    """
    Connect to an MCP server (single server, legacy interface).

    Args:
        url: URL for HTTP-based MCP server (streamable-http transport)
        command: Command for stdio-based MCP server
        transport: "stdio" or "streamable-http"

    Returns:
        Connected MCPTools instance
    """
    if transport == "streamable-http":
        if not url:
            raise ValueError("URL required for streamable-http transport")
        mcp = MCPTools(
            transport="streamable-http",
            url=url,
        )
    else:
        if not command:
            raise ValueError("Command required for stdio transport")
        mcp = MCPTools(
            transport="stdio",
            command=command,
        )

    await mcp.connect()
    return mcp


async def get_local_mcp_tools(command: str) -> MCPTools:
    """
    Connect to a local MCP server via stdio (legacy interface).

    Args:
        command: Command to start the MCP server
                 e.g., "npx -y @anthropic/mcp-server-filesystem"

    Returns:
        Connected MCPTools instance
    """
    return await get_mcp_tools(command=command, transport="stdio")


async def get_remote_mcp_tools(url: str) -> MCPTools:
    """
    Connect to a remote MCP server via HTTP (legacy interface).

    Args:
        url: URL of the MCP server

    Returns:
        Connected MCPTools instance
    """
    return await get_mcp_tools(url=url, transport="streamable-http")
