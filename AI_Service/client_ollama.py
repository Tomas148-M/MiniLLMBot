import asyncio
import json
import logging
from typing import Any, AsyncIterator, Self, TypeAlias

import ollama
from fastmcp import Client as MCPClient

from .config import AppConfig, settings

logger = logging.getLogger(__name__)

JsonDict: TypeAlias = dict[str, Any]
Message: TypeAlias = dict[str, Any]
ToolSpec: TypeAlias = dict[str, Any]

MCP_GROUNDING_PROMPT = (
    "When MCP tool results are present in the conversation, treat those results as the "
    "authoritative source of truth for the answer. Answer directly from the MCP data. "
    "Do not add boilerplate such as not having access to real-time data, suggesting the "
    "user verify the answer on the web, or disclaiming freshness when the MCP data "
    "answers the question."
)


class OllamaMCPClient:
    """Class-based Ollama + MCP orchestration client."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.ollama_model = config.ollama.model
        self.ollama_host = config.ollama.host
        self.mcp_server_url = config.mcp.server_url
        self.ollama_client = ollama.Client(host=self.ollama_host)
        self.model_name: str = self.ollama_model
        self.tools: list[ToolSpec] = []

    @classmethod
    def from_env(cls: type[Self]) -> Self:
        return cls(config=settings)

    @classmethod
    async def from_env_initialized(cls: type[Self]) -> Self:
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

            for candidate in self.config.ollama.project_model_candidates:
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

    async def load_mcp_tools(self) -> list[ToolSpec]:
        """Connect to MCP and convert server tools to Ollama function-tool schema."""
        last_error: Exception | None = None
        attempts = self.config.mcp.connect_attempts
        delay_seconds = self.config.mcp.retry_delay_seconds

        for attempt in range(1, attempts + 1):
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
                last_error = e
                logger.warning(
                    "MCP connection attempt %s/%s failed: %s",
                    attempt,
                    attempts,
                    e,
                )
                if attempt < attempts:
                    await asyncio.sleep(delay_seconds)

        logger.error("ERROR connecting to MCP server after %s attempts", attempts)
        logger.error("Make sure the server is running and reachable at %s", self.mcp_server_url)
        raise RuntimeError(f"MCP connection failed: {last_error}") from last_error

    async def execute_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        """Execute a named MCP tool and return its result payload."""
        try:
            async with MCPClient(self.mcp_server_url) as mcp:
                result = await mcp.call_tool(tool_name, arguments)
                # FastMCP returns CallToolResult wrappers; unwrap for cleaner LLM context.
                if hasattr(result, "data"):
                    return result.data
                if hasattr(result, "structured_content"):
                    return result.structured_content
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

    @staticmethod
    def _to_dict(payload: Any) -> JsonDict:
        """Normalize Ollama SDK responses into plain dictionaries."""
        if isinstance(payload, dict):
            return payload

        if hasattr(payload, "model_dump"):
            dumped = payload.model_dump()
            if isinstance(dumped, dict):
                return dumped

        if hasattr(payload, "dict"):
            dumped = payload.dict()
            if isinstance(dumped, dict):
                return dumped

        if hasattr(payload, "__dict__"):
            return dict(payload.__dict__)

        return {"response": str(payload)}

    def _chat_to_dict(self, *, messages: list[Message], stream: bool, tools: bool = False) -> JsonDict:
        """Wrapper around Ollama chat that always returns a dictionary payload."""
        kwargs: JsonDict = {
            "model": self.model_name,
            "messages": messages,
            "stream": stream,
        }
        if tools:
            kwargs["tools"] = self.tools
        return self._to_dict(self.ollama_client.chat(**kwargs))

    @staticmethod
    def _with_mcp_grounding_prompt(messages: list[Message]) -> list[Message]:
        """Add internal instructions for answers grounded by MCP tool results."""
        if messages and messages[0].get("role") == "system":
            return [
                {
                    **messages[0],
                    "content": f"{messages[0].get('content', '')}\n\n{MCP_GROUNDING_PROMPT}",
                },
                *messages[1:],
            ]

        return [{"role": "system", "content": MCP_GROUNDING_PROMPT}, *messages]

    @staticmethod
    def _parse_tool_args(args: Any) -> JsonDict:
        """Normalize tool arguments into a dictionary."""
        if isinstance(args, str):
            return json.loads(args)
        return args if isinstance(args, dict) else {}

    @staticmethod
    def _tool_content(tool_result: Any) -> str:
        """Serialize tool result into content accepted by Ollama chat."""
        return json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)

    async def _apply_tool_calls(
        self,
        *,
        conversation: list[Message],
        tool_calls: list[ToolSpec],
        stream_logs: bool = False,
    ) -> list[Message]:
        """Execute tool calls and append each tool response to the conversation."""
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            args = self._parse_tool_args(tool_call["function"]["arguments"])

            if stream_logs:
                logger.info("Stream tool requested: %s", tool_name)
                logger.info("Stream tool args: %s", args)
            else:
                logger.info("Tool requested: %s", tool_name)
                logger.info("Arguments: %s", args)

            tool_result = await self.execute_tool(tool_name, args)
            if not stream_logs:
                logger.info("Tool result: %s", tool_result)

            conversation.append(
                {
                    "role": "tool",
                    "content": self._tool_content(tool_result),
                }
            )
        return conversation

    async def run_chat(self, messages: list[Message], stream: bool = False) -> JsonDict:
        """Run a chat completion using preloaded model/tools and return final output."""
        if not messages:
            messages = [{"role": "user", "content": self.config.ollama.default_user_prompt}]

        logger.info("Incoming message count: %s", len(messages))

        tools_enabled = True
        try:
            response = self._chat_to_dict(messages=messages, tools=True, stream=stream)
        except Exception as e:
            if self.config.ollama.tools_unsupported_error_marker in str(e):
                tools_enabled = False
                logger.warning("Model does not support Ollama tools; retrying without tools.")
                response = self._chat_to_dict(messages=messages, stream=stream)
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
        conversation = await self._apply_tool_calls(
            conversation=conversation,
            tool_calls=response["message"]["tool_calls"],
        )
        conversation = self._with_mcp_grounding_prompt(conversation)
        final = self._chat_to_dict(messages=conversation, stream=False)
        return final

    async def stream_chat(self, messages: list[Message]) -> AsyncIterator[JsonDict]:
        """Yield chat chunks as plain dictionaries for NDJSON/SSE streaming."""
        if not messages:
            messages = [{"role": "user", "content": self.config.ollama.default_user_prompt}]

        # First pass decides whether tools are required.
        initial = self._chat_to_dict(messages=messages, tools=True, stream=False)

        tool_calls = initial.get("message", {}).get("tool_calls") or []
        if not tool_calls:
            stream_iter = self.ollama_client.chat(
                model=self.model_name,
                messages=messages,
                stream=True,
            )
            for chunk in stream_iter:
                yield self._to_dict(chunk)
            return

        conversation = [*messages, initial["message"]]
        conversation = await self._apply_tool_calls(
            conversation=conversation,
            tool_calls=tool_calls,
            stream_logs=True,
        )
        conversation = self._with_mcp_grounding_prompt(conversation)

        stream_iter = self.ollama_client.chat(
            model=self.model_name,
            messages=conversation,
            stream=True,
        )
        for chunk in stream_iter:
            yield self._to_dict(chunk)

    async def ask(self, prompt: str, stream: bool = False) -> JsonDict:
        """Send a single user prompt and return the chat result payload."""
        print(f"Ask called with prompt: {prompt}")
        print(f"Stream mode: {stream}")
        return await self.run_chat([{"role": "user", "content": prompt}], stream=stream)

    async def chat_messages(self, messages: list[Message], stream: bool = False) -> JsonDict:
        """Send a full chat history and return the chat result payload."""
        print(f"Chat called with {len(messages)} messages")
        return await self.run_chat(messages, stream=stream)

    async def chat(self, prompt: str, stream: bool = False) -> JsonDict:
        """Compatibility wrapper for API handlers expecting a `chat(prompt)` method."""
        print(f"Chat called with prompt: {prompt}")
        return await self.ask(prompt, stream=stream)
