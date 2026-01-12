cat > /tmp/Modelfile <<EOF
FROM /root/.ollama/models/qwen2.5-3b-instruct-q4_k_m.gguf
TEMPLATE "[INST] {{ .Prompt }} [/INST]"
PARAMETER stop "[INST]"
PARAMETER stop "[/INST]"
EOF

ollama create qwen2-model -f /tmp/Modelfile || true
