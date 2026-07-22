import { NextResponse } from "next/server";
import {
  FetchBlockedError,
  FetchFailedError,
  SsrfBlockedError,
  extractOgTag,
  fetchHtml,
  findLikelyRecipeLink,
  parseRecipeFromHtml,
} from "@/lib/recipe-scraper";
import { createClient } from "@/lib/supabase/server";

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
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
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

  if (!rawUrl) {
    return NextResponse.json({ error: "יש להזין כתובת URL." }, { status: 400 });
  }

  const url = parseUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "כתובת ה-URL אינה תקינה." }, { status: 400 });
  }

  let html: string;
  try {
    html = await fetchHtml(url.toString());
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return NextResponse.json({ error: "כתובת ה-URL אינה נתמכת." }, { status: 400 });
    }
    if (err instanceof FetchBlockedError) {
      return NextResponse.json(
        {
          error:
            "האתר הזה חוסם גישה אוטומטית לתוכן שלו. פתחו את הקישור בדפדפן והזינו את המתכון ידנית.",
        },
        { status: 422 },
      );
    }
    if (err instanceof FetchFailedError) {
      return NextResponse.json(
        { error: `הדף החזיר סטטוס ${err.status}.` },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "לא הצלחנו להגיע לכתובת הזו. בדקו את הקישור ונסו שוב." },
      { status: 502 },
    );
  }

  let recipe = parseRecipeFromHtml(html, url.toString());

  // This page might be a category/roundup hub rather than a single recipe —
  // try the on-site link that best matches the hub page's own title before
  // giving up, the way a person would click through to an actual recipe.
  if (!recipe) {
    const hubTitle = extractOgTag(html, "og:title");
    const drillUrl = hubTitle
      ? findLikelyRecipeLink(html, url.toString(), hubTitle.split(/\s+/))
      : null;

    if (drillUrl) {
      try {
        const drillHtml = await fetchHtml(drillUrl);
        recipe = parseRecipeFromHtml(drillHtml, drillUrl);
      } catch {
        // Fall through to the "no recipe data" error below.
      }
    }
  }

  if (!recipe) {
    return NextResponse.json(
      {
        error:
          "לא נמצאו נתוני מתכון בדף הזה. נסו קישור אחר או הזינו את המתכון ידנית.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json(recipe);
}
