import { NextResponse } from "next/server";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { generateStructuredJsonFromImage } from "@/lib/ai-generate";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const PHOTO_SCHEMA = {
  type: "object",
  properties: {
    found_recipe: {
      type: "boolean",
      description: "true only if the photo shows a real, readable recipe (title + ingredients or steps)",
    },
    title: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    prep_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    cook_time_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
    servings: { anyOf: [{ type: "integer" }, { type: "null" }] },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
  },
  required: [
    "found_recipe",
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
  found_recipe: boolean;
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
  const imageBase64 = typeof body?.image === "string" ? body.image : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";

  if (!imageBase64 || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "יש לצלם או לבחור תמונה תקינה." }, { status: 400 });
  }
  // Base64 is ~4/3 the size of the raw bytes.
  if (imageBase64.length > (MAX_IMAGE_BYTES * 4) / 3) {
    return NextResponse.json({ error: "התמונה גדולה מדי." }, { status: 400 });
  }

  let extraction: PhotoExtraction;
  try {
    const resultText = await generateStructuredJsonFromImage({
      prompt: "חלץ את המתכון מהתמונה הזו (עמוד מספר בישול, כרטיסיית מתכון כתובה ביד, או צילום מסך).",
      systemInstruction:
        "אתה מומחה לחילוץ מתכונים מתמונות — עמוד מספר בישול, כרטיסיית מתכון כתובה ביד, או צילום מסך. " +
        "הטקסט בתמונה עשוי להיות בעברית או באנגלית. אם התמונה מכילה מתכון קריא (כותרת ורכיבים ו/או שלבי הכנה), " +
        "חלץ אותו במדויק כפי שהוא כתוב — אל תמציא מידע שלא מופיע בתמונה. אם שדה לא מוזכר, החזר null או מערך ריק. " +
        "אם התמונה לא מכילה מתכון קריא, החזר found_recipe=false.",
      schema: PHOTO_SCHEMA,
      imageBase64,
      mimeType,
    });
    extraction = JSON.parse(resultText) as PhotoExtraction;
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "פענוח מתכון מתמונה דורש הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לנתח את התמונה." }, { status: 502 });
  }

  if (!extraction.found_recipe) {
    return NextResponse.json(
      {
        error:
          "לא הצלחנו לזהות מתכון קריא בתמונה. נסו תמונה ברורה וחדה יותר, או הזינו את המתכון ידנית.",
      },
      { status: 422 },
    );
  }

  const recipe: ParsedRecipe = {
    title: extraction.title || "מתכון מתמונה",
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
