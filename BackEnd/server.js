const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// Proxy to Ollama
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model: 'llama2',
      prompt: message,
      stream: false
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
