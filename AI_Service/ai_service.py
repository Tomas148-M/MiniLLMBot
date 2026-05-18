import json
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from .client_ollama import OllamaMCPClient
from .config import settings


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    prompt: str | None = None
    messages: list[ChatMessage] | None = None
    system: str | None = None


app = FastAPI()

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
        messages = [
            {"role": message.role, "content": message.content}
            for message in data.messages
            if message.content
        ]

    if data.system:
        messages = [
            {"role": "system", "content": data.system},
            *[message for message in messages if message["role"] != "system"],
        ]

    if not messages and data.prompt:
        messages = [{"role": "user", "content": data.prompt}]

    if not messages:
        raise HTTPException(status_code=400, detail="prompt or messages must be provided")

    return messages


@app.on_event("startup")
async def startup_event() -> None:
    print(settings.api.startup_message)
    app.state.ollama_client = await OllamaMCPClient.from_env_initialized()


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
    print(f"Received chat request with {len(messages)} messages")
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    response = await client.chat_messages(messages, stream=False)
    return normalize_response(response)


@app.post(settings.api.chat_stream_path)
async def chatstream(data: ChatRequest) -> StreamingResponse:
    messages = build_messages(data)
    print(f"Received stream chat request with {len(messages)} messages")
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    async def event_stream():
        async for chunk in client.stream_chat(messages):
            yield json_dumps(chunk) + "\n"

    return StreamingResponse(event_stream(), media_type=settings.api.stream_media_type)


def json_dumps(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=settings.api.json_ensure_ascii)
