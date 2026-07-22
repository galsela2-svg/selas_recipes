import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  FetchBlockedError,
  extractOgTag,
  fetchHtml,
  findLikelyRecipeLink,
  parseRecipeFromHtml,
} from "@/lib/recipe-scraper";
import { searchWeb } from "@/lib/web-search";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { anthropicErrorResponse } from "@/lib/ai-error";

const client = new Anthropic();

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
    search_query: {
      type: "string",
      description:
        "A short web-search query (in the caption's language) that would find a similar recipe online, based on the dish name / hashtags / context — used only when found_recipe is false",
    },
  },
  required: ["found_recipe", "title", "description", "ingredients", "instructions", "search_query"],
  additionalProperties: false,
} as const;

type CaptionExtraction = {
  found_recipe: boolean;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  search_query: string;
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

async function findSimilarRecipeOnline(query: string): Promise<ParsedRecipe | null> {
  let results;
  try {
    results = await searchWeb(query, 6);
  } catch {
    return null;
  }

  const queryTerms = query.split(/\s+/);

  for (const result of results) {
    try {
      const html = await fetchHtml(result.url);
      const parsed = parseRecipeFromHtml(html, result.url);
      if (parsed) return parsed;

      // Likely a category/roundup hub page — try the on-site link that best
      // matches the query, one hop deeper, before giving up on this result.
      const drillUrl = findLikelyRecipeLink(html, result.url, queryTerms);
      if (drillUrl) {
        const drillHtml = await fetchHtml(drillUrl);
        const drillParsed = parseRecipeFromHtml(drillHtml, drillUrl);
        if (drillParsed) return drillParsed;
      }
    } catch {
      continue;
    }
  }
  return null;
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
    // Instagram often blocks non-browser requests entirely. We can still try
    // the fallback search using whatever text is in the URL, but there's
    // usually nothing usable — surface a clear error instead of guessing.
    if (err instanceof FetchBlockedError) {
      return NextResponse.json(
        {
          error:
            "אינסטגרם חוסמים גישה אוטומטית לתוכן. פתחו את הקישור, העתיקו את הכיתוב, והזינו את המתכון ידנית — או נסו את החיפוש באינטרנט.",
        },
        { status: 422 },
      );
    }
  }

  if (!caption && !igTitle) {
    return NextResponse.json(
      {
        error:
          "לא הצלחנו לקרוא את הכיתוב של הפוסט. פתחו אותו באינסטגרם והזינו את המתכון ידנית, או נסו את החיפוש באינטרנט.",
      },
      { status: 422 },
    );
  }

  let extraction: CaptionExtraction;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: CAPTION_SCHEMA },
      },
      system:
        "אתה מומחה לחילוץ מתכונים מכיתובים של רשתות חברתיות. הכיתוב עשוי להיות בעברית או באנגלית. " +
        "אם הכיתוב מכיל מתכון אמיתי (רכיבים ו/או שלבי הכנה), חלץ אותו במדויק. " +
        "אם הכיתוב לא מכיל מתכון ברור (רק תיאור/האשטגים/פרסום), החזר found_recipe=false והצע שאילתת חיפוש טובה.",
      messages: [
        {
          role: "user",
          content: `כותרת הפוסט: ${igTitle}\n\nכיתוב:\n${caption}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text content");
    extraction = JSON.parse(textBlock.text) as CaptionExtraction;
  } catch (err) {
    const anthropicError = anthropicErrorResponse(
      err,
      "פענוח מאינסטגרם דורש הגדרת משתנה הסביבה ANTHROPIC_API_KEY בשרת (ב-.env.local לפיתוח מקומי, או בהגדרות הפרויקט ב-Vercel לגרסה הפרוסה).",
    );
    if (anthropicError) {
      return NextResponse.json({ error: anthropicError.error }, { status: anthropicError.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לנתח את הכיתוב." }, { status: 502 });
  }

  if (extraction.found_recipe) {
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
    return NextResponse.json({ recipe, fallback: false });
  }

  // Fallback: the caption didn't contain a clear recipe — search the web for
  // the closest match instead of failing silently.
  const query = extraction.search_query || extraction.title || igTitle;
  const fallbackRecipe = await findSimilarRecipeOnline(query);

  if (!fallbackRecipe) {
    return NextResponse.json(
      {
        error: `לא נמצא מתכון ברור בפוסט, וגם לא הצלחנו למצוא מתכון דומה לפי "${query}". נסו להזין את המתכון ידנית.`,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ recipe: fallbackRecipe, fallback: true, fallbackQuery: query });
}
