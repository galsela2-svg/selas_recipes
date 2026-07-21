import { NextResponse } from "next/server";
import { searchWeb, type WebSearchResult } from "@/lib/web-search";
import { fetchHtml, parseRecipeFromHtml } from "@/lib/recipe-scraper";
import type { ParsedRecipe } from "@/lib/types";

export async function GET(request: Request) {
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
    results = await searchWeb(biasedQuery, 6);
  } catch {
    return NextResponse.json(
      { error: "החיפוש נכשל. נסו שוב בעוד רגע." },
      { status: 502 },
    );
  }

  if (results.length === 0) {
    return NextResponse.json({ recipes: [], links: [] });
  }

  const attempts = await Promise.allSettled(
    results.map(async (result) => {
      const html = await fetchHtml(result.url);
      const parsed = parseRecipeFromHtml(html, result.url);
      if (!parsed) throw new Error("no recipe data on page");
      return parsed;
    }),
  );

  const recipes: ParsedRecipe[] = [];
  const links: WebSearchResult[] = [];

  attempts.forEach((attempt, i) => {
    if (attempt.status === "fulfilled") {
      recipes.push(attempt.value);
    } else {
      links.push(results[i]);
    }
  });

  return NextResponse.json({ recipes, links });
}
