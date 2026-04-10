"""Backward-compatible script entrypoint for the utility MCP server."""

try:
    # Works when run as a module: python -m MCP.tools.mcp_server
    from ..servers.utility_server import main
except ImportError:
    # Works when run as a script: python MCP/tools/mcp_server.py
    from servers.utility_server import main


if __name__ == "__main__":
    main()
