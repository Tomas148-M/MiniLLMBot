"""Text-related MCP tools."""


def get_string() -> str:
    """Return a test string."""
    return "This is a test string from the MCP server."


def register_text_tools(mcp) -> None:
    """Register text tools on a FastMCP instance."""
    mcp.tool()(get_string)
