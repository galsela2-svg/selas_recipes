import Anthropic from "@anthropic-ai/sdk";

/**
 * A valid ANTHROPIC_API_KEY still fails with a plain APIError (not
 * AuthenticationError) when the account has no credit — easy to mistake for
 * a generic/unexplained failure otherwise.
 */
function isLowBalanceError(err: unknown): boolean {
  return err instanceof Anthropic.APIError && /credit balance/i.test(err.message);
}

/**
 * Maps a caught error from an Anthropic API call to a clear Hebrew message,
 * or null if it's not an Anthropic-related error (caller should fall back
 * to its own generic message in that case).
 */
export function anthropicErrorResponse(
  err: unknown,
  missingKeyMessage: string,
): { error: string; status: number } | null {
  if (err instanceof Anthropic.AuthenticationError) {
    return { error: missingKeyMessage, status: 500 };
  }
  if (isLowBalanceError(err)) {
    return {
      error:
        "יתרת הקרדיט בחשבון ה-Anthropic נמוכה מדי. היכנסו ל-console.anthropic.com ← Plans & Billing כדי להוסיף קרדיט.",
      status: 402,
    };
  }
  if (err instanceof Anthropic.APIError) {
    return { error: `שגיאה מול שירות ה-AI: ${err.message}`, status: 502 };
  }
  return null;
}
