"""
JIT Orchestrator - Main Entry Point

Terminal-based orchestrator using AGNO + MCP.

Usage:
    python -m src.main          # Terminal mode (default)
    python -m src.main web      # Web interface
"""

import sys

from src.api import run_terminal


def main():
    # Check for web mode argument
    if len(sys.argv) > 1 and sys.argv[1] == "web":
        from src.api.web import run_web
        run_web()
    else:
        run_terminal()


if __name__ == "__main__":
    main()
