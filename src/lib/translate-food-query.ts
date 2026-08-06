import { generateStructuredJson } from "@/lib/ai-generate";

const SCHEMA = {
  type: "object",
  properties: {
    query: { type: "string" },
  },
  required: ["query"],
  additionalProperties: false,
} as const;

/**
 * Translates a (typically Hebrew) dish name into a short English food term
 * for image search. Stock/CC-licensed image libraries like Openverse are
 * tagged almost entirely in English — searching them with the Hebrew
 * original returns weak or unrelated matches rather than a clean "no
 * results", so this runs first rather than being a fallback. On any
 * failure (missing/invalid GEMINI_API_KEY, quota, etc.) it falls back to
 * the original query unchanged, so image search still runs — it just
 * won't be as accurate for non-English input.
 */
export async function translateFoodQueryToEnglish(query: string): Promise<string> {
  try {
    const resultText = await generateStructuredJson({
      contents: query,
      systemInstruction:
        "אתה עוזר לחיפוש תמונות אוכל. תקבל שם של מנה או מתכון, לרוב בעברית. " +
        "החזר מונח חיפוש קצר באנגלית (2-4 מילים) שמתאר את המנה עצמה, מתאים לחיפוש תמונות מלאי (stock photo) — " +
        "למשל 'שקשוקה' -> 'shakshuka', 'עוגת שוקולד' -> 'chocolate cake', 'מרק עדשים' -> 'lentil soup'. " +
        "אם הכותרת מכילה תוספות אישיות (כמו שם אדם, 'של סבתא' וכו'), התעלם מהן והתמקד רק בסוג המנה. " +
        "אם הטקסט כבר באנגלית, החזר אותו כפי שהוא (בניקוי קל אם צריך).",
      schema: SCHEMA,
    });
    const parsed = JSON.parse(resultText) as { query: string };
    return parsed.query?.trim() || query;
  } catch {
    return query;
  }
}
