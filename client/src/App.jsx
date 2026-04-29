const sendMessage = async () => {
  if (!input.trim() || loading) return;

  const newMessages = [
    ...messages,
    { role: "user", content: input }
  ];

  setMessages(newMessages);
  setInput("");
  setLoading(true);

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: newMessages,
      model
    })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let assistantMessage = {
    role: "assistant",
    content: ""
  };

  setMessages(prev => [...prev, assistantMessage]);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);

    assistantMessage.content += chunk;

    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...assistantMessage };
      return updated;
    });
  }

  setLoading(false);
};
