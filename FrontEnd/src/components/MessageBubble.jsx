export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '70%',
        padding: 16,
        borderRadius: 12,
        backgroundColor: isUser ? '#1976d2' : '#2a2a2a',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.5' }}>
            {message.content}
        </p>
      </div>
    </div>
  );
}
