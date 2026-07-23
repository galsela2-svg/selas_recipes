import { gemini, GEMINI_MODEL } from "@/lib/gemini";
import { isGeminiQuotaError } from "@/lib/ai-error";
import { generateGroqJson } from "@/lib/groq";
import { generateMistralJson } from "@/lib/mistral";

/**
 * Structured-JSON generation with automatic free fallbacks, three deep:
 * Gemini (native JSON-schema enforcement) first; if that specifically fails
 * on Gemini's free-tier quota, Groq; if Groq also fails for any reason,
 * Mistral. Any *other* Gemini error (bad/missing key, etc.) still throws
 * immediately without falling back — only "out of quota" is worth
 * switching providers for at the first hop. Callers JSON.parse() the
 * returned text same as a direct Gemini call.
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

    try {
      return await generateGroqJson({
        system: params.systemInstruction,
        prompt: params.contents,
        schema: params.schema,
      });
    } catch {
      return generateMistralJson({
        system: params.systemInstruction,
        prompt: params.contents,
        schema: params.schema,
      });
    }
  }
}
