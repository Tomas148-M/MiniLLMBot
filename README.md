# MiniLLMBot

Architecture diagram and quick start.

## Architecture

![Architecture](docs/architecture.svg)

- `nginx` — reverse proxy exposing port 80 on host
- `frontend` — React app (served as static files)
- `backend` — Node.js Express API (internal port 5000)
- `ollama` — local LLM runtime (internal port 11434)

## Quick Start

```bash
docker-compose up -d --build
```

Open `http://localhost` to access the React app.

## Notes

- Use `docker-compose logs -f <service>` to inspect logs
- `depends_on` controls container startup order but not readiness; use healthchecks if needed
