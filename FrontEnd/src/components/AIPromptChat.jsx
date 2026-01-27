import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

export default function AIPromptChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful AI assistant. Be concise, friendly, and accurate.'
  );
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chatstream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2-model',
          messages: [...messages, userMessage],
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);

          if (data.message?.content) {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content += data.message.content;
              return updated;
            });
          }

          if (data.done) setIsLoading(false);
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Streaming failed.' }
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', backgroundColor: '#121212', color: '#fff' }}>
      <Sidebar
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        clearChat={() => setMessages([])}
      />

      <div style={{ flex: 1, height: '100vh',display: 'flex', flexDirection: 'column' }}>
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
