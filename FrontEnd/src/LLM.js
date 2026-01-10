import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';

export default function AIPromptChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant. Be concise, friendly, and accurate.');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2-model',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      
      if (data.content && data.content[0]) {
        const assistantMessage = {
          role: 'assistant',
          content: data.content[0].text
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('Error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error: Failed to get response.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '320px', 
        backgroundColor: '#1e1e1e', 
        borderRight: '1px solid #333',
        padding: '24px',
        overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
          System Prompt
        </h2>
        
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter your system prompt..."
          style={{
            width: '100%',
            height: '256px',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #3a3a3a',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'monospace',
            resize: 'none',
            outline: 'none'
          }}
        />

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px', color: '#bbb' }}>
            Templates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setSystemPrompt('You are a helpful AI assistant. Be concise, friendly, and accurate.')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#2a2a2a',
                color: '#ddd',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#3a3a3a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2a2a2a'}
            >
              Default
            </button>
            <button
              onClick={() => setSystemPrompt('You are a creative writing assistant. Help craft engaging stories and content.')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#2a2a2a',
                color: '#ddd',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#3a3a3a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2a2a2a'}
            >
              Creative Writer
            </button>
            <button
              onClick={() => setSystemPrompt('You are a coding expert. Provide clear code examples and explanations.')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#2a2a2a',
                color: '#ddd',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#3a3a3a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2a2a2a'}
            >
              Code Expert
            </button>
          </div>
        </div>

        <button
          onClick={() => setMessages([])}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '12px',
            backgroundColor: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#b71c1c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#d32f2f'}
        >
          <Trash2 size={16} />
          Clear Chat
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: '#666'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>No messages yet</p>
                <p style={{ fontSize: '14px' }}>Start a conversation</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: msg.role === 'user' ? '#1976d2' : '#2a2a2a',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.5' }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#666',
                    borderRadius: '50%',
                    animation: 'bounce 1s infinite'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#666',
                    borderRadius: '50%',
                    animation: 'bounce 1s infinite 0.15s'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#666',
                    borderRadius: '50%',
                    animation: 'bounce 1s infinite 0.3s'
                  }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}