import { ApiError } from "@google/genai";

/** True for Gemini's "you've hit your free-tier quota" error specifically —
 * the one case worth automatically retrying against a different provider
 * instead of just failing. */
export function isGeminiQuotaError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

/**
 * Maps a caught error from a Gemini API call to a clear Hebrew message, or
 * null if it's not an AI-related error (caller should fall back to its own
 * generic message in that case).
 */
export function geminiErrorResponse(
  err: unknown,
  missingKeyMessage: string,
): { error: string; status: number } | null {
  const message = err instanceof Error ? err.message : "";

  // A missing/invalid GEMINI_API_KEY surfaces as a 400 ApiError with "API
  // key not valid" in the message (or, if the SDK fails before even making
  // a request, a plain Error with the same wording) — not a distinct error
  // type, so this has to match on the message text.
  if (/api key/i.test(message)) {
    return { error: missingKeyMessage, status: 500 };
  }

  if (isGeminiQuotaError(err)) {
    return {
      error: "חרגתם ממכסת השימוש החינמית של Gemini לרגע זה. נסו שוב בעוד כמה דקות.",
      status: 429,
    };
  }

  if (err instanceof ApiError) {
    return { error: `שגיאה מול שירות ה-AI: ${err.message}`, status: 502 };
  }

  return null;
}
