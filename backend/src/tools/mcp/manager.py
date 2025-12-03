"""MCP multi-server manager."""

from typing import Dict, List, Optional
from dataclasses import dataclass, field

from agno.tools.mcp import MCPTools

from .config import MCPServerConfig


@dataclass
class MCPManager:
    """Manages multiple MCP server connections."""
    servers: Dict[str, MCPTools] = field(default_factory=dict)
    configs: Dict[str, MCPServerConfig] = field(default_factory=dict)

    def get_all_tools(self) -> List[str]:
        """Get list of all available tool names across all connected servers."""
        tools = []
        for mcp in self.servers.values():
            if hasattr(mcp, 'functions') and mcp.functions:
                tools.extend(mcp.functions.keys())
        return tools

    def get_server_for_tool(self, tool_name: str) -> Optional[MCPTools]:
        """Find which server provides a specific tool."""
        for mcp in self.servers.values():
            if hasattr(mcp, 'functions') and tool_name in mcp.functions:
                return mcp
        return None

    def get_tools_for_subtask(self, tool_names: List[str]) -> List[MCPTools]:
        """
        Get only the MCPTools servers that provide the requested tools.

        Args:
            tool_names: List of tool names needed for a subtask

        Returns:
            List of MCPTools servers that have at least one of the requested tools
        """
        if not tool_names:
            # No specific tools requested - return all servers
            return list(self.servers.values())

        needed_servers = []
        seen = set()

        for tool_name in tool_names:
            server = self.get_server_for_tool(tool_name)
            if server and id(server) not in seen:
                seen.add(id(server))
                needed_servers.append(server)

        return needed_servers if needed_servers else list(self.servers.values())

    async def close_all(self):
        """Close all server connections."""
        for name, mcp in self.servers.items():
            try:
                await mcp.close()
            except Exception:
                pass
        self.servers.clear()
