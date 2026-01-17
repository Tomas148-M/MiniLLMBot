# MiniLLMBot

This repository is my miniproject where I learn how to use LLM model to generate text similar to chatGPT. Practise to use docker and also another technologies and languages like React, NodeJs, NGNIX, Python, Redis.
This repository will be developing during I will add new things diagram is not full.  

Architecture diagram and quick start.

## Architecture

![Architecture](docs/SystemDiagram.svg)

- `nginx` — reverse proxy exposing port 80 on host
- `frontend` — React app (served as static files)
- `backend` — Node.js Express API (internal port 5000)
- `ollama` — local LLM runtime (internal port 11434)

## Quick Start

```bash
docker-compose up -d --build
```

Open `http://localhost` to access the React app.


## To Do (Ideas)
- Connect to Redis for casching and chat history
- Conect to PostgreSQL
- Connect to MCP server to get some Real Time Data
- UI switcher of multiple AI models


## Notes

- Use `docker-compose logs -f <service>` to inspect logs
- `depends_on` controls container startup order but not readiness; use healthchecks if needed
