import { gemini, GEMINI_MODEL } from "@/lib/gemini";
import { isGeminiQuotaError } from "@/lib/ai-error";
import { generateGroqJson } from "@/lib/groq";

/**
 * Structured-JSON generation with an automatic free fallback: tries Gemini
 * first (native JSON-schema enforcement); if that specifically fails on
 * Gemini's free-tier quota, retries the same prompt against Groq instead of
 * failing outright. Any other Gemini error (bad/missing key, etc.) still
 * throws immediately — only "out of quota" is worth switching providers
 * for. Callers JSON.parse() the returned text same as a direct Gemini call.
 */
export async function generateStructuredJson(params: {
  contents: string;
  systemInstruction: string;
  schema: unknown;
}): Promise<string> {
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: params.schema,
      },
    });
    if (!response.text) throw new Error("No text content in response");
    return response.text;
  } catch (err) {
    if (!isGeminiQuotaError(err)) throw err;

    return generateGroqJson({
      system: params.systemInstruction,
      prompt: params.contents,
      schema: params.schema,
    });
  }
}
