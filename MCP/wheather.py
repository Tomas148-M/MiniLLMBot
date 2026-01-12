import FastMCP

mcp_weather = FastMCP("wheather")

@mcp.tool
def get_weather(location: str) -> str:
    """
    Get the current weather for a given location.
    """
    # Simulated weather data retrieval
    weather_data = {
        "New York": "Sunny, 25°C",
        "Los Angeles": "Cloudy, 22°C",
        "Chicago": "Rainy, 18°C",
    }
    return weather_data.get(location, "Weather data not available for this location.")

if __name__ == "__main__":
    mcp_weather.run()