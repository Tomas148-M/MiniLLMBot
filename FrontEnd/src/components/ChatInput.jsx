import { Send } from 'lucide-react';

export default function ChatInput({ input, setInput, isLoading, onSend }) {
  return (
    <div style={{ 
          borderTop: '1px solid #333', 
          backgroundColor: '#1e1e1e', 
          padding: '24px'}}>
    <div style={{ display: 'flex', gap: '12px' }}>
        <input  type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
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
            onClick={onSend}
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
            }}>
            <Send size={18} />
       </button>
      </div>
    </div>
  );
}