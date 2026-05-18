const axios = require('axios');

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool']);
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CONTENT_CHARS = 8000;
const MAX_SYSTEM_PROMPT_CHARS = 4000;

function getMessagesPayload(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'messages must be a non-empty array' };
  }

  if (messages.length > MAX_MESSAGES) {
    return { error: `messages cannot exceed ${MAX_MESSAGES} items` };
  }

  const normalizedMessages = messages
    .map((message) => ({
      role: typeof message?.role === 'string' ? message.role : '',
      content: typeof message?.content === 'string' ? message.content.trim() : '',
    }))
    .filter((message) => message.content);

  if (normalizedMessages.length === 0) {
    return { error: 'messages must include role and content' };
  }

  const invalidRole = normalizedMessages.find((message) => !ALLOWED_ROLES.has(message.role));
  if (invalidRole) {
    return { error: `unsupported message role: ${invalidRole.role}` };
  }

  const oversizedMessage = normalizedMessages.find(
    (message) => message.content.length > MAX_MESSAGE_CONTENT_CHARS
  );
  if (oversizedMessage) {
    return { error: `message content cannot exceed ${MAX_MESSAGE_CONTENT_CHARS} characters` };
  }

  const lastMessage = normalizedMessages[normalizedMessages.length - 1];

  if (lastMessage.role !== 'user') {
    return { error: 'last message role must be user' };
  }

  return { messages: normalizedMessages };
}

function getSystemPromptPayload(system) {
  if (system === undefined || system === null || system === '') {
    return {};
  }

  if (typeof system !== 'string') {
    return { error: 'system must be a string' };
  }

  const normalizedSystem = system.trim();
  if (!normalizedSystem) {
    return {};
  }

  if (normalizedSystem.length > MAX_SYSTEM_PROMPT_CHARS) {
    return { error: `system cannot exceed ${MAX_SYSTEM_PROMPT_CHARS} characters` };
  }

  return { system: normalizedSystem };
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

async function readyCheck(req, res) {
  try {
    const response = await axios.get(`${getAiServiceUrl()}/ready`, { timeout: 3000 });
    return res.json({
      status: 'ready',
      service: 'backend',
      aiService: response.data,
    });
  } catch (requestError) {
    console.error('Error in /api/ready:', requestError.message, requestError.response?.data);
    return res.status(503).json({
      status: 'not_ready',
      service: 'backend',
      error: requestError.message,
    });
  }
}

async function chat(req, res) {
  try {
    const { messages, system } = req.body;
    const { messages: normalizedMessages, error } = getMessagesPayload(messages);
    const { system: normalizedSystem, error: systemError } = getSystemPromptPayload(system);

    if (error) {
      return sendValidationError(res, error);
    }

    if (systemError) {
      return sendValidationError(res, systemError);
    }

    const response = await axios.post(`${getAiServiceUrl()}/chat`, {
      messages: normalizedMessages,
      system: normalizedSystem,
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
    const { system: normalizedSystem, error: systemError } = getSystemPromptPayload(system);

    if (error) {
      return sendValidationError(res, error);
    }

    if (systemError) {
      return sendValidationError(res, systemError);
    }

    const aiStreamResponse = await axios.post(
      `${getAiServiceUrl()}/chatstream`,
      {
        messages: normalizedMessages,
        system: normalizedSystem,
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
  readyCheck,
  chat,
  chatStream,
};
