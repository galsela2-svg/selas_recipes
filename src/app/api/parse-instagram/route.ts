import { NextResponse } from "next/server";
import { FetchBlockedError, extractOgTag, fetchHtml } from "@/lib/recipe-scraper";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { geminiErrorResponse } from "@/lib/ai-error";
import { generateStructuredJson } from "@/lib/ai-generate";

// The Instagram fetch + AI extraction call together can run past Vercel's
// platform default timeout.
export const maxDuration = 60;

const CAPTION_SCHEMA = {
  type: "object",
  properties: {
    found_recipe: {
      type: "boolean",
      description: "true only if the caption contains a real, usable recipe (title + ingredients or steps)",
    },
    title: { type: "string" },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    ingredients: { type: "array", items: { type: "string" } },
    instructions: { type: "array", items: { type: "string" } },
  },
  required: ["found_recipe", "title", "description", "ingredients", "instructions"],
  additionalProperties: false,
} as const;

type CaptionExtraction = {
  found_recipe: boolean;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
};

function isInstagramUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return /(^|\.)instagram\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

// A real post photo is served from a per-post "scontent" CDN subdomain.
// When Instagram detects a non-logged-in scraper, it serves a generic
// login-wall/promo graphic instead — from a different, generic host — which
// would otherwise get saved as the recipe's cover photo.
function isRealInstagramPostImage(raw: string): boolean {
  try {
    const host = new URL(raw).hostname;
    return /^scontent[.-]/.test(host) && /(cdninstagram\.com|fbcdn\.net)$/.test(host);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url || !isInstagramUrl(url)) {
    return NextResponse.json({ error: "יש להזין קישור אינסטגרם תקין." }, { status: 400 });
  }

  let caption = "";
  let igTitle = "";
  let image: string | null = null;

  try {
    const html = await fetchHtml(url);
    caption = extractOgTag(html, "og:description") ?? "";
    igTitle = extractOgTag(html, "og:title") ?? "";
    const ogImage = extractOgTag(html, "og:image");
    image = ogImage && isRealInstagramPostImage(ogImage) ? ogImage : null;
  } catch (err) {
    // Instagram often blocks non-browser requests entirely.
    if (err instanceof FetchBlockedError) {
      return NextResponse.json(
        {
          error:
            "אינסטגרם חוסמים גישה אוטומטית לתוכן. פתחו את הקישור, העתיקו את הכיתוב, והדביקו אותו בטאב \"טקסט\".",
        },
        { status: 422 },
      );
    }
  }

  if (!caption && !igTitle) {
    return NextResponse.json(
      {
        error:
          "לא הצלחנו לקרוא את הכיתוב של הפוסט. פתחו אותו באינסטגרם, העתיקו את הכיתוב, והדביקו אותו בטאב \"טקסט\".",
      },
      { status: 422 },
    );
  }

  let extraction: CaptionExtraction;
  try {
    const resultText = await generateStructuredJson({
      contents: `כותרת הפוסט: ${igTitle}\n\nכיתוב:\n${caption}`,
      systemInstruction:
        "אתה מומחה לחילוץ מתכונים מכיתובים של רשתות חברתיות. הכיתוב עשוי להיות בעברית או באנגלית. " +
        "אם הכיתוב מכיל מתכון אמיתי (רכיבים ו/או שלבי הכנה), חלץ אותו במדויק. " +
        "אם הכיתוב לא מכיל מתכון ברור (רק תיאור/האשטגים/פרסום), החזר found_recipe=false.",
      schema: CAPTION_SCHEMA,
    });
    extraction = JSON.parse(resultText) as CaptionExtraction;
  } catch (err) {
    const geminiError = geminiErrorResponse(
      err,
      "פענוח מאינסטגרם דורש הגדרת משתנה הסביבה GEMINI_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (geminiError) {
      return NextResponse.json({ error: geminiError.error }, { status: geminiError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לנתח את הכיתוב." }, { status: 502 });
  }

  if (!extraction.found_recipe) {
    return NextResponse.json(
      {
        error:
          "לא נמצא מתכון ברור בכיתוב של הפוסט. פתחו אותו באינסטגרם, העתיקו את הכיתוב, והדביקו אותו בטאב \"טקסט\" — או הזינו את המתכון ידנית.",
      },
      { status: 422 },
    );
  }

  const recipe: ParsedRecipe = {
    title: extraction.title || igTitle || "מתכון מאינסטגרם",
    description: extraction.description,
    image_url: image,
    source_url: url,
    prep_time_minutes: null,
    cook_time_minutes: null,
    servings: null,
    ingredients: extraction.ingredients,
    instructions: extraction.instructions,
  };
  return NextResponse.json({ recipe });
}
