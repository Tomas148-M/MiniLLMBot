FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir fastapi uvicorn ollama fastmcp requests pydantic

COPY . /app/AI_Service

WORKDIR /app

EXPOSE 8000

CMD ["uvicorn", "AI_Service.ai_service:app", "--host", "0.0.0.0", "--port", "8000"]
