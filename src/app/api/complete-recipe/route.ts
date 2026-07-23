import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { generateStructuredJson } from "@/lib/ai-generate";

export const maxDuration = 60;

const DIFFICULTY_OPTIONS = ["קל להכנה", "רמת קושי בינונית", "מתכון מאתגר"] as const;

const COMPLETE_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    instructions: { type: "array", items: { type: "string" } },
    prep_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    cook_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    difficulty: { type: "string", enum: DIFFICULTY_OPTIONS },
  },
  required: ["description", "instructions", "prep_time_minutes", "cook_time_minutes", "difficulty"],
  additionalProperties: false,
} as const;

type CompleteResult = {
  description: string;
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  difficulty: (typeof DIFFICULTY_OPTIONS)[number];
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
  const title = typeof body?.title === "string" ? body.title : "";
  const ingredients = Array.isArray(body?.ingredients) ? (body.ingredients as string[]) : [];
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const instructions = Array.isArray(body?.instructions) ? (body.instructions as string[]) : [];

  const hasDescription = description.length > 0;
  const hasInstructions = instructions.length > 0;
  if (!title.trim() || hasDescription === hasInstructions) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  try {
    const resultText = await generateStructuredJson({
      contents:
        `כותרת: ${title}\n\n` +
        (ingredients.length ? `מרכיבים:\n${ingredients.map((i) => `- ${i}`).join("\n")}\n\n` : "") +
        (hasDescription
          ? `תיאור קיים (מקור המידע היחיד שיש):\n${description}`
          : `הוראות הכנה קיימות (מקור המידע היחיד שיש):\n${instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`),
      systemInstruction:
        (hasDescription
          ? "יש לך רק תיאור של מנה, בלי הוראות הכנה. פרק את התיאור למרכיביו והפק ממנו רשימת שלבי הכנה " +
            "ברורה ומעשית (על סמך המרכיבים, אם סופקו) — אם התיאור לא כולל הוראות הכנה בפועל, הרכב שלבי הכנה " +
            "סבירים ומקובלים למנה הזו. גם כתוב תיאור קצר (1-2 משפטים) מבוסס על התיאור הקיים, מקצועי ופרקטי."
          : "יש לך רק הוראות הכנה, בלי תיאור. כתוב תיאור קצר (1-2 משפטים) של המנה עצמה על סמך הכותרת, " +
            "המרכיבים וההוראות — מקצועי ופרקטי, בלי דיבורים לא רלוונטיים. גם החזר את הוראות ההכנה בחזרה " +
            "כרשימת שלבים ברורה (אפשר לנסח מחדש לבהירות, אבל לשמור על כל הפעולות והפרטים).") +
        " בנוסף, על סמך כל המידע הזמין, העריך זמן הכנה וזמן בישול/אפייה בדקות (null אם אי אפשר להעריך), " +
        "וקבע רמת קושי אחת מתוך: קל להכנה / רמת קושי בינונית / מתכון מאתגר. שמור על שפת המקור.",
      schema: COMPLETE_SCHEMA,
    });
    const result = JSON.parse(resultText) as CompleteResult;
    return NextResponse.json(result);
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "השלמה אוטומטית דורשת הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו להשלים את המתכון." }, { status: 502 });
  }
}
