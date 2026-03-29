import asyncio
import argparse
import json
import logging
import os
import sys
from typing import Any

import ollama
from fastmcp import Client as MCPClient

logger = logging.getLogger(__name__)


class OllamaMCPClient:
    """Class-based Ollama + MCP orchestration client."""

    def __init__(self, ollama_model: str, ollama_host: str, mcp_server_url: str) -> None:
        self.ollama_model = ollama_model
        self.ollama_host = ollama_host
        self.mcp_server_url = mcp_server_url
        self.ollama_client = ollama.Client(host=ollama_host)
        self.model_name: str = ollama_model
        self.tools: list[dict[str, Any]] = []

    @classmethod
    def from_env(cls) -> "OllamaMCPClient":
        return cls(
            ollama_model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            ollama_host=os.getenv("OLLAMA_HOST", "http://127.0.0.1:11435"),
            mcp_server_url=os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8080/sse"),
        )

    @classmethod
    async def from_env_initialized(cls) -> "OllamaMCPClient":
        """Create and initialize a ready-to-use client in one line."""
        client = cls.from_env()
        await client.initialize_runtime()
        return client

    def resolve_model_name(self, preferred_model: str) -> str:
        """Resolve model name against local Ollama tags (with/without :latest)."""
        try:
            models = self.ollama_client.list().get("models", [])
            available_ordered = [m.get("name", "") for m in models if m.get("name")]
            available = {m.get("name", "") for m in models}

            if preferred_model in available:
                return preferred_model

            if preferred_model.endswith(":latest"):
                base = preferred_model.rsplit(":", 1)[0]
                if base in available:
                    return base
            else:
                latest = f"{preferred_model}:latest"
                if latest in available:
                    return latest

            # Common local aliases used in this project.
            project_candidates = [
                "llama3.2-3b-local:latest",
                "llama3.2-3b-local",
            ]
            for candidate in project_candidates:
                if candidate in available:
                    return candidate

            # Final fallback: use the first available model if any.
            for name in available_ordered:
                if name:
                    return name

            return preferred_model
        except Exception:
            return preferred_model

    def list_models_for_debug(self) -> list[str]:
        """Return available local Ollama model names for logging/debug output."""
        try:
            models = self.ollama_client.list().get("models", [])
            return [m.get("name", "") for m in models if m.get("name")]
        except Exception:
            return []

    async def load_mcp_tools(self) -> list[dict[str, Any]]:
        """Connect to MCP and convert server tools to Ollama function-tool schema."""
        try:
            async with MCPClient(self.mcp_server_url) as mcp:
                tools_list = await mcp.list_tools()
                ollama_tools = []
                for tool in tools_list:
                    ollama_tools.append(
                        {
                            "type": "function",
                            "function": {
                                "name": tool.name,
                                "description": tool.description,
                                "parameters": tool.inputSchema,
                            },
                        }
                    )
                return ollama_tools
        except Exception as e:
            logger.error("ERROR connecting to MCP server: %s", e)
            logger.error("Make sure the server is running: python mcp_server.py")
            sys.exit(1)

    async def execute_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        """Execute a named MCP tool and return its result payload."""
        try:
            async with MCPClient(self.mcp_server_url) as mcp:
                result = await mcp.call_tool(tool_name, arguments)
                return result
        except Exception as e:
            logger.error("ERROR executing tool %s: %s", tool_name, e)
            return {"error": str(e)}

    async def initialize_runtime(self) -> None:
        """Initialize model selection and MCP tools once for long-running usage."""
        available_models = self.list_models_for_debug()
        logger.info("Ollama host: %s", self.ollama_host)
        if available_models:
            logger.info("Available models:")
            for model in available_models:
                logger.info("  - %s", model)
        else:
            logger.info("Available models: (none returned)")

        self.model_name = self.resolve_model_name(self.ollama_model)
        logger.info("Using model: %s", self.model_name)
        if available_models and self.model_name not in available_models:
            logger.warning("Preferred model not found; falling back to discovered model.")

        logger.info("Loading MCP tools...")
        self.tools = await self.load_mcp_tools()
        logger.info("Loaded %s tools", len(self.tools))

    async def run_chat(self, messages: list[dict[str, Any]]) -> dict[str, Any]:
        """Run a chat completion using preloaded model/tools and return final output."""
        if not messages:
            messages = [{"role": "user", "content": "time is?"}]

        logger.info("Incoming message count: %s", len(messages))

        tools_enabled = True
        try:
            response = self.ollama_client.chat(
                model=self.model_name,
                messages=messages,
                tools=self.tools,
                stream=False,
            )
        except Exception as e:
            if "does not support tools" in str(e):
                tools_enabled = False
                logger.warning("Model does not support Ollama tools; retrying without tools.")
                response = self.ollama_client.chat(
                    model=self.model_name,
                    messages=messages,
                    stream=False,
                )
            else:
                logger.error("ERROR calling Ollama: %s", e)
                logger.error("Make sure:")
                logger.error("  1. Ollama is running at %s", self.ollama_host)
                logger.error("  2. Model exists: %s", self.model_name)
                available_models = self.list_models_for_debug()
                if available_models:
                    logger.error("  3. Try one of these models:")
                    for model in available_models:
                        logger.error("     - %s", model)
                raise RuntimeError(str(e)) from e

        if not tools_enabled or not response.get("message", {}).get("tool_calls"):
            return response

        conversation = [*messages, response["message"]]

        for tool_call in response["message"]["tool_calls"]:
            tool_name = tool_call["function"]["name"]
            args = tool_call["function"]["arguments"]

            if isinstance(args, str):
                args = json.loads(args)

            logger.info("Tool requested: %s", tool_name)
            logger.info("Arguments: %s", args)

            tool_result = await self.execute_tool(tool_name, args)
            logger.info("Tool result: %s", tool_result)

            conversation.append(
                {
                    "role": "tool",
                    "content": json.dumps(tool_result)
                    if isinstance(tool_result, dict)
                    else str(tool_result),
                }
            )

        final = self.ollama_client.chat(model=self.model_name, messages=conversation)
        return final

    async def ask(self, prompt: str) -> dict[str, Any]:
        """Send a single user prompt and return the chat result payload."""
        return await self.run_chat([{"role": "user", "content": prompt}])

    async def stdin_loop(self) -> None:
        """Wait for stdin questions and answer each one without re-initializing tools."""
        logger.info("Waiting for questions on stdin. Type 'exit' to stop.")
        while True:
            line = await asyncio.to_thread(sys.stdin.readline)
            if not line:
                logger.info("Stdin closed. Exiting.")
                return

            question = line.strip()
            if not question:
                continue
            if question.lower() in {"exit", "quit"}:
                logger.info("Exit command received. Stopping.")
                return

            result = await self.ask(question)
            print(json.dumps(result), flush=True)


