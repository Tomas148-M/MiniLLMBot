FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir fastmcp requests

COPY . /app/MCP

WORKDIR /app

EXPOSE 8080

CMD ["python", "-m", "MCP.main"]
