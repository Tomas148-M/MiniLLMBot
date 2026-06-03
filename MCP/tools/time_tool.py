"""Time-related MCP tools."""

import os
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_TIMEZONE = "Europe/Prague"


def _local_now() -> datetime:
    """Return current time in the configured local timezone."""
    timezone_name = os.getenv("TIMEZONE") or os.getenv("TZ") or DEFAULT_TIMEZONE
    for zone_name in (timezone_name, DEFAULT_TIMEZONE):
        try:
            return datetime.now(ZoneInfo(zone_name))
        except ZoneInfoNotFoundError:
            continue
    return datetime.now().astimezone()


def get_current_time() -> str:
    """
    Return the real current local date and time from the system clock.

    Use this tool whenever the user asks for the current time, today's date,
    what day it is, or a natural spoken answer about the present moment. This
    result is live and should be used instead of estimating from model memory.
    """
    now = _local_now()

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
    """
    Return the real current local time from the system clock in HH:MM AM/PM format.

    Use this tool for short answers to questions like "what time is it?" or
    "current time". This result is live and should be used instead of estimating
    from model memory.
    """
    return _local_now().strftime("%I:%M %p")


def register_time_tools(mcp) -> None:
    """Register time tools on a FastMCP instance."""
    mcp.tool()(get_current_time)
    mcp.tool()(get_time)
