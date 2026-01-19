import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';

export default function AIPromptChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    setInput('');
    setIsLoading(true);

    // Add empty assistant message (will be filled token-by-token)
    let assistantIndex;
    setMessages(prev => {
        assistantIndex = prev.length + 1;
        return [...prev, { role: 'assistant', content: '' }];
    });

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

        // Ollama sends NDJSON (one JSON per line)
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

            if (data.done) {
            setIsLoading(false);
            }
        }
        }
        } catch (err) {
            console.error('Streaming error:', err);
            setMessages(prev => [
            ...prev,
            { role: 'assistant', content: '❌ Streaming failed.' }
            ]);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    {/* Input */}
    <div style={{ 
        borderTop: '1px solid #333', 
        backgroundColor: '#1e1e1e', 
        padding: '24px'
    }}>
        <div style={{ display: 'flex', gap: '12px' }}>
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
            flex: 1,
            padding: '14px 16px',
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #3a3a3a',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none'
            }}
        />
        <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
            padding: '14px 24px',
            backgroundColor: !input.trim() || isLoading ? '#3a3a3a' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
            if (!(!input.trim() || isLoading)) {
                e.target.style.backgroundColor = '#1565c0';
            }
            }}
            onMouseOut={(e) => {
            if (!(!input.trim() || isLoading)) {
                e.target.style.backgroundColor = '#1976d2';
            }
            }}
        >
            <Send size={18} />
        </button>
        </div>
    );
}