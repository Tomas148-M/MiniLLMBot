import { Trash2 } from 'lucide-react';

export default function Sidebar({ systemPrompt, setSystemPrompt, clearChat }) {
  return (
    <div>
      <h2 style={{ width: 320, backgroundColor: '#1e1e1e', padding: 24 }}>
        System Prompt
      </h2>

      <textarea
        value={systemPrompt}
        onChange={e => setSystemPrompt(e.target.value)}
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
          <button onClick={() =>
            setSystemPrompt('You are a helpful AI assistant. Be concise, friendly, and accurate.')} 
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
          <button onClick={() =>
            setSystemPrompt('You are a creative writing assistant.')
          } style={{
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

          <button onClick={() =>
            setSystemPrompt('You are a coding expert.')
          } style={{
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
        onClick={clearChat} 
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
          onMouseOut={(e) => e.target.style.backgroundColor = '#d32f2f'}>
        <Trash2 size={16} /> 
        Clear Chat
      </button>
    </div>
  );
}