from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .client_ollama import OllamaMCPClient


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
    print("Starting up Ollama client...")
    app.state.ollama_client = await OllamaMCPClient.from_env_initialized()


@app.post("/chat")
async def chat(data: ChatRequest) -> dict[str, Any]:
    print(f"Received chat request with prompt: {data.prompt}")
    client: OllamaMCPClient | None = getattr(app.state, "ollama_client", None)
    if client is None:
        raise HTTPException(status_code=503, detail="Ollama client is not initialized")

    response = await client.chat(data.prompt)
    return normalize_response(response)
