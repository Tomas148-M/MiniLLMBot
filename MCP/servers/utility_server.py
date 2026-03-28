"""Utility MCP server that aggregates common tools."""

from fastmcp import FastMCP

from ..tools import (
    register_greeting_tools,
    register_math_tools,
    register_text_tools,
    register_time_tools,
)


def create_utility_server(name: str = "Utility MCP Server") -> FastMCP:
    """Build and configure the default utility MCP server."""
    mcp = FastMCP(name)

    register_math_tools(mcp)
    register_greeting_tools(mcp)
    register_time_tools(mcp)
    register_text_tools(mcp)

    return mcp


def main() -> None:
    """Run utility server over SSE."""
    create_utility_server().run(transport="sse", port=8080)


if __name__ == "__main__":
    main()
