"""Web interface - FastAPI + WebSocket server for HER-inspired UI."""

import asyncio
import json
from typing import Optional, Callable, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.core.config import load_env
from src.context import SessionMemory
from src.tools.mcp import MCPManager, load_mcp_config, connect_all_servers
from src.tools.mcp.server_metadata import get_server_metadata, get_missing_env_vars
from src.engine import orchestrate


# Global state
mcp_manager: Optional[MCPManager] = None
session: Optional[SessionMemory] = None
active_websockets: list[WebSocket] = []

app = FastAPI(title="JIT Orchestrator")

# --- CORS Configuration ---
# Allow frontend to communicate with backend from different origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Common frontend dev port
        "http://localhost:5173",      # Vite default
        "http://localhost:5500",      # Live Server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- WebSocket Broadcast ---
async def broadcast(event_type: str, data: dict):
    """Broadcast event to all connected WebSocket clients."""
    message = json.dumps({"type": event_type, **data})
    disconnected = []
    for ws in active_websockets:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    # Clean up disconnected
    for ws in disconnected:
        if ws in active_websockets:
            active_websockets.remove(ws)


async def create_event_callback() -> Callable:
    """Create callback for orchestration events."""
    async def on_event(event: dict):
        await broadcast("activity", event)
    return on_event


# --- MCP Initialization ---
async def init_mcp() -> Optional[MCPManager]:
    """Initialize MCP servers from config."""
    configs, settings = load_mcp_config()

    if not configs:
        return None

    if not settings.get("connect_on_startup", True):
        return None

    enabled_count = sum(1 for c in configs if c.enabled)
    if enabled_count == 0:
        return None

    manager = await connect_all_servers(
        configs,
        skip_failed=settings.get("skip_failed_servers", True),
        timeout=settings.get("connection_timeout", 30),
    )

    if not manager.servers:
        return None

    return manager


