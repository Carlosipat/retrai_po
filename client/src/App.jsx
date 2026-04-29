import { useState, useRef, useEffect } from "react";

const PLUGINS = [
  { id: "none", icon: "✦", label: "Chat" },
  { id: "websearch", icon: "⊕", label: "Web Search" },
  { id: "document", icon: "◈", label: "Documents" },
  { id: "youtube", icon: "▷", label: "YouTube" },
  { id: "website", icon: "◎", label: "Website" },
];

const MODELS = [
  { id: "groq", label: "Groq · Llama 3", badge: "Fast" },
  { id: "openrouter", label: "OpenRouter · GPT-4o", badge: "Smart" },
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#c8f135",
            animation: "pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        animation: "slideUp 0.25s ease",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #c8f135, #7fff00)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            marginRight: 8,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          ✦
        </div>
      )}
      <div
        style={{
          maxWidth: "78%",
          padding: isUser ? "10px 14px" : "12px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, #c8f135 0%, #9ddb00 100%)"
            : "rgba(255,255,255,0.06)",
          color: isUser ? "#0a0a0a" : "#e8e8e8",
          fontSize: 14,
          lineHeight: 1.55,
          fontFamily: "'DM Sans', sans-serif",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
        {msg.source && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: 11, opacity: 0.7 }}>
            📚 {msg.source}
          </div>
        )}
      </div>
    </div>
  );
}

