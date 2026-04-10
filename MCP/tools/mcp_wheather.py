import requests

"""Weather-related MCP tools."""


def get_weather(name: str = "Brno") -> str:
    """Get current weather (currently supports Brno)."""
    if (name or "Brno").strip().lower() != "brno":
        return "Unsupported city. Currently supported city: Brno."

    response = requests.get(
        "https://api.open-meteo.com/v1/forecast?latitude=49.3&longitude=16.7&current_weather=true",
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    current = data.get("current_weather", {})
    temp = current.get("temperature")
    wind = current.get("windspeed")
    code = current.get("weathercode")
    observed_at = current.get("time")
    return (
        f"Brno weather at {observed_at}: temperature {temp} C, "
        f"wind {wind} km/h, weather code {code}."
    )


def get_string(key: str = "") -> str:
    """Compatibility alias for weather queries. Use key='weather' or empty key."""
    normalized_key = (key or "weather").strip().lower()
    if normalized_key != "weather":
        return f"Unsupported key: {key}. Supported key: weather."
    return get_weather("Brno")


def register_weather_tools(mcp) -> None:
    """Register weather tools on a FastMCP instance."""
    mcp.tool()(get_weather)
