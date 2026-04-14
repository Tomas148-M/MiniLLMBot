const axios = require('axios');

function getPromptFromMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'messages must be a non-empty array' };
  }

  const lastMessage = messages[messages.length - 1];
  const prompt = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

  if (!prompt) {
    return { error: 'last message content must be a non-empty string' };
  }

  return { prompt };
}

function getAiServiceUrl() {
  return process.env.AI_SERVICE_URL || 'http://ai-service:8000';
}

function sendValidationError(res, error) {
  return res.status(400).json({ error });
}

async function healthCheck(req, res) {
  return res.json({ status: 'ok', service: 'backend running' });
}

async function chat(req, res) {
  try {
    const { messages } = req.body;
    const { prompt, error } = getPromptFromMessages(messages);

    if (error) {
      return sendValidationError(res, error);
    }

    const response = await axios.post(`${getAiServiceUrl()}/chat`, { prompt });
    return res.json(response.data);
  } catch (requestError) {
    console.error('Error in /api/chat:', requestError.message, requestError.response?.data);
    return res.status(500).json({ error: requestError.message });
  }
}

async function chatStream(req, res) {
  try {
    const { messages } = req.body;
    const { prompt, error } = getPromptFromMessages(messages);

    if (error) {
      return sendValidationError(res, error);
    }

    const aiStreamResponse = await axios.post(
      `${getAiServiceUrl()}/chatstream`,
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

    aiStreamResponse.data.on('error', (streamError) => {
      console.error('Error in upstream stream:', streamError.message);
      res.end();
    });
  } catch (requestError) {
    console.error(
      'Error in /api/chatstream:',
      requestError.message,
      requestError.response?.data
    );

    if (!res.headersSent) {
      return res.status(500).json({ error: requestError.message });
    }

    return res.end();
  }
}

module.exports = {
  healthCheck,
  chat,
  chatStream,
};
