import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { anthropicErrorResponse } from "@/lib/ai-error";

const client = new Anthropic();

const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const PHOTO_SCHEMA = {
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

type PhotoExtraction = {
  title: string;
  description: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
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
  const image = typeof body?.image === "string" ? body.image : "";
  const mediaType = typeof body?.media_type === "string" ? body.media_type : "";

  if (!image || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json(
      { error: "יש לצלם או להעלות תמונה תקינה (JPEG, PNG, WebP או GIF)." },
      { status: 400 },
    );
  }

  let extraction: PhotoExtraction;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: PHOTO_SCHEMA },
      },
      system:
        "אתה מומחה לחילוץ מתכונים מתמונות — עמוד מספר בישול, כרטיסיית מתכון כתובה ביד, פתק מודפס, וכו'. " +
        "התמונה עשויה להיות בעברית או באנגלית — שמור על שפת המקור בפלט. " +
        "חלץ כותרת, תיאור קצר אם יש, זמני הכנה/בישול ומספר מנות אם מצוינים, וכל רשימת המרכיבים ושלבי ההכנה במדויק כפי שהם מופיעים. " +
        "אם חלק מהשדות לא מופיעים בתמונה, החזר null או מערך ריק במקום לנחש.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg", data: image },
            },
            { type: "text", text: "חלץ את המתכון מהתמונה הזו." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text content");
    extraction = JSON.parse(textBlock.text) as PhotoExtraction;
  } catch (err) {
    const anthropicError = anthropicErrorResponse(
      err,
      "סריקת מתכון מתמונה דורשת הגדרת משתנה הסביבה ANTHROPIC_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (anthropicError) {
      return NextResponse.json({ error: anthropicError.error }, { status: anthropicError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לנתח את התמונה." }, { status: 502 });
  }

  if (!extraction.title && extraction.ingredients.length === 0 && extraction.instructions.length === 0) {
    return NextResponse.json(
      {
        error: "לא הצלחנו לזהות מתכון בתמונה. נסו תמונה ברורה וחדה יותר, או הזינו את המתכון ידנית.",
      },
      { status: 422 },
    );
  }

  const recipe: ParsedRecipe = {
    title: extraction.title || "מתכון סרוק",
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
