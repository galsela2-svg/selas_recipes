import { NextResponse } from "next/server";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { gemini, GEMINI_MODEL } from "@/lib/gemini";

// See search-recipes/route.ts for why this is needed.
export const maxDuration = 60;

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
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: image } },
            { text: "חלץ את המתכון מהתמונה הזו." },
          ],
        },
      ],
      config: {
        systemInstruction:
          "אתה מומחה לחילוץ מתכונים מתמונות — עמוד מספר בישול, כרטיסיית מתכון כתובה ביד, פתק מודפס, וכו'. " +
          "התמונה עשויה להיות בעברית או באנגלית — שמור על שפת המקור בפלט. " +
          "חלץ כותרת, תיאור קצר אם יש, זמני הכנה/בישול ומספר מנות אם מצוינים, וכל רשימת המרכיבים ושלבי ההכנה במדויק כפי שהם מופיעים. " +
          "אם חלק מהשדות לא מופיעים בתמונה, החזר null או מערך ריק במקום לנחש.",
        responseMimeType: "application/json",
        responseJsonSchema: PHOTO_SCHEMA,
      },
    });

    if (!response.text) throw new Error("No text content in response");
    extraction = JSON.parse(response.text) as PhotoExtraction;
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "סריקת מתכון מתמונה דורשת הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
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
