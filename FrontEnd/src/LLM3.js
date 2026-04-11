import { useState, useRef, useEffect } from "react";
import './LLM3.css';

export default function App() {
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful AI assistant. Be concise, friendly, and accurate.'
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const chatRef = useRef(null);
   const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { content: input, sender: "user" };
    const botMsg = { content: "", sender: "bot" };
    const outboundMessages = [...messages, userMsg].map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content || "",
    }));

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setIsLoading(true);
    setInput("");

    try {
      const response = await fetch('/api/chatstream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: outboundMessages,
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
              const last = updated[updated.length - 1];
              if (!last || last.sender !== "bot") {
                updated.push({ content: token, sender: "bot" });
              } else {
                last.content = (last.content || "") + token;
              }
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
              const last = updated[updated.length - 1];
              if (!last || last.sender !== "bot") {
                updated.push({ content: token, sender: "bot" });
              } else {
                last.content = (last.content || "") + token;
              }
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
        const last = updated[updated.length - 1];
        if (!last || last.sender !== "bot") {
          updated.push({ content: "Request failed.", sender: "bot" });
        } else {
          last.content = "Request failed.";
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="app">
        <div className="container">
          <div className="header">
            <div className="title">⚡ LOCAL AI</div>
          </div>

          <div className="chat" ref={chatRef}>
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.sender}`}>
                {m.content}
              </div>
            ))}
          </div>

          <div className="inputArea">
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Enter prompt..."
            />

            <button className="button" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
