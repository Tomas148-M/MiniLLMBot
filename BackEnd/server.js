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
    console.log('Backend received messages:', messages);

    //const ollamaUrl = process.env.OLLAMA_URL || 'localhost:11434';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';

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

// Proxy to Ollama
app.get('/api/chat2', async (req, res) => {
  try {
    res.json({message: "Hello World!"});
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});