def parse_args() -> argparse.Namespace:
    """Build and parse command-line arguments for this client."""
    parser = argparse.ArgumentParser(description="Run Ollama client with optional MCP tools.")
    parser.add_argument(
        "--prompt",
        type=str,
        default=None,
        help="Single user prompt to send to Ollama.",
    )
    parser.add_argument(
        "--messages",
        type=str,
        default=None,
        help='JSON array of chat messages, e.g. \'[{"role":"user","content":"Hello"}]\'',
    )
    return parser.parse_args()


def parse_messages_arg(messages_arg: str) -> list[dict[str, Any]]:
    """Parse and validate JSON `--messages` payload."""
    payload = json.loads(messages_arg)
    if not isinstance(payload, list):
        raise ValueError("--messages must be a JSON list")
    return payload


async def main() -> None:
    """Parse CLI arguments, execute chat flow, and print machine-readable JSON output."""
    args = parse_args()
    client = await OllamaMCPClient.from_env_initialized()

    if args.prompt is not None:
        try:
            result = await client.ask(args.prompt)
            print(json.dumps(result))
            return
        except Exception as e:
            logger.error("Unhandled error: %s", e)
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

    if args.messages is not None:
        try:
            messages = parse_messages_arg(args.messages)
        except Exception as e:
            print(json.dumps({"error": f"Invalid --messages payload: {e}"}))
            sys.exit(2)

        try:
            result = await client.run_chat(messages)
            print(json.dumps(result))
            return
        except Exception as e:
            logger.error("Unhandled error: %s", e)
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

    try:
        await client.stdin_loop()
    except Exception as e:
        logger.error("Unhandled error in stdin loop: %s", e)
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    asyncio.run(main())
