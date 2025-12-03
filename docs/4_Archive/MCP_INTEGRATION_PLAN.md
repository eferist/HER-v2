# MCP Integration Plan

## Current State

The orchestrator has basic MCP support via AGNO's `MCPTools`:
- Stdio transport (local servers via `npx` commands)
- HTTP transport (remote servers)
- Manual connection per request (`mcp:<command>`)

**Problem**: User must manually specify MCP server each time. No pre-configured toolset.

## Proposal: Pre-configured MCP Stack

### Recommended MCP Servers

Based on research, here's a practical stack for a JIT orchestrator:

| Server | Purpose | Command |
|--------|---------|---------|
| **Filesystem** | Read/write files, directory ops | `npx -y @modelcontextprotocol/server-filesystem <path>` |
| **Git** | Git operations (status, diff, commit) | `npx -y @modelcontextprotocol/server-git` |
| **Fetch** | Web content fetching | `npx -y @modelcontextprotocol/server-fetch` |
| **Memory** | Persistent knowledge graph | `npx -y @modelcontextprotocol/server-memory` |
| **Sequential Thinking** | Complex reasoning chains | `npx -y @modelcontextprotocol/server-sequential-thinking` |

### Why These?

1. **Filesystem** - Core capability. Read/write code, configs, docs.
2. **Git** - Essential for dev workflows. Commit, branch, diff.
3. **Fetch** - Web research, API docs, external data.
4. **Memory** - Persist context across sessions. Remember user preferences.
5. **Sequential Thinking** - Break down complex problems step-by-step.

### Implementation Options

#### Option A: Config File (Recommended)

Create `mcp_config.json` in project root:

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "enabled": true
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "enabled": true
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "enabled": false
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "enabled": false
    }
  }
}
```

**Pros**: Flexible, user can enable/disable, easy to add more
**Cons**: Requires config file management

#### Option B: Hardcoded Defaults

Hardcode essential servers in code, allow override via terminal.

**Pros**: Zero config, works out of box
**Cons**: Less flexible

#### Option C: Hybrid

Hardcoded essentials (filesystem, git) + config file for extras.

**Pros**: Best of both
**Cons**: Slightly more complex

## Recommended Approach: Option A (Config File)

### Changes Required

1. **New file**: `mcp_config.json` - Server configurations
2. **Update**: `src/orchestrator/mcp.py` - Load config, manage multiple servers
3. **Update**: `src/orchestrator/main.py` - Auto-connect on startup
4. **Update**: `src/orchestrator/executor/` - Pass combined tools to agents

### New Architecture

```
Startup
   │
   ▼
┌─────────────────────┐
│ Load mcp_config.json │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Connect enabled     │
│ servers in parallel │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Merge all tools     │
│ into single toolkit │
└──────────┬──────────┘
           │
           ▼
      Ready for requests
```

### Tool Availability by Mode

| Execution Mode | Tools Available |
|----------------|-----------------|
| Direct | None (no tools needed) |
| Single | All enabled MCP tools |
| Parallel | All enabled MCP tools (shared) |
| Sequential | All enabled MCP tools (shared) |

## Questions to Decide

1. **Which servers to enable by default?**
   - Minimal: Just filesystem
   - Standard: filesystem + git + fetch
   - Full: All of them

2. **Memory server usage?**
   - Persist across sessions?
   - Scope: per-project or global?

3. **Connection strategy?**
   - Connect all on startup (faster requests, more resources)
   - Connect on-demand (slower first request, less resources)

4. **Error handling?**
   - Skip failed servers and continue?
   - Fail startup if any server fails?

## Next Steps

1. Decide on defaults (minimal/standard/full)
2. Implement config loader
3. Implement multi-server connection manager
4. Update executor to use combined toolkit
5. Test with real MCP servers

## References

- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Filesystem Server](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem)
- [Docker's MCP Recommendations](https://www.docker.com/blog/top-mcp-servers-2025/)
- [Best MCP Servers 2025](https://www.pomerium.com/blog/best-model-context-protocol-mcp-servers-in-2025)
