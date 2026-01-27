import MessageBubble from './MessageBubble';

export default function ChatMessages({ messages, isLoading, messagesEndRef }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
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
            <MessageBubble key={idx} message={msg} />
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
                <div className="dot" />
                <div className="dot delay1" />
                <div className="dot delay2" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
