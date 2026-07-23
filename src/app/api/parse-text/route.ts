import { NextResponse } from "next/server";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { generateStructuredJson } from "@/lib/ai-generate";
import { findCoverImageForTitle } from "@/lib/find-cover-image";

// See search-recipes/route.ts for why this is needed.
export const maxDuration = 60;

const TEXT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    prep_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    cook_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    servings: { anyOf: [{ type: "integer" }, { type: "null" }] },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "description",
    "prep_time_minutes",
    "cook_time_minutes",
    "servings",
    "ingredients",
    "instructions",
  ],
  additionalProperties: false,
} as const;

type TextExtraction = {
  title: string;
  description: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
};

const MAX_TEXT_LENGTH = 20_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "יש להדביק או להקליד מתכון." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "הטקסט ארוך מדי." }, { status: 400 });
  }

  let extraction: TextExtraction;
  try {
    const resultText = await generateStructuredJson({
      contents: `ארגן את המתכון הבא:\n\n${text}`,
      systemInstruction:
        "אתה מומחה לארגון מתכונים. תקבל טקסט חופשי של מתכון (שהודבק מהודעה, מסמך, וואטסאפ וכו׳), שעשוי להיות לא מסודר, " +
        "בעברית או באנגלית. ארגן אותו לפורמט מובנה: כותרת, תיאור קצר אם רלוונטי, זמני הכנה/בישול ומספר מנות אם מוזכרים, " +
        "ורשימות נפרדות ומסודרות של מרכיבים ושלבי הכנה — בסדר ההגיוני, גם אם בטקסט המקורי הם לא היו ברורים. " +
        "שמור על שפת המקור. אל תמציא מידע שלא מופיע בטקסט — אם שדה לא מוזכר, החזר null או מערך ריק.",
      schema: TEXT_SCHEMA,
    });
    extraction = JSON.parse(resultText) as TextExtraction;
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "ארגון מתכון מטקסט דורש הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לנתח את הטקסט." }, { status: 502 });
  }

  if (!extraction.title && extraction.ingredients.length === 0 && extraction.instructions.length === 0) {
    return NextResponse.json(
      {
        error: "לא הצלחנו לזהות מתכון בטקסט הזה. נסו להדביק טקסט מלא יותר, או הזינו את המתכון ידנית.",
      },
      { status: 422 },
    );
  }

  const title = extraction.title || "מתכון מטקסט";

  const recipe: ParsedRecipe = {
    title,
    description: extraction.description,
    image_url: await findCoverImageForTitle(title, supabase),
    source_url: "",
    prep_time_minutes: extraction.prep_time_minutes,
    cook_time_minutes: extraction.cook_time_minutes,
    servings: extraction.servings,
    ingredients: extraction.ingredients,
    instructions: extraction.instructions,
  };

  return NextResponse.json(recipe);
}
