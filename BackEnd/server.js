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
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const lastMessage = messages[messages.length - 1];
    const prompt = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

    if (!prompt) {
      return res.status(400).json({ error: 'last message content must be a non-empty string' });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const response = await axios.post(`${aiServiceUrl}/chat`, { prompt });
    return res.json(response.data);
  } catch (error) {
    console.error('Error in /api/chat:', error.message, error.response?.data);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/chatstream', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const lastMessage = messages[messages.length - 1];
    const prompt = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
    if (!prompt) {
      return res.status(400).json({ error: 'last message content must be a non-empty string' });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const aiStreamResponse = await axios.post(
      `${aiServiceUrl}/chatstream`,
      { prompt },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    aiStreamResponse.data.on('data', (chunk) => {
      res.write(chunk);
    });

    aiStreamResponse.data.on('end', () => {
      res.end();
    });

    aiStreamResponse.data.on('error', (streamErr) => {
      console.error('Error in upstream stream:', streamErr.message);
      res.end();
    });
  } catch (error) {
    console.error('Error in /api/chatstream:', error.message, error.response?.data);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
