import { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import './App.css';

export default function LLM2() {
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
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatstream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          system: systemPrompt
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Streaming request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          const token = data?.message?.content || '';

          if (token) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content += token;
              return updated;
            });
          }

          if (data?.done) {
            setIsLoading(false);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          const token = data?.message?.content || '';
          if (token) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content += token;
              return updated;
            });
          }
        } catch (_err) {
          // Ignore trailing partial chunk.
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Request failed.';
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '98vh', background: '#121212', color: '#fff' }}>
      <div
        style={{
          width: '320px',
          backgroundColor: '#1e1e1e',
          borderRight: '1px solid #333',
          padding: '24px'
        }}
      >
        <Sidebar
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          clearChat={() => setMessages([])}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ChatMessages messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />

        <ChatInput input={input} setInput={setInput} isLoading={isLoading} onSend={handleSend} />
      </div>
    </div>
  );
}
