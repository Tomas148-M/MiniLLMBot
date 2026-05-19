import { useEffect, useMemo, useRef, useState } from "react";
import { Database, LoaderCircle, Send, Settings, Trash2, X } from "lucide-react";
import "./App.css";

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Be concise, friendly, and accurate.";

function toApiMessages(messages) {
  return messages
    .filter((message) => message.content.trim())
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.content,
    }));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Request failed.";
}

function createMessageId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Header({ isSettingsOpen, onToggleSettings, onClearChat }) {
  return (
    <div className="header">
      <div>
        <div className="title">LOCAL AI</div>
        <div className="subtitle">Ollama + MCP chat</div>
      </div>

      <div className="toolbar">
        <button
          className={`iconButton ${isSettingsOpen ? "active" : ""}`}
          type="button"
          onClick={onToggleSettings}
          aria-label="Open settings"
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <button
          className="iconButton danger"
          type="button"
          onClick={onClearChat}
          aria-label="Clear chat"
          title="Clear chat"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  systemPrompt,
  useRag,
  onClose,
  onSystemPromptChange,
  onUseRagChange,
}) {
  return (
    <aside className="settingsPanel">
      <div className="panelHeader">
        <div className="panelTitle">Settings</div>
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close settings">
          <X size={18} />
        </button>
      </div>

      <label className="field">
        <span>System prompt</span>
        <textarea
          value={systemPrompt}
          onChange={(event) => onSystemPromptChange(event.target.value)}
          rows={5}
          maxLength={4000}
        />
      </label>

      <label className="toggleRow">
        <span className="toggleLabel">
          <Database size={17} />
          RAG
        </span>
        <input
          checked={useRag}
          onChange={(event) => onUseRagChange(event.target.checked)}
          type="checkbox"
        />
      </label>
    </aside>
  );
}

function MessageList({ chatRef, messages, isLoading }) {
  if (messages.length === 0) {
    return (
      <div className="chat empty" ref={chatRef}>
        <div className="emptyState">Ask something to start the session.</div>
      </div>
    );
  }

  return (
    <div className="chat" ref={chatRef}>
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.sender}`}>
          {message.content || (isLoading && message.sender === "bot" ? "..." : "")}
        </div>
      ))}
    </div>
  );
}

function Composer({ input, isLoading, onInputChange, onSend }) {
  return (
    <div className="inputArea">
      <input
        className="input"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            onSend();
          }
        }}
        placeholder="Enter prompt..."
      />

      <button className="sendButton" type="button" onClick={onSend} disabled={isLoading || !input.trim()}>
        {isLoading ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
        <span>{isLoading ? "Sending" : "Send"}</span>
      </button>
    </div>
  );
}

function App() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const chatRef = useRef(null);

  const statusText = useMemo(() => {
    if (isLoading) return "Thinking";
    if (useRag) return "Ready with RAG";
    return "Ready";
  }, [isLoading, useRag]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const appendBotToken = (token) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];

      if (!last || last.sender !== "bot") {
        return [...updated, { id: createMessageId(), content: token, sender: "bot" }];
      }

      updated[updated.length - 1] = {
        ...last,
        content: `${last.content || ""}${token}`,
      };

      return updated;
    });
  };

  const replaceLastBotMessage = (content) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];

      if (!last || last.sender !== "bot") {
        return [...updated, { id: createMessageId(), content, sender: "bot" }];
      }

      updated[updated.length - 1] = { ...last, content };
      return updated;
    });
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMsg = { id: createMessageId(), content: trimmedInput, sender: "user" };
    const botMsg = { id: createMessageId(), content: "", sender: "bot" };
    const outboundMessages = toApiMessages([...messages, userMsg]);

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setErrorMessage("");
    setIsLoading(true);
    setInput("");

    try {
      const response = await fetch("/api/chatstream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outboundMessages,
          system: systemPrompt,
          use_rag: useRag,
        }),
      });

      if (!response.ok || !response.body) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Streaming request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const data = JSON.parse(line);
          const token = data?.message?.content || "";

          if (token) {
            appendBotToken(token);
          }
        }
      }

      if (buffer.trim()) {
        const data = JSON.parse(buffer);
        const token = data?.message?.content || "";

        if (token) {
          appendBotToken(token);
        }
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(error);
      setErrorMessage(message);
      replaceLastBotMessage("Request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <main className={`container ${isSettingsOpen ? "withSettings" : ""}`}>
        <Header
          isSettingsOpen={isSettingsOpen}
          onToggleSettings={() => setIsSettingsOpen((value) => !value)}
          onClearChat={() => {
            setMessages([]);
            setErrorMessage("");
          }}
        />

        <div className="statusBar">
          <span className={`statusDot ${isLoading ? "working" : ""}`} />
          <span>{statusText}</span>
        </div>

        {errorMessage && <div className="errorBanner">{errorMessage}</div>}

        <div className="workspace">
          <div className="chatColumn">
            <MessageList chatRef={chatRef} messages={messages} isLoading={isLoading} />
            <Composer input={input} isLoading={isLoading} onInputChange={setInput} onSend={sendMessage} />
          </div>

          {isSettingsOpen && (
            <SettingsPanel
              systemPrompt={systemPrompt}
              useRag={useRag}
              onClose={() => setIsSettingsOpen(false)}
              onSystemPromptChange={setSystemPrompt}
              onUseRagChange={setUseRag}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
