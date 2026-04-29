export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { messages, model } = await req.json();

  const encoder = new TextEncoder();

  let apiUrl = "";
  let headers = {};
  let body = {};

  if (model === "groq") {
    apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    headers = {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    };
    body = {
      model: "llama3-70b-8192",
      messages,
      stream: true
    };
  }

  if (model === "openrouter") {
    apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    headers = {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    };
    body = {
      model: "openai/gpt-4o-mini",
      messages,
      stream: true
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Extract streamed tokens
        const lines = chunk.split("\n").filter(line => line.startsWith("data:"));

        for (const line of lines) {
          const json = line.replace("data: ", "").trim();
          if (json === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const parsed = JSON.parse(json);
            const token =
              parsed.choices?.[0]?.delta?.content || "";

            controller.enqueue(encoder.encode(token));
          } catch {}
        }
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    }
  });
    }
