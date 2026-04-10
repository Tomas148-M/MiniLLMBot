"""Math-related MCP tools."""


def add(a: int, b: int) -> int:
    """Add two integers."""
    return a + b


def multiply(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b


def register_math_tools(mcp) -> None:
    """Register math tools on a FastMCP instance."""
    mcp.tool()(add)
    mcp.tool()(multiply)
