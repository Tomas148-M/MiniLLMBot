const axios = require('axios');

function getMessagesPayload(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'messages must be a non-empty array' };
  }

  const normalizedMessages = messages
    .map((message) => ({
      role: typeof message?.role === 'string' ? message.role : '',
      content: typeof message?.content === 'string' ? message.content : '',
    }))
    .filter((message) => message.role && message.content);

  if (normalizedMessages.length === 0) {
    return { error: 'messages must include role and content' };
  }

  const lastMessage = normalizedMessages[normalizedMessages.length - 1];

  if (lastMessage.role !== 'user') {
    return { error: 'last message role must be user' };
  }

  return { messages: normalizedMessages };
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
    const { messages, system } = req.body;
    const { messages: normalizedMessages, error } = getMessagesPayload(messages);

    if (error) {
      return sendValidationError(res, error);
    }

    const response = await axios.post(`${getAiServiceUrl()}/chat`, {
      messages: normalizedMessages,
      system,
    });
    return res.json(response.data);
  } catch (requestError) {
    console.error('Error in /api/chat:', requestError.message, requestError.response?.data);
    return res.status(500).json({ error: requestError.message });
  }
}

async function chatStream(req, res) {
  try {
    const { messages, system } = req.body;
    const { messages: normalizedMessages, error } = getMessagesPayload(messages);

    if (error) {
      return sendValidationError(res, error);
    }

    const aiStreamResponse = await axios.post(
      `${getAiServiceUrl()}/chatstream`,
      {
        messages: normalizedMessages,
        system,
      },
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
