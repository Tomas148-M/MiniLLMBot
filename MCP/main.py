
"""Main MCP entrypoint that imports and registers all tool groups."""

from fastmcp import FastMCP

try:
    # Works when run as module: python -m MCP.main
    from .tools.time_tool import register_time_tools
    from .tools.greeting_tools import register_greeting_tools
    from .tools.math_tools import register_math_tools
    from .tools.text_tools import register_text_tools
    
except ImportError:
    # Works when run as script: python MCP/main.py
    from tools.greeting_tools import register_greeting_tools
    from tools.math_tools import register_math_tools
    from tools.text_tools import register_text_tools
    from tools.time_tool import register_time_tools

def create_main_server(name: str = "Main MCP Server") -> FastMCP:
    """Create a server with all currently available tool groups."""
    mcp = FastMCP(name)

    register_math_tools(mcp)
    register_greeting_tools(mcp)
    register_time_tools(mcp)
    register_text_tools(mcp)

    return mcp


def main() -> None:
    """Run the main server over SSE."""
    create_main_server().run(transport="sse", port=8080)


if __name__ == "__main__":
    main()