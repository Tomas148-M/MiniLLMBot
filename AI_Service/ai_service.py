import json
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from .client_ollama import OllamaMCPClient
from .config import settings


class ChatRequest(BaseModel):
    prompt: str


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


@app.on_event("startup")
async def startup_event() -> None:
    print(settings.api.startup_message)
    app.state.ollama_client = await OllamaMCPClient.from_env_initialized()


@app.post(settings.api.chat_path)
async def chat(data: ChatRequest) -> dict[str, Any]:
    print(f"Received chat request with prompt: {data.prompt}")
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    response = await client.chat(data.prompt, stream=False)
    return normalize_response(response)


@app.post(settings.api.chat_stream_path)
async def chatstream(data: ChatRequest) -> StreamingResponse:
    print(f"Received stream chat request with prompt: {data.prompt}")
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail=settings.api.client_not_initialized_detail)

    async def event_stream():
        async for chunk in client.stream_chat([{"role": "user", "content": data.prompt}]):
            yield json_dumps(chunk) + "\n"

    return StreamingResponse(event_stream(), media_type=settings.api.stream_media_type)


def json_dumps(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=settings.api.json_ensure_ascii)
