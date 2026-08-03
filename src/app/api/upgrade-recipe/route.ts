import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { generateStructuredJson } from "@/lib/ai-generate";

// The AI rewrite of ingredients + instructions can run past Vercel's
// platform default timeout.
export const maxDuration = 60;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
    dietary_tags_add: {
      type: "array",
      items: { type: "string" },
      description: "Zero or more of the given dietary-tag options that now genuinely apply to the rewritten recipe.",
    },
    summary: {
      type: "string",
      description: "1-3 sentences in Hebrew explaining, briefly and concretely, what changed and why.",
    },
  },
  required: ["title", "description", "ingredients", "instructions", "dietary_tags_add", "summary"],
  additionalProperties: false,
} as const;

type UpgradeResult = {
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  dietary_tags_add: string[];
  summary: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recipe = body?.recipe;
  const style = typeof body?.style === "string" ? body.style.trim() : "";
  const dietaryTagOptions = Array.isArray(body?.dietaryTagOptions) ? (body.dietaryTagOptions as string[]) : [];

  if (!recipe?.title || !Array.isArray(recipe?.ingredients) || !style) {
    return NextResponse.json({ error: "נתונים חסרים." }, { status: 400 });
  }

  const recipeDescription = [
    `כותרת: ${recipe.title}`,
    recipe.description ? `תיאור: ${recipe.description}` : null,
    `מרכיבים:\n${(recipe.ingredients as string[]).map((i) => `- ${i}`).join("\n")}`,
    `הוראות הכנה:\n${(recipe.instructions as string[]).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const resultText = await generateStructuredJson({
      contents:
        `שכתבו מחדש את המתכון הבא כדי שיתאים לסגנון: "${style}".\n\n` +
        `החזירו כותרת (אפשר להוסיף בסוגריים ציון קצר של הסגנון, למשל "(ללא גלוטן)"), תיאור, ` +
        `רשימת מרכיבים מלאה מחדש (עם כמויות), ורשימת הוראות הכנה מלאה מחדש — לא הבדלים, ` +
        `אלא את כל המתכון המלא כפי שהוא אמור להיראות אחרי השינוי. ` +
        `אם רלוונטי, ציינו גם באילו מהתגיות הבאות (אם בכלל) המתכון עומד עכשיו: ` +
        `${dietaryTagOptions.join(", ")}.\n\n` +
        `המתכון המקורי:\n\n${recipeDescription}`,
      systemInstruction:
        "אתה שף מומחה המתמחה בהתאמת מתכונים לסגנונות/הגבלות תזונתיות שונות (בריאות יותר, ללא גלוטן, " +
        "טבעוני, צמחוני, דל פחמימות וכו') — שינוי אמיתי של המרכיבים וההוראות, לא רק הצעות. שמרו על " +
        "האופי והטעם הכללי של המנה ככל האפשר. ענו בעברית בלבד.",
      schema: RESPONSE_SCHEMA,
    });
    const parsed = JSON.parse(resultText) as UpgradeResult;
    return NextResponse.json(parsed);
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "שיפור מתכון עם AI דורש הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "משהו השתבש. נסו שוב." }, { status: 500 });
  }
}
