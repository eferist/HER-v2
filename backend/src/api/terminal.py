"""Terminal interface - command-line REPL."""

import asyncio
import os
from typing import Optional

from src.core.config import (
    load_env,
    LONGTERM_MEMORY_ENABLED,
    COGNEE_DATA_DIR,
    COGNEE_DATASET_NAME,
)
from src.context import MemoryManager
from src.tools.mcp import MCPManager, load_mcp_config, connect_all_servers
from src.engine import orchestrate


async def init_mcp() -> Optional[MCPManager]:
    """Initialize MCP servers from config."""
    configs, settings = load_mcp_config()

    if not configs:
        print("  No MCP config found")
        return None

    if not settings.get("connect_on_startup", True):
        print("  MCP auto-connect disabled")
        return None

    enabled_count = sum(1 for c in configs if c.enabled)
    if enabled_count == 0:
        print("  No MCP servers enabled")
        return None

    print(f"  Found {enabled_count} enabled server(s)")

    manager = await connect_all_servers(
        configs,
        skip_failed=settings.get("skip_failed_servers", True),
        timeout=settings.get("connection_timeout", 30),
    )

    if manager.servers:
        total_tools = len(manager.get_all_tools())
        print(f"  Total tools available: {total_tools}")
    else:
        print("  No servers connected")
        return None

    return manager


async def run_terminal_async():
    """Run interactive terminal session (async)."""
    # Load environment variables
    load_env()

    # Check for API keys
    gemini_key = os.getenv("GOOGLE_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    print("\n" + "="*60)
    print("  JIT Orchestrator - Terminal Interface")
    print("="*60)

    # Show API key status
    print(f"\n  GOOGLE_API_KEY: {'✓ Set' if gemini_key else '✗ Missing'}")
    print(f"  OPENROUTER_API_KEY: {'✓ Set' if openrouter_key else '✗ Missing'}")

    if not gemini_key:
        print("\n  ⚠ Warning: GOOGLE_API_KEY not set in .env file")
        print("    Add your API key to .env or set the environment variable")

    # Initialize MCP servers
    print("\n  Initializing MCP servers...")
    mcp_manager = await init_mcp()

    # Initialize memory manager (session + long-term)
    memory = MemoryManager(
        cognee_data_dir=COGNEE_DATA_DIR,
        cognee_dataset=COGNEE_DATASET_NAME,
        enable_longterm=LONGTERM_MEMORY_ENABLED,
    )
    await memory.initialize()
    print(f"  Memory initialized (long-term: {'enabled' if memory.longterm_available else 'disabled'})")

    print("\n  Commands:")
    print("    Type your request to get started")
    print("    'mcp:<command>' - Use manual MCP server (one-time)")
    print("    'mcp:reload' - Reload MCP config")
    print("    'mcp:status' - Show connected servers")
    print("    'memory:status' - Show memory stats")
    print("    'memory:clear' - Clear session memory")
    print("    'memory:clear-all' - Clear all memory (session + long-term)")
    print("    'memory:save <info>' - Save to long-term memory")
    print("    'memory:search <query>' - Search long-term memory")
    print("    'quit' or 'exit' - Stop")
    print("="*60)

    manual_mcp_command = None

    try:
        while True:
            try:
                user_input = input("\n> ").strip()

                if not user_input:
                    continue

                if user_input.lower() in ["quit", "exit", "q"]:
                    print("Goodbye!")
                    break

                # MCP status command
                if user_input.lower() == "mcp:status":
                    if mcp_manager and mcp_manager.servers:
                        print("\n  Connected MCP servers:")
                        for name, mcp in mcp_manager.servers.items():
                            tool_count = len(mcp.functions) if hasattr(mcp, 'functions') else 0
                            print(f"    • {name}: {tool_count} tools")
                        print(f"\n  Total tools: {len(mcp_manager.get_all_tools())}")
                    else:
                        print("\n  No MCP servers connected")
                    continue

                # MCP reload command
                if user_input.lower() == "mcp:reload":
                    print("\n  Reloading MCP config...")
                    if mcp_manager:
                        await mcp_manager.close_all()
                    mcp_manager = await init_mcp()
                    continue

                # Memory clear command (session only)
                if user_input.lower() == "memory:clear":
                    memory.clear_session()
                    print("\n  Session memory cleared")
                    continue

                # Memory clear-all command (session + long-term)
                if user_input.lower() == "memory:clear-all":
                    await memory.clear_all()
                    print("\n  All memory cleared (session + long-term)")
                    continue

                # Memory save command
                if user_input.lower().startswith("memory:save "):
                    info = user_input[12:].strip()
                    if info:
                        success = await memory.persist(info)
                        if success:
                            print(f"\n  Saved to long-term memory: {info[:50]}...")
                        else:
                            print("\n  Failed to save (long-term memory not available)")
                    else:
                        print("\n  Usage: memory:save <information to remember>")
                    continue

                # Memory search command
                if user_input.lower().startswith("memory:search "):
                    query = user_input[14:].strip()
                    if query:
                        results = await memory.search_longterm(query, limit=5)
                        if results:
                            print(f"\n  Long-term memory results for '{query}':")
                            for i, mem in enumerate(results, 1):
                                print(f"    {i}. {mem.content}")
                        else:
                            print("\n  No memories found (or long-term memory not available)")
                    else:
                        print("\n  Usage: memory:search <query>")
                    continue

                # Memory status command
                if user_input.lower() == "memory:status":
                    status = memory.status()
                    print(f"\n  Memory Status:")
                    print(f"    Session:")
                    print(f"      Turns: {status['session']['turns']}")
                    print(f"      Tokens: {status['session']['tokens']}")
                    print(f"    Long-term:")
                    print(f"      Enabled: {status['longterm']['enabled']}")
                    print(f"      Available: {status['longterm']['available']}")
                    continue

                # Check for manual MCP command setting
                if user_input.lower().startswith("mcp:"):
                    manual_mcp_command = user_input[4:].strip()
                    if manual_mcp_command and manual_mcp_command not in ["status", "reload"]:
                        print(f"Manual MCP command set for next request: {manual_mcp_command}")
                    else:
                        manual_mcp_command = None
                    continue

                # Run orchestration
                response = await orchestrate(
                    user_input,
                    mcp_manager=mcp_manager,
                    mcp_command=manual_mcp_command,
                    memory=memory,
                )

                # Clear manual MCP after use
                manual_mcp_command = None

                print(f"\n{'─'*60}")
                print(response)
                print(f"{'─'*60}")

            except KeyboardInterrupt:
                print("\n\nInterrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\nError: {e}")

    finally:
        # Cleanup MCP connections
        if mcp_manager:
            await mcp_manager.close_all()


def run_terminal():
    """Run interactive terminal session."""
    asyncio.run(run_terminal_async())
