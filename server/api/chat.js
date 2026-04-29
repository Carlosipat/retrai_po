const sendMessage = async (text, imageFile = null) => {
  const userText = text || input.trim();

  if ((!userText && !imageFile) || loading) return;

  // Reset input
  setInput("");
  if (textareaRef.current) textareaRef.current.style.height = "44px";

  // Add user message
  const newMessages = [
    ...messages,
    { role: "user", content: userText || "[Image uploaded]" }
  ];

  setMessages(newMessages);
  setLoading(true);

  try {
    // 🔹 Prepare request
    const payload = {
      messages: newMessages,
      model
    };

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.body) {
      throw new Error("No response stream");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    // 🔹 Create empty assistant message
    let assistantMessage = {
      role: "assistant",
      content: ""
    };

    setMessages(prev => [...prev, assistantMessage]);

    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });

        // Append streamed text
        assistantMessage.content += chunk;

        // Update UI live
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...assistantMessage };
          return updated;
        });
      }
    }

  } catch (err) {
    console.error(err);

    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: "⚠️ Error: Unable to connect to server."
      }
    ]);
  }

  setLoading(false);
};
