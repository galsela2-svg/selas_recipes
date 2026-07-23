// Third-tier free backup, behind Gemini and Groq — same OpenAI-style chat
// completions shape as Groq, just a different host/model. No native JSON
// schema enforcement here either; the schema is described in the prompt.
const MISTRAL_MODEL = "mistral-small-latest";

export class MistralNotConfiguredError extends Error {
  constructor() {
    super("MISTRAL_API_KEY is not set");
  }
}

export async function generateMistralJson(params: {
  system: string;
  prompt: string;
  schema: unknown;
}): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new MistralNotConfiguredError();

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [
        {
          role: "system",
          content:
            `${params.system}\n\n` +
            "החזר אך ורק JSON תקין (ללא markdown, ללא הסבר) התואם למבנה הבא:\n" +
            JSON.stringify(params.schema),
        },
        { role: "user", content: params.prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mistral request failed: ${res.status} ${body}`.trim());
  }

  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) throw new Error("No content in Mistral response");
  return text;
}
