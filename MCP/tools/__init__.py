"""Tool registration helpers for MCP servers."""

from MCP.tools.greeting_tools import register_greeting_tools
from MCP.tools.math_tools import register_math_tools
from MCP.tools.text_tools import register_text_tools
from MCP.tools.time_tool import register_time_tools


__all__ = [
    "register_math_tools",
    "register_greeting_tools",
    "register_text_tools",
    "register_time_tools",
]