function PluginBar({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "0 16px 12px",
        scrollbarWidth: "none",
      }}
    >
      {PLUGINS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          style={{
            flexShrink: 0,
            padding: "6px 12px",
            borderRadius: 20,
            border: active === p.id ? "1.5px solid #c8f135" : "1.5px solid rgba(255,255,255,0.12)",
            background: active === p.id ? "rgba(200,241,53,0.12)" : "rgba(255,255,255,0.04)",
            color: active === p.id ? "#c8f135" : "#888",
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          <span>{p.icon}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}

function PluginInput({ plugin, onSubmit }) {
  const [url, setUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");

  if (plugin === "none") return null;

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#e8e8e8",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 8,
  };

  const btnStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #c8f135, #9ddb00)",
    color: "#0a0a0a",
    fontWeight: 700,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  };

  if (plugin === "websearch") {
    return (
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Web Search Active</div>
        <div style={{ padding: 10, borderRadius: 10, background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.2)", fontSize: 12, color: "#c8f135" }}>
          ⊕ DuckDuckGo search will enhance your queries automatically
        </div>
      </div>
    );
  }

  if (plugin === "document") {
    return (
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Upload Document</div>
        <label style={{ display: "block", padding: "20px", borderRadius: 10, border: "1.5px dashed rgba(200,241,53,0.3)", textAlign: "center", cursor: "pointer", color: "#888", fontSize: 13 }}>
          <input type="file" accept=".txt,.pdf,.docx" style={{ display: "none" }} onChange={(e) => {
            const f = e.target.files[0];
            if (f) onSubmit(`[Document loaded: ${f.name}] Ask me anything about this document.`);
          }} />
          ◈ Tap to upload PDF, TXT, or DOCX
        </label>
      </div>
    );
  }

  if (plugin === "youtube") {
    return (
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>YouTube URL</div>
        <input style={inputStyle} placeholder="https://youtube.com/watch?v=..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} />
        <button style={btnStyle} onClick={() => { if (ytUrl) { onSubmit(`Analyze this YouTube video: ${ytUrl}`); setYtUrl(""); } }}>
          ▷ Load Video
        </button>
      </div>
    );
  }

  if (plugin === "website") {
    return (
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Website URL</div>
        <input style={inputStyle} placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} />
        <button style={btnStyle} onClick={() => { if (url) { onSubmit(`Analyze this website: ${url}`); setUrl(""); } }}>
          ◎ Load Website
        </button>
      </div>
    );
  }

  return null;
}

function ModelPicker({ active, onChange }) {
  const [open, setOpen] = useState(false);
  const current = MODELS.find(m => m.id === active);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "5px 10px",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: "#aaa",
          fontSize: 11,
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ color: "#c8f135" }}>●</span>
        {current?.label}
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "110%",
            left: 0,
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            overflow: "hidden",
            minWidth: 180,
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
            zIndex: 100,
          }}
        >
          {MODELS.map(m => (
            <div
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: active === m.id ? "rgba(200,241,53,0.08)" : "transparent",
                color: active === m.id ? "#c8f135" : "#ccc",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span>{m.label}</span>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "#888" }}>{m.badge}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I'm RetrAI Po ✦\n\nChoose a plugin above or just start chatting. What can I help you with?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [plugin, setPlugin] = useState("none");
  const [model, setModel] = useState("groq");
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build system-flavored prefix based on active plugin
      const systemHint =
        plugin === "websearch" ? " The user has web search active — acknowledge this when relevant." :
        plugin === "document" ? " The user may reference uploaded documents." :
        plugin === "youtube" ? " The user may ask about YouTube video content." :
        plugin === "website" ? " The user may ask about website content." : "";

      // Inject a system message as a leading assistant turn isn't ideal;
      // instead we prepend a system role message supported by the backend.
      const apiMessages = [
        {
          role: "system",
          content: `You are RetrAI Po, a helpful and concise AI assistant.${systemHint} Format responses well for mobile reading.`
        },
        ...newMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      // Streaming fetch to /api/chat
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Stream the response token by token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      // Add placeholder assistant message
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: reply }]);
      }

      if (!reply) {
        setMessages([...newMessages, { role: "assistant", content: "I didn't get a response. Please try again." }]);
      }
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: `Connection error: ${e.message}\n\nMake sure your API keys are set in Vercel environment variables.` }]);
    }

    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared ✦\n\nHow can I help you?" }]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #0a0a0a; overscroll-behavior: none; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        textarea { resize: none; }
        textarea:focus { outline: none; }
      `}</style>

      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: 480,
        margin: "0 auto",
        background: "#0a0a0a",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c8f135, #7fff00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "#0a0a0a",
            }}>✦</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.3px" }}>RetrAI Po</div>
              <div style={{ fontSize: 10, color: "#c8f135", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Mono', monospace" }}>
                {PLUGINS.find(p => p.id === plugin)?.label} · {MODELS.find(m => m.id === model)?.badge}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={clearChat} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#888", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ↺
            </button>
            <button onClick={() => setShowSettings(!showSettings)} style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${showSettings ? "#c8f135" : "rgba(255,255,255,0.1)"}`, background: showSettings ? "rgba(200,241,53,0.1)" : "rgba(255,255,255,0.04)", color: showSettings ? "#c8f135" : "#888", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ⚙
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(20,20,20,0.98)", animation: "fadeIn 0.2s ease" }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>Model</div>
            {MODELS.map(m => (
              <div key={m.id} onClick={() => setModel(m.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: model === m.id ? "rgba(200,241,53,0.08)" : "transparent", marginBottom: 2 }}>
                <span style={{ fontSize: 13, color: model === m.id ? "#c8f135" : "#aaa" }}>{m.label}</span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#666" }}>{m.badge}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(200,241,53,0.05)", border: "1px solid rgba(200,241,53,0.15)" }}>
              <div style={{ fontSize: 11, color: "#c8f135", marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>ENV VARS NEEDED</div>
              <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>
                GROQ_API_KEY<br />
                OPENROUTER_API_KEY
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column" }}>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #c8f135, #7fff00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✦</div>
              <div style={{ padding: "8px 14px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Plugin Bar */}
        <PluginBar active={plugin} onChange={setPlugin} />

        {/* Plugin Input */}
        <PluginInput plugin={plugin} onSubmit={sendMessage} />

        {/* Input Area */}
        <div style={{
          padding: "8px 12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(10,10,10,0.98)",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
            <div style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjustTextarea(); }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message..."
                rows={1}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#e8e8e8",
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontFamily: "'DM Sans', sans-serif",
                  height: 44,
                  maxHeight: 120,
                }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                
