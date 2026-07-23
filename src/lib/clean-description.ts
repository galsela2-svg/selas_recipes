import { generateStructuredJson } from "@/lib/ai-generate";

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
 * to the original text on any failure (missing/invalid key, both providers
 * down, etc.) so plain link import keeps working without a configured API
 * key. */
export async function cleanRecipeDescription(
  title: string,
  rawDescription: string,
): Promise<string> {
  try {
    const resultText = await generateStructuredJson({
      contents: `כותרת המתכון: ${title}\n\nטקסט תיאור גולמי (מהאתר):\n${rawDescription}`,
      systemInstruction:
        "תקבל כותרת מתכון וטקסט תיאור גולמי שנשלף מדף אינטרנט — הוא עשוי לכלול דיבורים לא רלוונטיים " +
        "(פרסום, קריאה להצטרף לניוזלטר, האשטגים, ניווט אתר וכו'). כתוב מחדש תיאור קצר ופרקטי (1-2 משפטים) " +
        "של המנה עצמה בלבד — רק את מה שבאמת רלוונטי למתכון, בלי כל התוספות. שמור על שפת המקור. " +
        "אם אין בטקסט שום תוכן רלוונטי למתכון, החזר null.",
      schema: SCHEMA,
    });

    const parsed = JSON.parse(resultText) as { description: string | null };
    return parsed.description?.trim() || rawDescription;
  } catch {
    return rawDescription;
  }
}
