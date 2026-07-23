import { NextResponse } from "next/server";
import { searchWeb } from "@/lib/web-search";
import { extractOgTag, fetchHtml } from "@/lib/recipe-scraper";
import { createClient } from "@/lib/supabase/server";

// Fans out to several page fetches, same reasoning as search-recipes/route.ts.
export const maxDuration = 60;

export type ImageSearchResult = {
  imageUrl: string;
  title: string;
  sourceUrl: string;
};

function looksLikeImageUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

async function findCoverImage(result: { url: string; title: string }): Promise<ImageSearchResult | null> {
  const html = await fetchHtml(result.url);
  const image = extractOgTag(html, "og:image");
  if (!image || !looksLikeImageUrl(image)) return null;
  const title = extractOgTag(html, "og:title") ?? result.title;
  return { imageUrl: image, title, sourceUrl: result.url };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "יש להתחבר." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ error: "יש להזין נושא לחיפוש." }, { status: 400 });
  }

  const isHebrew = /[֐-׿]/.test(query);
  const biasedQuery = `${query} ${isHebrew ? "תמונה מתכון" : "recipe photo"}`;

  let results;
  try {
    results = await searchWeb(biasedQuery, 10);
  } catch {
    return NextResponse.json({ error: "החיפוש נכשל. נסו שוב בעוד רגע." }, { status: 502 });
  }

  const attempts = await Promise.allSettled(results.map(findCoverImage));

  const images: ImageSearchResult[] = [];
  const seen = new Set<string>();
  for (const attempt of attempts) {
    if (attempt.status !== "fulfilled" || !attempt.value) continue;
    if (seen.has(attempt.value.imageUrl)) continue;
    seen.add(attempt.value.imageUrl);
    images.push(attempt.value);
  }

  return NextResponse.json({ images });
}
