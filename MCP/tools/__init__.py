"""Tool registration helpers for MCP servers."""

from .greeting_tools import register_greeting_tools
from .math_tools import register_math_tools
from .mcp_wheather import register_weather_tools
from .time_tool import register_time_tools


__all__ = [
    "register_math_tools",
    "register_greeting_tools",
    "register_weather_tools",
    "register_time_tools",
]
