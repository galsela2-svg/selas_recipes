import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { anthropicErrorResponse } from "@/lib/ai-error";

const client = new Anthropic();

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
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: TEXT_SCHEMA },
      },
      system:
        "אתה מומחה לארגון מתכונים. תקבל טקסט חופשי של מתכון (שהודבק מהודעה, מסמך, וואטסאפ וכו׳), שעשוי להיות לא מסודר, " +
        "בעברית או באנגלית. ארגן אותו לפורמט מובנה: כותרת, תיאור קצר אם רלוונטי, זמני הכנה/בישול ומספר מנות אם מוזכרים, " +
        "ורשימות נפרדות ומסודרות של מרכיבים ושלבי הכנה — בסדר ההגיוני, גם אם בטקסט המקורי הם לא היו ברורים. " +
        "שמור על שפת המקור. אל תמציא מידע שלא מופיע בטקסט — אם שדה לא מוזכר, החזר null או מערך ריק.",
      messages: [
        {
          role: "user",
          content: `ארגן את המתכון הבא:\n\n${text}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text content");
    extraction = JSON.parse(textBlock.text) as TextExtraction;
  } catch (err) {
    const anthropicError = anthropicErrorResponse(
      err,
      "ארגון מתכון מטקסט דורש הגדרת משתנה הסביבה ANTHROPIC_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (anthropicError) {
      return NextResponse.json({ error: anthropicError.error }, { status: anthropicError.status });
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

  const recipe: ParsedRecipe = {
    title: extraction.title || "מתכון מטקסט",
    description: extraction.description,
    image_url: null,
    source_url: "",
    prep_time_minutes: extraction.prep_time_minutes,
    cook_time_minutes: extraction.cook_time_minutes,
    servings: extraction.servings,
    ingredients: extraction.ingredients,
    instructions: extraction.instructions,
  };

  return NextResponse.json(recipe);
}
