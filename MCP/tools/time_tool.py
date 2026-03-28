"""Time-related MCP tools."""

from datetime import datetime


def get_current_time() -> str:
    """Get current time formatted for speech."""
    now = datetime.now()

    hour = now.hour % 12 or 12
    minute = now.strftime("%M")
    ampm = "AM" if now.hour < 12 else "PM"
    time_str = f"{hour}:{minute} {ampm}"

    day_name = now.strftime("%A")
    month_name = now.strftime("%B")
    day = now.day
    date_str = f"{day_name}, {month_name} {day}"

    return f"It's {time_str} on {date_str}."


def get_time() -> str:
    """Get the current local time in HH:MM AM/PM format."""
    return datetime.now().strftime("%I:%M %p")


def register_time_tools(mcp) -> None:
    """Register time tools on a FastMCP instance."""
    mcp.tool()(get_time)
    mcp.tool()(get_current_time)
