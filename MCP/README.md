# MCP Folder Structure

This package is now organized to support many tools and many server configurations.

## Structure

- `MCP/servers/`: each file builds one MCP server
- `MCP/tools/`: tool modules grouped by domain

## Add a New Tool

1. Create a module in `MCP/tools/` (example: `weather_tools.py`).
2. Add plain functions and a `register_*_tools(mcp)` function.
3. Export the register function from `MCP/tools/__init__.py`.
4. Call the register function inside a server builder in `MCP/servers/*.py`.

## Add a New Server

1. Create file `MCP/servers/<server_name>.py`.
2. Build a `FastMCP` instance and register selected tool groups.
3. Add a Docker or script entrypoint if the server should run independently.

## Run

- Default utility server:
  - `python -m MCP.servers.utility_server`

- Backward compatible entrypoint:
  - `python MCP/tools/mcp_server.py`
