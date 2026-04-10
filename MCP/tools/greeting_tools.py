"""Greeting-related MCP tools."""


def greet(name: str) -> str:
    """Greet someone by name."""
    return f"Hello, {name}! Welcome!"


def register_greeting_tools(mcp) -> None:
    """Register greeting tools on a FastMCP instance."""
    mcp.tool()(greet)
