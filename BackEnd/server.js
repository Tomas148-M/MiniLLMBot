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

// app.post('/api/chatstream', async (req, res) => {
//   try {
//     const { messages } = req.body;

//     const ollamaUrl = process.env.OLLAMA_URL || 'localhost:11434';

//     const ollamaResponse = await axios.post(
//       `${ollamaUrl}/api/chat`,
//       {
//         model: 'qwen2-model',
//         messages,
//         stream: true
//       },
//       {
//         responseType: 'stream'
//       }
//     );

//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');

//     ollamaResponse.data.on('data', (chunk) => {
//       res.write(chunk);
//     });

//     ollamaResponse.data.on('end', () => {
//       res.end();
//     });
//   } catch (error) {
//     console.error('Streaming error:', error.message);
//     res.status(500).end();
//   }
// });

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
