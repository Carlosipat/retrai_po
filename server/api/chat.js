export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const { messages, model } = await req.json();

  const encoder = new TextEncoder();

  const apiKey =
    model === "groq"
      ? process.env.GROQ_API_KEY
      : process.env.OPENROUTER_API_KEY;

  const apiUrl =
    model === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model:
        model === "groq"
          ? "llama3-70b-8192"
          : "openai/gpt-4o-mini",
      messages,
      stream: true
    })
  });

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.includes("data:")) continue;

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

  return new Response(stream);
}
