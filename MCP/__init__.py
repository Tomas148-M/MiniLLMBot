"""MCP package entrypoints and server factory access."""

from MCP.servers.utility_server import create_utility_server

SERVER_BUILDERS = {
    "utility": create_utility_server,
}


def create_server(server_key: str = "utility"):
    """Create an MCP server instance by key."""
    try:
        builder = SERVER_BUILDERS[server_key]
    except KeyError as exc:
        available = ", ".join(sorted(SERVER_BUILDERS))
        raise ValueError(f"Unknown server '{server_key}'. Available: {available}") from exc
    return builder()


__all__ = ["create_server", "SERVER_BUILDERS"]
