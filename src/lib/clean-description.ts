import { gemini, GEMINI_MODEL } from "@/lib/gemini";

const SCHEMA = {
  type: "object",
  properties: {
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: ["description"],
  additionalProperties: false,
} as const;

/** Rewrites a scraped recipe description — often raw page metadata full of
 * marketing text, newsletter pitches, hashtags, or site navigation — into a
 * short, practical 1-2 sentence description of the dish itself. Falls back
 * to the original text on any failure (missing/invalid key, quota, etc.)
 * so plain link import keeps working without a configured API key. */
export async function cleanRecipeDescription(
  title: string,
  rawDescription: string,
): Promise<string> {
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: `כותרת המתכון: ${title}\n\nטקסט תיאור גולמי (מהאתר):\n${rawDescription}`,
      config: {
        systemInstruction:
          "תקבל כותרת מתכון וטקסט תיאור גולמי שנשלף מדף אינטרנט — הוא עשוי לכלול דיבורים לא רלוונטיים " +
          "(פרסום, קריאה להצטרף לניוזלטר, האשטגים, ניווט אתר וכו'). כתוב מחדש תיאור קצר ופרקטי (1-2 משפטים) " +
          "של המנה עצמה בלבד — רק את מה שבאמת רלוונטי למתכון, בלי כל התוספות. שמור על שפת המקור. " +
          "אם אין בטקסט שום תוכן רלוונטי למתכון, החזר null.",
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
      },
    });

    if (!response.text) return rawDescription;
    const parsed = JSON.parse(response.text) as { description: string | null };
    return parsed.description?.trim() || rawDescription;
  } catch {
    return rawDescription;
  }
}
