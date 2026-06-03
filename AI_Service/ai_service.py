import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from starlette.responses import StreamingResponse

from .client_ollama import OllamaMCPClient
from .config import settings

logger = logging.getLogger(__name__)

ChatRole = Literal["system", "user", "assistant", "tool"]
MAX_MESSAGES = 50
MAX_MESSAGE_CONTENT_CHARS = 8000
MAX_SYSTEM_PROMPT_CHARS = 4000


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: ChatRole
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CONTENT_CHARS)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str | None = Field(default=None, max_length=MAX_MESSAGE_CONTENT_CHARS)
    messages: list[ChatMessage] | None = None
    system: str | None = Field(default=None, max_length=MAX_SYSTEM_PROMPT_CHARS)
    use_rag: bool = False


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    logger.info(settings.api.startup_message)
    app_instance.state.ollama_client = await OllamaMCPClient.from_env_initialized()
    yield


app = FastAPI(lifespan=lifespan)

def normalize_response(payload: Any) -> dict[str, Any]:
    """Ensure FastAPI gets a plain dictionary response payload."""
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


def build_messages(data: ChatRequest) -> list[dict[str, str]]:
    """Build an Ollama-compatible message list from legacy prompt or chat history."""
    messages: list[dict[str, str]] = []

    if data.messages:
        if len(data.messages) > MAX_MESSAGES:
            raise HTTPException(status_code=400, detail=f"messages cannot exceed {MAX_MESSAGES} items")

        messages = [
            {"role": message.role, "content": message.content.strip()}
            for message in data.messages
            if message.content.strip()
        ]

    if data.system and data.system.strip():
        messages = [
            {"role": "system", "content": data.system.strip()},
            *[message for message in messages if message["role"] != "system"],
        ]

    if not messages and data.prompt and data.prompt.strip():
        messages = [{"role": "user", "content": data.prompt.strip()}]

    if not messages:
        raise HTTPException(status_code=400, detail="prompt or messages must be provided")

    non_system_messages = [message for message in messages if message["role"] != "system"]
    if not non_system_messages or non_system_messages[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="last non-system message role must be user")

    return messages


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@app.get("/ready")
async def ready() -> dict[str, Any]:
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    return {
        "status": "ready",
        "service": "ai-service",
        "model": client.model_name,
        "tools_loaded": len(client.tools),
    }


@app.post(settings.api.chat_path)
async def chat(data: ChatRequest) -> dict[str, Any]:
    messages = build_messages(data)
    logger.info("Received chat request with %s messages", len(messages))
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    response = await client.chat_messages(messages, stream=False)
    return normalize_response(response)


@app.post(settings.api.chat_stream_path)
async def chatstream(data: ChatRequest) -> StreamingResponse:
    messages = build_messages(data)
    logger.info("Received stream chat request with %s messages", len(messages))
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    async def event_stream():
        async for chunk in client.stream_chat(messages):
            yield json_dumps(chunk) + "\n"

    return StreamingResponse(event_stream(), media_type=settings.api.stream_media_type)


def json_dumps(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=settings.api.json_ensure_ascii)