# --- API Endpoints ---
@app.on_event("startup")
async def startup():
    """Initialize on server start."""
    global mcp_manager, session
    load_env()
    mcp_manager = await init_mcp()
    session = SessionMemory()
    print(f"  MCP servers: {len(mcp_manager.servers) if mcp_manager else 0}")
    print(f"  Session initialized")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on server stop."""
    global mcp_manager
    if mcp_manager:
        await mcp_manager.close_all()


@app.get("/api/status")
async def get_status():
    """Get system status."""
    return {
        "mcp_connected": mcp_manager is not None and len(mcp_manager.servers) > 0,
        "mcp_servers": list(mcp_manager.servers.keys()) if mcp_manager else [],
        "mcp_tools": mcp_manager.get_all_tools() if mcp_manager else [],
        "session_turns": session.turn_count if session else 0,
        "session_tokens": session.total_tokens if session else 0,
    }


@app.post("/api/mcp/reload")
async def reload_mcp():
    """Reload MCP configuration."""
    global mcp_manager
    if mcp_manager:
        await mcp_manager.close_all()
    mcp_manager = await init_mcp()
    return {
        "success": True,
        "servers": list(mcp_manager.servers.keys()) if mcp_manager else [],
    }


@app.post("/api/memory/clear")
async def clear_memory():
    """Clear session memory."""
    global session
    if session:
        session.clear()
    return {"success": True}


@app.get("/api/memory")
async def get_memories():
    """Get memories (placeholder - long-term memory not configured)."""
    return {"memories": [], "message": "Long-term memory not configured"}


@app.get("/api/memory/search")
async def search_memories(q: str = ""):
    """Search memories (placeholder - long-term memory not configured)."""
    return {"memories": [], "query": q, "message": "Long-term memory not configured"}


@app.get("/api/mcp/servers")
async def get_mcp_servers():
    """Get list of MCP servers with their tools and config metadata."""
    configs, _ = load_mcp_config()

    servers = []
    for config in configs:
        metadata = get_server_metadata(config.name)
        missing = get_missing_env_vars(config.name)

        server_info = {
            "name": config.name,
            "enabled": config.enabled,
            "description": config.description,
            "connected": False,
            "tools": [],
            "tool_count": 0,
            # New metadata fields
            "display_name": metadata.get("display_name", config.name),
            "category": metadata.get("category", "other"),
            "env_vars": metadata.get("env_vars", []),
            "missing_vars": missing,
            "is_configured": len(missing) == 0,
            "auth_type": metadata.get("auth_type"),
            "setup_note": metadata.get("setup_note")
        }

        # Check if server is connected and get tools
        if mcp_manager and config.name in mcp_manager.servers:
            mcp = mcp_manager.servers[config.name]
            server_info["connected"] = True
            if hasattr(mcp, 'functions') and mcp.functions:
                server_info["tools"] = list(mcp.functions.keys())
                server_info["tool_count"] = len(mcp.functions)

        servers.append(server_info)

    return {"servers": servers}


@app.get("/api/mcp/servers/{server_name}/metadata")
async def get_server_config_metadata(server_name: str):
    """Get configuration metadata for a server."""
    metadata = get_server_metadata(server_name)
    missing = get_missing_env_vars(server_name)

    return {
        "server": server_name,
        "metadata": metadata,
        "missing_vars": missing,
        "is_configured": len(missing) == 0
    }


@app.post("/api/mcp/servers/{server_name}/configure")
async def configure_server(server_name: str, config: dict):
    """
    Configure a server's environment variables and optionally enable it.

    Body: {
        "env_vars": {"VAR_NAME": "value", ...},
        "enable": true
    }
    """
    from pathlib import Path
    from dotenv import load_dotenv

    env_vars = config.get("env_vars", {})
    enable = config.get("enable", False)

    # 1. Update .env file
    env_path = Path(__file__).parent.parent.parent / ".env"
    env_lines = []
    existing_vars = set()

    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                # Check if this line sets a var we're updating
                found = False
                for var_name in env_vars:
                    if line.startswith(f"{var_name}="):
                        env_lines.append(f"{var_name}={env_vars[var_name]}\n")
                        existing_vars.add(var_name)
                        found = True
                        break
                if not found:
                    env_lines.append(line)

    # Add new vars that weren't in the file
    for var_name, value in env_vars.items():
        if var_name not in existing_vars:
            env_lines.append(f"{var_name}={value}\n")

    # Write back
    with open(env_path, "w") as f:
        f.writelines(env_lines)

    # 2. Update mcp_config.json if enabling
    if enable:
        config_path = Path(__file__).parent.parent.parent / "mcp_config.json"
        with open(config_path, "r") as f:
            mcp_config = json.load(f)

        if server_name in mcp_config.get("servers", {}):
            mcp_config["servers"][server_name]["enabled"] = True

            with open(config_path, "w") as f:
                json.dump(mcp_config, f, indent=2)

    # 3. Reload environment
    load_dotenv(env_path, override=True)

    return {
        "success": True,
        "server": server_name,
        "enabled": enable,
        "message": f"Configuration saved. {'Server enabled.' if enable else 'Run mcp:reload to apply.'}"
    }


@app.post("/api/mcp/servers/{server_name}/toggle")
async def toggle_server(server_name: str, body: dict):
    """Enable or disable a server."""
    from pathlib import Path

    enabled = body.get("enabled", False)

    config_path = Path(__file__).parent.parent.parent / "mcp_config.json"
    with open(config_path, "r") as f:
        mcp_config = json.load(f)

    if server_name in mcp_config.get("servers", {}):
        mcp_config["servers"][server_name]["enabled"] = enabled

        with open(config_path, "w") as f:
            json.dump(mcp_config, f, indent=2)

        return {"success": True, "server": server_name, "enabled": enabled}

    return {"success": False, "error": "Server not found"}


# --- WebSocket Handler ---
@app.websocket("/ws")
async def websocket_handler(websocket: WebSocket):
    """Handle WebSocket connections for real-time chat."""
    await websocket.accept()
    active_websockets.append(websocket)

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "chat":
                user_input = message.get("content", "").strip()
                if not user_input:
                    continue

                # Send "thinking" activity
                await broadcast("activity", {
                    "event": "thinking",
                    "message": "Processing your request..."
                })

                # Create event callback for this request
                async def on_event(event: dict):
                    await broadcast("activity", event)

                # Run orchestration
                try:
                    response = await orchestrate(
                        user_input,
                        mcp_manager=mcp_manager,
                        session=session,
                        on_event=on_event,
                    )

                    # Send response
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "content": response,
                    }))

                    # Send completion activity
                    await broadcast("activity", {
                        "event": "complete",
                        "message": "Done"
                    })

                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "content": f"Error: {str(e)}",
                    }))

            elif message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        if websocket in active_websockets:
            active_websockets.remove(websocket)


def run_web(host: str = "0.0.0.0", port: int = 8000):
    """Run the web server."""
    print("\n" + "="*60)
    print("  JIT Orchestrator - API Server")
    print("="*60)
    print(f"\n  Starting server at http://localhost:{port}")
    print("  API endpoints:")
    print("    GET  /api/status       - System status")
    print("    GET  /api/mcp/servers  - List MCP servers")
    print("    POST /api/mcp/reload   - Reload MCP config")
    print("    POST /api/memory/clear - Clear session")
    print("    WS   /ws               - WebSocket chat")
    print("\n  CORS enabled for frontend development")
    print("  Press Ctrl+C to stop\n")

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    run_web()
