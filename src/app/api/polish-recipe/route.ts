import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { generateStructuredJson } from "@/lib/ai-generate";

export const maxDuration = 60;

const DESCRIPTION_SCHEMA = {
  type: "object",
  properties: { description: { type: "string" } },
  required: ["description"],
  additionalProperties: false,
} as const;

const INSTRUCTIONS_SCHEMA = {
  type: "object",
  properties: {
    instructions: { type: "array", items: { type: "string" } },
    prep_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    cook_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
  },
  required: ["instructions", "prep_time_minutes", "cook_time_minutes"],
  additionalProperties: false,
} as const;

type DescriptionResult = { description: string };
type InstructionsResult = {
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
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
  const field = body?.field === "description" || body?.field === "instructions" ? body.field : null;
  const title = typeof body?.title === "string" ? body.title : "";
  const ingredients = Array.isArray(body?.ingredients) ? (body.ingredients as string[]) : [];

  if (!field) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  try {
    if (field === "description") {
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!text) return NextResponse.json({ error: "אין תיאור לשפר." }, { status: 400 });

      const resultText = await generateStructuredJson({
        contents: `כותרת: ${title}\n\nתיאור נוכחי:\n${text}`,
        systemInstruction:
          "שכתוב את התיאור הבא לתיאור מקצועי, פרקטי וקצר (1-2 משפטים) של המנה עצמה — " +
          "בלי סיפורים אישיים, בלי דיבורים לא רלוונטיים, רק מה שעוזר למי שקורא להבין מה זו המנה. " +
          "שמור על שפת המקור.",
        schema: DESCRIPTION_SCHEMA,
      });
      const result = JSON.parse(resultText) as DescriptionResult;
      return NextResponse.json(result);
    }

    const instructions = Array.isArray(body?.instructions) ? (body.instructions as string[]) : [];
    if (instructions.length === 0) {
      return NextResponse.json({ error: "אין הוראות הכנה לשפר." }, { status: 400 });
    }

    const resultText = await generateStructuredJson({
      contents:
        `כותרת: ${title}\n\n` +
        (ingredients.length ? `מרכיבים:\n${ingredients.map((i) => `- ${i}`).join("\n")}\n\n` : "") +
        `הוראות הכנה נוכחיות:\n${instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      systemInstruction:
        "שכתוב את הוראות ההכנה לרשימת שלבים מקצועית, פרקטית וברורה — נטו מה צריך לעשות, שלב אחרי שלב. " +
        "הסר סיפורים אישיים, אנקדוטות, הקדמות ('אז ככה חברים...'), ותוספות שאינן פעולות הכנה בפועל. " +
        "שמור על כל הפעולות והפרטים החשובים (טמפרטורות, זמנים, כמויות) בדיוק כפי שהם. שמור על שפת המקור. " +
        "בנוסף, על סמך ההוראות והמרכיבים, העריך זמן הכנה (עבודה בפועל, לפני הכנסה לתנור/בישול) וזמן בישול/אפייה " +
        "בדקות — אם אי אפשר להעריך בסבירות, החזר null.",
      schema: INSTRUCTIONS_SCHEMA,
    });
    const result = JSON.parse(resultText) as InstructionsResult;
    return NextResponse.json(result);
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "שיפור טקסט דורש הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לשפר את הטקסט." }, { status: 502 });
  }
}
