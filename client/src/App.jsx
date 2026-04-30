import { useState, useRef, useEffect, useCallback } from "react";

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "8px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#c8f135",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

function escHtml(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseMarkdown(text) {
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="code-block"><div class="code-lang">${lang || "code"}</div><code>${escHtml(code.trim())}</code></pre>`
  );
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  text = text.replace(/^[•\-\*] (.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul class="md-ul">${m}</ul>`);
  text = text.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  text = text.replace(/\n\n/g, "<br/><br/>");
  text = text.replace(/\n/g, "<br/>");
  return text;
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 18,
      gap: 10,
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #c8f135, #7ecf00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0, marginTop: 2, fontWeight: "bold", color: "#0a0a0a",
        }}>R</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser
          ? "linear-gradient(135deg, #c8f135 0%, #a8d100 100%)"
          : "rgba(255,255,255,0.06)",
        color: isUser ? "#0a0a0a" : "#e8e8e8",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        padding: "12px 16px",
        fontSize: 14.5,
        lineHeight: 1.65,
        border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isUser ? "0 2px 12px rgba(200,241,53,0.15)" : "none",
        wordBreak: "break-word",
      }}>
        {msg.imagePreview && (
          <img src={msg.imagePreview} alt="upload"
            style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginBottom: 8, display: "block" }} />
        )}
        {msg.fileName && !msg.imagePreview && (
          <div style={{
            background: "rgba(0,0,0,0.15)", borderRadius: 6, padding: "4px 8px",
            fontSize: 12, marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
          }}>
            📄 {msg.fileName}
          </div>
        )}
        {isUser
          ? <span style={{ whiteSpace: "pre-wrap" }}>{msg.displayText || msg.text}</span>
          : <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
        }
      </div>
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, marginTop: 2,
        }}>👤</div>
      )}
    </div>
  );
}

const STARTER_PROMPTS = [
  "Explain how neural networks work simply",
  "Write a Python script to rename files by date",
  "Help me write a professional email",
  "What are the best practices in clean code?",
];

