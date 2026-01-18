const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend running' });
});


app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body; // expect array from frontend
    console.log('🔥🔥🔥 BACKEND CODE VERSION 2026-01-18 🔥🔥🔥');
    console.log('Backend received messages:', messages);

    const ollamaUrl = process.env.OLLAMA_URL || 'localhost:11434';
    console.log('Backend Ollama URL: -> ', ollamaUrl);
    const response = await axios.post(`${ollamaUrl}/api/chat`, {
      model: 'qwen2-model',
      messages: messages,  // <- important
      stream: false
    });

    console.log('Ollama response:', response.data);

    res.json(response.data);  // send exact JSON to frontend
  } catch (error) {
    console.error('Error in /api/chat:', error.message, error.response?.data);
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/chatstream', async (req, res) => {
  try {
    const { messages } = req.body;

    const ollamaUrl = process.env.OLLAMA_URL || 'localhost:11434';

    const ollamaResponse = await axios.post(
      `${ollamaUrl}/api/chat`,
      {
        model: 'qwen2-model',
        messages,
        stream: true
      },
      {
        responseType: 'stream'
      }
    );

    // IMPORTANT HEADERS
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe Ollama stream → client
    ollamaResponse.data.on('data', chunk => {
      res.write(chunk);
    });

    ollamaResponse.data.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('Streaming error:', error.message);
    res.status(500).end();
  }
});


app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});