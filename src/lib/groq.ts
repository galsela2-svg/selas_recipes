// Free backup for when Gemini's quota runs out — Groq doesn't enforce a
// strict JSON schema server-side the way Gemini does, so the schema is
// described in the prompt instead and the caller is responsible for
// validating/coercing the result same as any other untrusted AI output.
const GROQ_MODEL = "llama-3.3-70b-versatile";

export class GroqNotConfiguredError extends Error {
  constructor() {
    super("GROQ_API_KEY is not set");
  }
}

export async function generateGroqJson(params: {
  system: string;
  prompt: string;
  schema: unknown;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqNotConfiguredError();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
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
    throw new Error(`Groq request failed: ${res.status} ${body}`.trim());
  }

  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) throw new Error("No content in Groq response");
  return text;
}