let convCounter = 1;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([{ id: 1, title: "New Chat", messages: [] }]);
  const [activeConvId, setActiveConvId] = useState(1);
  const [model, setModel] = useState("groq");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, loading]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPendingFile({ type: "image", name: file.name, preview: ev.target.result });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPendingFile({ type: "text", name: file.name, content: ev.target.result, preview: null });
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && !pendingFile) return;
    if (loading) return;

    setError("");

    let apiContent = text;
    if (pendingFile && pendingFile.type === "text") {
      apiContent = `File: ${pendingFile.name}\n\`\`\`\n${pendingFile.content?.slice(0, 12000)}\n\`\`\`\n\n${text || "Please read and analyze this file."}`;
    } else if (pendingFile && pendingFile.type === "image") {
      apiContent = `[User uploaded image: ${pendingFile.name}]. ${text || "Please acknowledge the image and let me describe it if needed."}`;
    }

    const userMsg = {
      role: "user",
      text: text || `[File: ${pendingFile?.name}]`,
      displayText: text,
      apiContent,
      fileName: pendingFile?.name,
      imagePreview: pendingFile?.preview,
      id: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    const savedFile = pendingFile;
    setPendingFile(null);
    setLoading(true);
    setStreamingText("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const systemMsg = {
      role: "system",
      content: "You are RetrAI Po, a powerful and friendly AI assistant. Help with coding, writing, math, analysis, file reading, creative work — anything. Format code in markdown code blocks. Be thorough but concise.",
    };

    const apiMessages = [
      systemMsg,
      ...newMessages.map(m => ({ role: m.role, content: m.apiContent || m.text })),
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`Server error ${res.status}: ${errText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
        setStreamingText(fullText);
      }

      const assistantMsg = { role: "assistant", text: fullText, id: Date.now() + 1 };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamingText("");

      const title = (text || savedFile?.name || "Chat").slice(0, 38);
      setConversations(prev => prev.map(c =>
        c.id === activeConvId ? { ...c, messages: finalMessages, title } : c
      ));
    } catch (err) {
      setError(err.message || "Something went wrong. Make sure GROQ_API_KEY is set in Vercel.");
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, pendingFile, model, activeConvId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const newChat = () => {
    const id = ++convCounter;
    setConversations(prev => [{ id, title: "New Chat", messages: [] }, ...prev]);
    setActiveConvId(id);
    setMessages([]);
    setInput("");
    setPendingFile(null);
    setSidebarOpen(false);
  };

  const loadConv = (conv) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setSidebarOpen(false);
  };

  const deleteConv = (e, id) => {
    e.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const fresh = { id: ++convCounter, title: "New Chat", messages: [] };
        setActiveConvId(fresh.id);
        setMessages([]);
        return [fresh];
      }
      if (id === activeConvId) {
        setActiveConvId(filtered[0].id);
        setMessages(filtered[0].messages);
      }
      return filtered;
    });
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(200,241,53,0.25); border-radius: 4px; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .msg-appear { animation: fadeIn 0.25s ease; }
        .code-block { background:#0d0d0d; border:1px solid rgba(200,241,53,0.15); border-radius:10px; overflow:auto; margin:10px 0; font-family:'Space Mono',monospace; font-size:12.5px; line-height:1.6; }
        .code-block code { display:block; padding:14px 16px; color:#d4e8a0; white-space:pre; }
        .code-lang { padding:5px 14px; background:rgba(200,241,53,0.08); color:#c8f135; font-size:11px; font-family:'Space Mono',monospace; border-bottom:1px solid rgba(200,241,53,0.1); letter-spacing:0.05em; }
        .inline-code { background:rgba(200,241,53,0.1); color:#c8f135; padding:1px 6px; border-radius:4px; font-family:'Space Mono',monospace; font-size:13px; }
        .md-h1,.md-h2,.md-h3 { color:#c8f135; margin:14px 0 6px; line-height:1.3; }
        .md-h1{font-size:19px;font-weight:700} .md-h2{font-size:16px;font-weight:600} .md-h3{font-size:14px;font-weight:600}
        .md-ul { padding-left:18px; margin:6px 0; }
        .md-ul li { margin:4px 0; }
        textarea { resize:none; font-family:'DM Sans',sans-serif; }
        .sidebar-item:hover { background:rgba(255,255,255,0.06)!important; }
        .send-btn:hover:not(:disabled) { background:#d4f548!important; transform:scale(1.06); }
        .send-btn:active:not(:disabled) { transform:scale(0.96); }
        .icon-btn:hover { background:rgba(255,255,255,0.08)!important; }
        .del-btn { opacity:0; transition:opacity 0.15s; }
        .conv-row:hover .del-btn { opacity:1!important; }
        .cursor-blink::after { content:'▋'; animation:blink 0.7s infinite; font-size:12px; color:#c8f135; margin-left:2px; }
      `}</style>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:40 }} />
      )}

      {/* Sidebar */}
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:265,
        background:"#111213", borderRight:"1px solid rgba(255,255,255,0.06)",
        zIndex:50, display:"flex", flexDirection:"column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.26s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ padding:"18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#c8f135,#7ecf00)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:"#0a0a0a",fontSize:14 }}>R</div>
            <div>
              <div style={{ color:"#e8e8e8", fontWeight:600, fontSize:15 }}>RetrAI Po</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11 }}>Free · Unlimited</div>
            </div>
          </div>
          <button onClick={newChat} style={{
            width:"100%", padding:"9px 12px",
            background:"rgba(200,241,53,0.08)", border:"1px solid rgba(200,241,53,0.2)",
            borderRadius:10, color:"#c8f135", cursor:"pointer",
            fontSize:13, fontFamily:"'DM Sans',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontWeight:500,
          }}>✦ New Chat</button>
        </div>

        <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Model</div>
          <div style={{ display:"flex", gap:6 }}>
            {[["groq","🚀 Llama 3 (Free)"],["openrouter","⚡ GPT-4o mini"]].map(([val,label]) => (
              <button key={val} onClick={() => setModel(val)} style={{
                flex:1, padding:"6px 6px", borderRadius:8, cursor:"pointer",
                background: model===val ? "rgba(200,241,53,0.15)" : "rgba(255,255,255,0.04)",
                border: model===val ? "1px solid rgba(200,241,53,0.35)" : "1px solid rgba(255,255,255,0.07)",
                color: model===val ? "#c8f135" : "rgba(255,255,255,0.45)",
                fontSize:11, fontFamily:"'DM Sans',sans-serif",
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"8px" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", padding:"6px 8px 4px", textTransform:"uppercase", letterSpacing:"0.07em" }}>History</div>
          {conversations.map(c => (
            <div key={c.id} onClick={() => loadConv(c)} className="sidebar-item conv-row" style={{
              padding:"9px 10px", borderRadius:8, cursor:"pointer", marginBottom:2,
              background: c.id===activeConvId ? "rgba(200,241,53,0.08)" : "transparent",
              color: c.id===activeConvId ? "#c8f135" : "rgba(255,255,255,0.55)",
              fontSize:13, display:"flex", alignItems:"center", gap:6, position:"relative",
            }}>
              <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                💬 {c.title}
              </span>
              <button className="del-btn" onClick={(e) => deleteConv(e, c.id)} style={{
                background:"none", border:"none", color:"rgba(255,80,80,0.6)",
                cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1,
              }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", textAlign:"center", lineHeight:1.6 }}>
            Groq · OpenRouter · 100% Free
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100vh" }}>
        {/* Header */}
        <div style={{
          padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", alignItems:"center", gap:12,
          background:"rgba(10,10,10,0.97)", backdropFilter:"blur(12px)",
          position:"sticky", top:0, zIndex:10,
        }}>
          <button onClick={() => setSidebarOpen(true)} className="icon-btn" style={{
            background:"transparent", border:"none", color:"rgba(255,255,255,0.55)",
            cursor:"pointer", fontSize:20, padding:"5px 8px", borderRadius:8, lineHeight:1,
          }}>☰</button>
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#c8f135,#7ecf00)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:"#0a0a0a",fontSize:12 }}>R</div>
            <div>
              <div style={{ color:"#fff", fontWeight:600, fontSize:15, lineHeight:1.1 }}>RetrAI Po</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:5,height:5,borderRadius:"50%",background:"#c8f135",animation:"pulse 2s infinite" }} />
                {model === "groq" ? "Llama 3 · Free" : "GPT-4o mini · OpenRouter"}
              </div>
            </div>
          </div>
          <button onClick={() => {
            setMessages([]);
            setConversations(prev => prev.map(c => c.id===activeConvId ? {...c, messages:[], title:"New Chat"} : c));
          }} className="icon-btn" style={{
            background:"transparent", border:"none", color:"rgba(255,255,255,0.3)",
            cursor:"pointer", fontSize:12, padding:"5px 10px", borderRadius:8, fontFamily:"'DM Sans',sans-serif",
          }}>Clear</button>
          <button onClick={newChat} className="icon-btn" style={{
            background:"rgba(200,241,53,0.08)", border:"1px solid rgba(200,241,53,0.2)",
            color:"#c8f135", cursor:"pointer", fontSize:12, padding:"5px 12px",
            borderRadius:8, fontFamily:"'DM Sans',sans-serif",
          }}>+ New</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflow:"auto", padding:"20px 16px" }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign:"center", marginTop:"8vh", animation:"fadeIn 0.5s ease" }}>
              <div style={{ fontSize:44, marginBottom:10 }}>✦</div>
              <h1 style={{ color:"#c8f135", fontSize:26, fontWeight:700, marginBottom:6 }}>RetrAI Po</h1>
              <p style={{ color:"rgba(255,255,255,0.35)", fontSize:14, marginBottom:28 }}>
                Free · Unlimited · No login · Powered by Llama 3
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7, justifyContent:"center", maxWidth:480, margin:"0 auto 28px" }}>
                {["💬 Chat freely","📄 Read files","💻 Generate code","🔢 Solve math","✍️ Write anything","🌐 Any language"].map(f => (
                  <span key={f} style={{
                    display:"inline-flex", alignItems:"center", padding:"6px 12px",
                    background:"rgba(200,241,53,0.07)", border:"1px solid rgba(200,241,53,0.18)",
                    borderRadius:20, fontSize:12, color:"#c8f135",
                  }}>{f}</span>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, maxWidth:400, margin:"0 auto" }}>
                {STARTER_PROMPTS.map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} className="sidebar-item" style={{
                    background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:10, pad
