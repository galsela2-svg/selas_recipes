import { NextResponse } from "next/server";
import { searchWeb, WebSearchFailedError } from "@/lib/web-search";
import { extractOgTag, fetchHtml } from "@/lib/recipe-scraper";
import { translateFoodQueryToEnglish } from "@/lib/translate-food-query";
import { searchOpenverseImages, type ImageSearchResult } from "@/lib/image-search";
import { createClient } from "@/lib/supabase/server";

// Vercel kills a serverless function at its platform default (10s on the
// Hobby plan) unless told otherwise — this route fans out to several page
// fetches on top of the search request itself, which can run past that.
export const maxDuration = 60;

export type { ImageSearchResult };

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

async function searchDdgRecipeSites(biasedQuery: string): Promise<ImageSearchResult[]> {
  const results = await searchWeb(biasedQuery, 10);
  const attempts = await Promise.allSettled(results.map(findCoverImage));

  const images: ImageSearchResult[] = [];
  const seen = new Set<string>();
  for (const attempt of attempts) {
    if (attempt.status !== "fulfilled" || !attempt.value) continue;
    if (seen.has(attempt.value.imageUrl)) continue;
    seen.add(attempt.value.imageUrl);
    images.push(attempt.value);
  }
  return images;
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

  // Openverse's index is tagged almost entirely in English — a Hebrew query
  // doesn't error there, it just returns weak/unrelated matches, which is
  // worse than a clean "no results" (silently wrong beats silently empty).
  // Falls back to the original query on any translation failure.
  const openverseQuery = isHebrew ? await translateFoodQueryToEnglish(query) : query;

  let openverseError: unknown = null;
  try {
    const images = await searchOpenverseImages(openverseQuery, 10);
    // Openverse answered successfully — even zero matches (common for a
    // specific/personal dish name a stock-photo library was never going to
    // have) is a legitimate, non-error outcome. Returning it as-is (instead
    // of falling through to DDG, which this deployment can't reach anyway)
    // lets the client's normal "no images found, try another term" empty
    // state handle it, rather than reporting a scary failure for something
    // that isn't actually broken.
    return NextResponse.json({ images });
  } catch (err) {
    openverseError = err;
    console.error("search-images: Openverse failed, falling back to DuckDuckGo", err);
  }

  try {
    const images = await searchDdgRecipeSites(biasedQuery);
    return NextResponse.json({ images });
  } catch (err) {
    console.error("search-images: DuckDuckGo fallback also failed", err);
    const cause = err instanceof WebSearchFailedError ? err.message : null;
    const openverseCause = openverseError instanceof Error ? openverseError.message : null;
    const detail = [openverseCause, cause].filter(Boolean).join(" / ");
    return NextResponse.json(
      { error: `החיפוש נכשל. נסו שוב בעוד רגע.${detail ? ` (${detail})` : ""}` },
      { status: 502 },
    );
  }
}
