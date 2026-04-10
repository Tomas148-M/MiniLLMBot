#!/bin/sh
set -eu

MODEL_NAME="${OLLAMA_MODEL:-llama3.2:latest}"

echo "Waiting for Ollama API to become ready..."
until ollama list >/dev/null 2>&1; do
  sleep 2
done

echo "Checking if model '$MODEL_NAME' is available..."
if ollama list | awk 'NR>1 {print $1}' | grep -Fxq "$MODEL_NAME"; then
  echo "Model '$MODEL_NAME' already exists. Skipping pull."
else
  echo "Model '$MODEL_NAME' not found. Pulling now..."
  ollama pull "$MODEL_NAME"
fi
