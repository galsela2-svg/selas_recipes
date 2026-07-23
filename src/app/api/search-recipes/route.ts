import { NextResponse } from "next/server";
import { searchWeb, type WebSearchResult } from "@/lib/web-search";

// Vercel kills a serverless function at its platform default (10s on the
// Hobby plan) unless told otherwise — this route fans out to several
// external pages (each with its own multi-second fetch timeout) on top of
// the search request itself, which routinely runs past that default and
// gets cut off mid-request, surfacing as a generic "search failed" error.
export const maxDuration = 60;

import { fetchHtml, findLikelyRecipeLink, parseRecipeFromHtml } from "@/lib/recipe-scraper";
import { contradictsRequirements, extractRequirements } from "@/lib/dietary-classifier";
import type { ParsedRecipe } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

// A search hit is often a category/roundup hub page rather than a single
// recipe. Try the page itself first; if it has no Recipe data, look for the
// on-site link that best matches the query and try that instead — one hop
// deeper, the way a person would click through from a listing page.
// Different search hits (or a hub page and its own drilled-into link) can
// resolve to the same actual article — compare by host+path so "with vs
// without www" or a trailing slash don't sneak duplicates past this.
function normalizedUrlKey(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return rawUrl.toLowerCase();
  }
}

async function fetchRecipe(url: string, queryTerms: string[]): Promise<ParsedRecipe> {
  const html = await fetchHtml(url);
  const parsed = parseRecipeFromHtml(html, url);
  if (parsed) return parsed;

  const drillUrl = findLikelyRecipeLink(html, url, queryTerms);
  if (!drillUrl) throw new Error("no recipe data on page");

  const drillHtml = await fetchHtml(drillUrl);
  const drillParsed = parseRecipeFromHtml(drillHtml, drillUrl);
  if (!drillParsed) throw new Error("no recipe data on drilled-into page either");
  return drillParsed;
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
  const alreadyBiased = /מתכון|recipe/i.test(query);
  const biasedQuery = alreadyBiased
    ? query
    : `${query} ${isHebrew ? "מתכון" : "recipe"}`;

  let results: WebSearchResult[];
  try {
    results = await searchWeb(biasedQuery, 8);
  } catch {
    return NextResponse.json(
      { error: "החיפוש נכשל. נסו שוב בעוד רגע." },
      { status: 502 },
    );
  }

  if (results.length === 0) {
    return NextResponse.json({ recipes: [], links: [] });
  }

  const queryTerms = biasedQuery.split(/\s+/);
  const attempts = await Promise.allSettled(
    results.map((result) => fetchRecipe(result.url, queryTerms)),
  );

  // Explicit dietary/kosher words in the query (e.g. "חלבי") are treated as
  // hard requirements — a scraped recipe that contradicts one (a parve cake
  // showing up for a "עוגה חלבי" search) is dropped instead of returned.
  const requirements = extractRequirements(query);

  const recipes: ParsedRecipe[] = [];
  const links: WebSearchResult[] = [];
  const seenRecipeUrls = new Set<string>();
  const seenLinkUrls = new Set<string>();

  attempts.forEach((attempt, i) => {
    if (attempt.status === "fulfilled") {
      if (contradictsRequirements(attempt.value, requirements)) return;
      const key = normalizedUrlKey(attempt.value.source_url);
      if (seenRecipeUrls.has(key)) return;
      seenRecipeUrls.add(key);
      recipes.push(attempt.value);
    } else {
      const key = normalizedUrlKey(results[i].url);
      if (seenLinkUrls.has(key)) return;
      seenLinkUrls.add(key);
      links.push(results[i]);
    }
  });

  return NextResponse.json({ recipes, links });
}
