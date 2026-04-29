import { useState, useRef, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `You are RetrAI Po, a powerful AI assistant. You can:
- Have unlimited conversations
- Read and analyze uploaded files (text, code, PDFs described as images)
- Look at images and describe/analyze them
- Generate, debug, and explain code in any language
- Help with any task: writing, math, research, creative work
- Generate images (describe what you'd create in vivid detail since you can't render them, but offer to write prompts for image generators)

Be helpful, thorough, and friendly. Format code with proper markdown code blocks. Use markdown for structure when helpful.`;

const MODEL = "claude-sonnet-4-20250514";

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

function parseMarkdown(text) {
  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="code-block"><div class="code-lang">${lang || "code"}</div><code>${escHtml(code.trim())}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headers
  text = text.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  // Bullet lists
  text = text.replace(/^[•\-] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul class="md-ul">${m}</ul>`);
  // Numbered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Line breaks
  text = text.replace(/\n\n/g, '<br/><br/>');
  text = text.replace(/\n/g, '<br/>');
  return text;
}

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 18,
      gap: 10,
      alignItems: "flex-start"
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #c8f135, #7ecf00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, marginTop: 2, fontWeight: "bold", color: "#0a0a0a"
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
        boxShadow: isUser ? "0 2px 12px rgba(200,241,53,0.2)" : "none"
      }}>
        {/* Image preview if user sent image */}
        {msg.imagePreview && (
          <img src={msg.imagePreview} alt="uploaded"
            style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginBottom: 8, display: "block" }} />
        )}
        {/* File info */}
        {msg.fileName && !msg.imagePreview && (
          <div style={{
            background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "4px 8px",
            fontSize: 12, marginBottom: 6, display: "flex", alignItems: "center", gap: 6
          }}>
            📄 {msg.fileName}
          </div>
        )}
        {isUser ? (
          <span>{msg.displayText || msg.text}</span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
        )}
      </div>
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, marginTop: 2
        }}>👤</div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState(null); // {type, data, name, preview}
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([{ id: 1, title: "New Chat", messages: [] }]);
  const [activeConvId, setActiveConvId] = useState(1);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      if (isImage) {
        setPendingFile({
          type: "image",
          mediaType: file.type,
          data: base64,
          name: file.name,
          preview: ev.target.result
        });
      } else {
        // Text/code/PDF as text
        const textReader = new FileReader();
        textReader.onload = (te) => {
          setPendingFile({
            type: "text",
            content: te.target.result,
            name: file.name,
            preview: null
          });
        };
        textReader.readAsText(file);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && !pendingFile) return;
    if (loading) return;

    setError("");

    // Build display message
    const userDisplayMsg = {
      role: "user",
      text: text || (pendingFile ? `[Sent file: ${pendingFile.name}]` : ""),
      displayText: text,
      fileName: pendingFile?.name,
      imagePreview: pendingFile?.preview,
      id: Date.now()
    };

    const newMessages = [...messages, userDisplayMsg];
    setMessages(newMessages);
    setInput("");
    setPendingFile(null);
    setLoading(true);

    // Build API messages
    const apiMessages = newMessages.map(m => {
      if (m.role === "assistant") {
        return { role: "assistant", content: m.text };
      }
      // User message - may have image
      if (m.imagePreview && m._imageData) {
        return {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: m._imageMediaType, data: m._imageData } },
            { type: "text", text: m.text || "What do you see in this image?" }
          ]
        };
      }
      if (m._fileContent) {
        return {
          role: "user",
          content: `File: ${m.fileName}\n\n\`\`\`\n${m._fileContent}\n\`\`\`\n\n${m.text || "Please analyze this file."}`
        };
      }
      return { role: "user", content: m.text };
    });

    // Fix last user message to include file data
    const lastIdx = apiMessages.length - 1;
    if (pendingFile === null && userDisplayMsg.imagePreview) {
      // already handled above via _imageData
    }

    // Actually attach file to last message in apiMessages
    const lastUserMsg = newMessages[newMessages.length - 1];
    if (pendingFile) {
      if (pendingFile.type === "image") {
        apiMessages[lastIdx] = {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: pendingFile.mediaType, data: pendingFile.data } },
            { type: "text", text: text || "Describe and analyze this image in detail." }
          ]
        };
      } else {
        apiMessages[lastIdx] = {
          role: "user",
          content: `File: ${pendingFile.name}\n\n\`\`\`\n${pendingFile.content?.slice(0, 15000)}\n\`\`\`\n\n${text || "Please read and analyze this file."}`
        };
      }
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: apiMessages
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.content?.find(b => b.type === "text")?.text || "";

      const assistantMsg = {
        role: "assistant",
        text: assistantText,
        id: Date.now() + 1
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Update conversation title from first message
      setConversations(prev => prev.map(c =>
        c.id === activeConvId
          ? { ...c, messages: finalMessages, title: text?.slice(0, 35) || c.title }
          : c
      ));
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, pendingFile, activeConvId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const newChat = () => {
    const id = Date.now();
    setConversations(prev => [{ id, title: "New Chat", messages: [] }, ...prev]);
    setActiveConvId(id);
    setMessages([]);
    setInput("");
    setPendingFile(null);
    setSidebarOpen(false);
  };

  const loadConversation = (conv) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setSidebarOpen(false);
  };

  const clearChat = () => {
    setMessages([]);
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: [], title: "New Chat" } : c));
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(200,241,53,0.3); border-radius: 4px; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .msg-appear { animation: fadeIn 0.3s ease; }
        .code-block { background:#111; border:1px solid rgba(200,241,53,0.2); border-radius:10px; overflow:auto; margin:10px 0; font-family:'Space Mono',monospace; font-size:12.5px; line-height:1.6; }
        .code-block code { display:block; padding:12px 16px; color:#e8e8e8; white-space:pre; }
        .code-lang { padding:4px 12px; background:rgba(200,241,53,0.1); color:#c8f135; font-size:11px; font-family:'Space Mono',monospace; border-bottom:1px solid rgba(200,241,53,0.15); }
        .inline-code { background:rgba(200,241,53,0.1); color:#c8f135; padding:2px 6px; border-radius:4px; font-family:'Space Mono',monospace; font-size:13px; }
        .md-h1,.md-h2,.md-h3 { color:#c8f135; margin:12px 0 6px; }
        .md-h1{font-size:20px} .md-h2{font-size:17px} .md-h3{font-size:15px}
        .md-ul { padding-left:20px; margin:8px 0; }
        .md-ul li { margin:4px 0; }
        textarea { resize:none; font-family:'DM Sans',sans-serif; }
        .sidebar-item:hover { background:rgba(255,255,255,0.06)!important; }
        .send-btn:hover { background:rgba(200,241,53,0.85)!important; transform:scale(1.05); }
        .send-btn:active { transform:scale(0.97); }
        .icon-btn:hover { background:rgba(255,255,255,0.08)!important; }
        .feature-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; background:rgba(200,241,53,0.08); border:1px solid rgba(200,241,53,0.2); border-radius:20px; font-size:12px; color:#c8f135; cursor:pointer; transition:all 0.2s; }
        .feature-chip:hover { background:rgba(200,241,53,0.15); }
      `}</style>

      {/* Sidebar */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:40 }} />
      )}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 260,
        background: "#111",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column"
      }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#c8f135,#7ecf00)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:"#0a0a0a",fontSize:14 }}>R</div>
            <span style={{ color:"#c8f135", fontWeight:600, fontSize:15 }}>RetrAI Po</span>
          </div>
          <button onClick={newChat} style={{
            width:"100%", padding:"9px 12px", background:"rgba(200,241,53,0.1)",
            border:"1px solid rgba(200,241,53,0.25)", borderRadius:10, color:"#c8f135",
            cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", display:"flex",
            alignItems:"center", gap:6, fontWeight:500
          }}>
            ✦ New Chat
          </button>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"8px 8px" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", padding:"8px 8px 4px", textTransform:"uppercase", letterSpacing:"0.08em" }}>History</div>
          {conversations.map(c => (
            <div key={c.id} onClick={() => loadConversation(c)} className="sidebar-item" style={{
              padding:"9px 12px", borderRadius:8, cursor:"pointer",
              background: c.id === activeConvId ? "rgba(200,241,53,0.1)" : "transparent",
              color: c.id === activeConvId ? "#c8f135" : "rgba(255,255,255,0.65)",
              fontSize:13, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
            }}>
              💬 {c.title}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ padding:"8px 12px", fontSize:11, color:"rgba(255,255,255,0.3)", textAlign:"center" }}>
            Powered by Claude API · Free & Unlimited
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100vh" }}>

        {/* Header */}
        <div style={{
          padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)",
          display:"flex", alignItems:"center", gap:12, background:"rgba(10,10,10,0.95)",
          backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:10
        }}>
          <button onClick={() => setSidebarOpen(true)} className="icon-btn" style={{
            background:"transparent", border:"none", color:"rgba(255,255,255,0.6)",
            cursor:"pointer", fontSize:20, padding:"4px 8px", borderRadius:8, lineHeight:1
          }}>☰</button>
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#c8f135,#7ecf00)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",color:"#0a0a0a",fontSize:12 }}>R</div>
            <div>
              <div style={{ color:"#fff", fontWeight:600, fontSize:15, lineHeight:1 }}>RetrAI Po</div>
              <div style={{ color:"#c8f135", fontSize:10, display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:"#c8f135",animation:"pulse 2s infinite" }} />
                Claude · Online
              </div>
            </div>
          </div>
          <button onClick={clearChat} className="icon-btn" style={{
            background:"transparent", border:"none", color:"rgba(255,255,255,0.4)",
            cursor:"pointer", fontSize:12, padding:"6px 10px", borderRadius:8, fontFamily:"'DM Sans',sans-serif"
          }}>Clear</button>
          <button onClick={newChat} className="icon-btn" style={{
            background:"rgba(200,241,53,0.1)", border:"1px solid rgba(200,241,53,0.2)", color:"#c8f135",
            cursor:"pointer", fontSize:12, padding:"6px 12px", borderRadius:8, fontFamily:"'DM Sans',sans-serif"
          }}>+ New</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflow:"auto", padding:"24px 20px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign:"center", marginTop:"10vh", animation:"fadeIn 0.5s ease" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✦</div>
              <h1 style={{ color:"#c8f135", fontSize:28, fontWeight:700, marginBottom:8 }}>RetrAI Po</h1>
              <p style={{ color:"rgba(255,255,255,0.4)", fontSize:15, marginBottom:32 }}>Your free, unlimited AI assistant</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:500, margin:"0 auto 24px" }}>
                {["💬 Chat freely", "🖼️ Analyze images", "📄 Read files", "💻 Generate code", "🔢 Solve math", "✍️ Write anything"].map(f => (
                  <span key={f} className="feature-chip">{f}</span>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:420, margin:"0 auto" }}>
                {[
                  "Explain how neural networks work with examples",
                  "Write a Python script to sort files by type",
                  "Help me write a cover letter for a tech job"
                ].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:10, padding:"10px 14px", color:"rgba(255,255,255,0.6)",
                    cursor:"pointer", fontSize:13, textAlign:"left", fontFamily:"'DM Sans',sans-serif",
                    transition:"all 0.2s"
                  }} className="sidebar-item">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id || i} className="msg-appear">
              <Message msg={msg} />
            </div>
          ))}

          {loading && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:18 }}>
              <div style={{ width:34,height:34,borderRadius:"50%"
