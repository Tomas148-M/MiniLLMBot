import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class OllamaConfig:
    model: str
    host: str
    project_model_candidates: list[str]
    default_user_prompt: str
    tools_unsupported_error_marker: str


@dataclass(frozen=True)
class MCPConfig:
    server_url: str
    connect_attempts: int
    retry_delay_seconds: int


@dataclass(frozen=True)
class APIConfig:
    chat_path: str
    chat_stream_path: str
    stream_media_type: str
    startup_message: str
    client_not_initialized_detail: str
    json_ensure_ascii: bool


@dataclass(frozen=True)
class AppConfig:
    ollama: OllamaConfig
    mcp: MCPConfig
    api: APIConfig


def _read_json_config() -> dict[str, Any]:
    configured_path = os.getenv("AI_SERVICE_CONFIG_FILE")
    config_path = Path(configured_path) if configured_path else Path(__file__).with_name("app_config.json")
    with config_path.open("r", encoding="utf-8") as file:
        loaded = json.load(file)
    return loaded if isinstance(loaded, dict) else {}


def _read_str(raw: dict[str, Any], key: str, fallback: str) -> str:
    value = raw.get(key, fallback)
    return value if isinstance(value, str) else fallback


def _read_int(raw: dict[str, Any], key: str, fallback: int) -> int:
    value = raw.get(key, fallback)
    return int(value) if isinstance(value, int) else fallback


def _read_bool(raw: dict[str, Any], key: str, fallback: bool) -> bool:
    value = raw.get(key, fallback)
    return value if isinstance(value, bool) else fallback


def _read_str_list(raw: dict[str, Any], key: str, fallback: list[str]) -> list[str]:
    value = raw.get(key, fallback)
    if not isinstance(value, list):
        return fallback
    parsed = [item for item in value if isinstance(item, str) and item]
    return parsed if parsed else fallback


def load_settings() -> AppConfig:
    raw = _read_json_config()
    ollama_raw = raw.get("ollama", {}) if isinstance(raw.get("ollama"), dict) else {}
    mcp_raw = raw.get("mcp", {}) if isinstance(raw.get("mcp"), dict) else {}
    api_raw = raw.get("api", {}) if isinstance(raw.get("api"), dict) else {}

    ollama = OllamaConfig(
        model=os.getenv("OLLAMA_MODEL", _read_str(ollama_raw, "model", "llama3.2:latest")),
        host=os.getenv("OLLAMA_HOST", _read_str(ollama_raw, "host", "http://127.0.0.1:11435")),
        project_model_candidates=_read_str_list(
            ollama_raw,
            "project_model_candidates",
            ["llama3.2-3b-local:latest", "llama3.2-3b-local"],
        ),
        default_user_prompt=_read_str(ollama_raw, "default_user_prompt", "time is?"),
        tools_unsupported_error_marker=_read_str(
            ollama_raw,
            "tools_unsupported_error_marker",
            "does not support tools",
        ),
    )
    mcp = MCPConfig(
        server_url=os.getenv("MCP_SERVER_URL", _read_str(mcp_raw, "server_url", "http://127.0.0.1:8080/sse")),
        connect_attempts=_read_int(mcp_raw, "connect_attempts", 10),
        retry_delay_seconds=_read_int(mcp_raw, "retry_delay_seconds", 2),
    )
    api = APIConfig(
        chat_path=_read_str(api_raw, "chat_path", "/chat"),
        chat_stream_path=_read_str(api_raw, "chat_stream_path", "/chatstream"),
        stream_media_type=_read_str(api_raw, "stream_media_type", "application/x-ndjson"),
        startup_message=_read_str(api_raw, "startup_message", "Starting up Ollama client..."),
        client_not_initialized_detail=_read_str(
            api_raw,
            "client_not_initialized_detail",
            "Ollama client is not initialized",
        ),
        json_ensure_ascii=_read_bool(api_raw, "json_ensure_ascii", False),
    )
    return AppConfig(ollama=ollama, mcp=mcp, api=api)


settings = load_settings()
