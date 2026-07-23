import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { gemini, GEMINI_MODEL } from "@/lib/gemini";
import { DIETARY_TAG_OPTIONS } from "@/lib/types";

export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  properties: {
    tags: {
      type: "array",
      items: { type: "string", enum: DIETARY_TAG_OPTIONS },
    },
  },
  required: ["tags"],
  additionalProperties: false,
} as const;

type SuggestionResult = { tags: string[] };

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
  const description = typeof body?.description === "string" ? body.description : "";
  const ingredients = Array.isArray(body?.ingredients) ? (body.ingredients as string[]) : [];
  const instructions = Array.isArray(body?.instructions) ? (body.instructions as string[]) : [];

  if (!title && ingredients.length === 0) {
    return NextResponse.json({ error: "אין מספיק מידע במתכון כדי להציע תגיות." }, { status: 400 });
  }

  const recipeDescription = [
    `כותרת: ${title}`,
    description ? `תיאור: ${description}` : null,
    ingredients.length ? `מרכיבים:\n${ingredients.map((i) => `- ${i}`).join("\n")}` : null,
    instructions.length ? `הוראות הכנה:\n${instructions.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: `הצע תגיות מתאימות למתכון הבא:\n\n${recipeDescription}`,
      config: {
        systemInstruction:
          "אתה מומחה לסיווג מתכונים. בהינתן מתכון, בחר אילו תגיות מתוך הרשימה הסגורה שסופקה לך " +
          "(בשדה tags, שהוא enum) מתאימות לו — לפי כשרות (בשרי/חלבי/פרווה, על סמך המרכיבים), סוג ארוחה, " +
          "שיטת הכנה, רמת חריפות, מגבלות תזונתיות (למשל טבעוני/צמחוני/ללא גלוטן — רק אם ברור מהמרכיבים), " +
          "והזדמנות אם רלוונטי. בחר רק תגיות שאתה בטוח בהן על סמך התוכן בפועל — עדיף פחות תגיות נכונות " +
          "מהרבה תגיות מנחשות. אל תבחר תגיות גיל תינוקות אלא אם המתכון מפורש מיועד לתינוקות.",
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
      },
    });

    if (!response.text) throw new Error("No text content in response");
    const result = JSON.parse(response.text) as SuggestionResult;

    // Defense in depth in case the model returns something outside the enum.
    const validTags = new Set(DIETARY_TAG_OPTIONS);
    const tags = result.tags.filter((t) => validTags.has(t));

    return NextResponse.json({ tags });
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "הצעת תגיות אוטומטית דורשת הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו להציע תגיות." }, { status: 502 });
  }
}
