import { useState, useRef, useEffect } from "react";

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 I'm RetrAI Po. How can I help you today?" }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model] = useState("groq");

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // placeholder assistant message
    let assistantMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        assistantMessage.content += chunk;

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...assistantMessage };
          return copy;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Error connecting to AI server." }
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>⚡ RetrAI Po</div>
        <div style={styles.subtitle}>Streaming AI Assistant</div>
      </div>

      {/* CHAT */}
      <div style={styles.chat}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#c8f135" : "#1a1a1a",
              color: m.role === "user" ? "#000" : "#fff"
            }}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div style={styles.typing}>RetrAI is thinking...</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={styles.inputBox}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustHeight();
          }}
          placeholder="Type your message..."
          style={styles.textarea}
          rows={1}
        />

        <button
          onClick={sendMessage}
          style={styles.button}
          disabled={!input.trim() || loading}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  app: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "sans-serif"
  },

  header: {
    padding: 16,
    borderBottom: "1px solid #222"
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c8f135"
  },

  subtitle: {
    fontSize: 12,
    opacity: 0.6
  },

  chat: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  message: {
    padding: "10px 14px",
    borderRadius: 14,
    maxWidth: "75%",
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: "pre-wrap"
  },

  typing: {
    fontSize: 12,
    opacity: 0.6,
    padding: 10
  },

  inputBox: {
    display: "flex",
    padding: 10,
    borderTop: "1px solid #222",
    gap: 8
  },

  textarea: {
    flex: 1,
    resize: "none",
    borderRadius: 12,
    border: "1px solid #333",
    padding: 10,
    background: "#111",
    color: "#fff",
    outline: "none",
    fontSize: 14
  },

  button: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    background: "#c8f135",
    fontWeight: "bold",
    cursor: "pointer"
  }
};
